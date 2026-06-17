import type { AppGraph, AppGraphNode, AppVariable, WorkflowRunNode } from '#models/app'
import AppRepository, { type CreateAppPayload, type UpdateAppPayload } from '#repositories/app_repository'
import WorkflowRepository from '#repositories/workflow_repository'
import { Exception } from '@adonisjs/core/exceptions'

export default class AppService {
  constructor(
    private repository = new AppRepository(),
    private workflowRepository = new WorkflowRepository()
  ) {}

  async list() {
    return this.repository.list()
  }

  async create(payload: CreateAppPayload) {
    const normalizedPayload = this.normalizePayload(payload)
    if (normalizedPayload.graph) {
      normalizedPayload.graph = normalizeGraph(normalizedPayload.graph, normalizedPayload.variables ?? [])
    }
    await this.validatePayload(normalizedPayload)
    return this.repository.create(normalizedPayload)
  }

  async show(id: number) {
    return this.repository.findOrFail(id)
  }

  async update(id: number, payload: UpdateAppPayload) {
    const app = await this.repository.findOrFail(id)
    const normalizedPayload = this.normalizePayload(payload)
    const nextPayload = {
      name: normalizedPayload.name ?? app.name,
      description: normalizedPayload.description ?? app.description,
      status: normalizedPayload.status ?? app.status,
      variables: normalizedPayload.variables ?? app.variables,
      graph: normalizeGraph(normalizedPayload.graph ?? app.graph, normalizedPayload.variables ?? app.variables),
    }
    await this.validatePayload(nextPayload)
    return this.repository.update(app, { ...normalizedPayload, graph: nextPayload.graph })
  }

  async delete(id: number) {
    const app = await this.repository.findOrFail(id)
    await this.repository.delete(app)
  }

  private normalizePayload<T extends CreateAppPayload | UpdateAppPayload>(payload: T): T {
    return {
      ...payload,
      name: payload.name?.trim(),
      description: payload.description?.trim() || null,
      variables: payload.variables?.map((variable) => ({
        ...variable,
        key: normalizeKey(variable.key || variable.name),
        name: normalizeKey(variable.name || variable.key),
      })),
    }
  }

  private async validatePayload(payload: CreateAppPayload | UpdateAppPayload) {
    if (!payload.name) {
      throw invalidApp('应用名称不能为空')
    }

    const variables = payload.variables ?? []
    this.validateVariables(variables)
    if (payload.graph) await this.validateGraph(payload.graph, variables)
  }

  private validateVariables(variables: AppVariable[]) {
    const keys = new Set<string>()
    let batchImageVariableCount = 0
    for (const variable of variables) {
      if (!variable.key || !variable.name || !variable.type) {
        throw invalidApp('应用变量的标识、名称和类型不能为空')
      }
      if (!['user_input', 'computed'].includes(variable.source)) {
        throw invalidApp(`应用变量 ${variable.name} 的来源无效`)
      }
      if (variable.batch) {
        if (variable.source !== 'user_input' || variable.type !== 'IMAGE') {
          throw invalidApp('只有图片用户输入变量可以开启批量')
        }
        batchImageVariableCount += 1
      }
      if (keys.has(variable.key)) throw invalidApp(`应用变量 $${variable.key} 重复`)
      keys.add(variable.key)
    }
    if (batchImageVariableCount > 1) throw invalidApp('最多只能有一个批量图片输入变量')
  }

  private async validateGraph(graph: AppGraph, variables: AppVariable[]) {
    const nodes = graph.nodes ?? []
    const edges = graph.edges ?? []
    const nodeIds = new Set(nodes.map((node) => node.id))
    const variableKeys = new Set(variables.map((variable) => variable.key))

    if (nodes.filter((node) => node.type === 'input_collect').length !== 1) {
      throw invalidApp('应用必须有且仅有一个变量定义节点')
    }

    for (const edge of edges) {
      if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
        throw invalidApp('流程连线引用了不存在的节点')
      }
      if (edge.source === edge.target) throw invalidApp('流程节点不能连接到自身')
    }

    this.ensureAcyclic(nodes, edges)
    this.ensureEndpointRules(nodes, edges)
    await this.validateNodeData(nodes, variableKeys, variables, edges)
  }

  private ensureEndpointRules(nodes: AppGraphNode[], edges: AppGraph['edges']) {
    const inputNode = nodes.find((node) => node.type === 'input_collect')!
    if (edges.some((edge) => edge.target === inputNode.id)) {
      throw invalidApp('变量定义节点不能有入边')
    }
  }

  private ensureAcyclic(nodes: AppGraphNode[], edges: AppGraph['edges']) {
    const indegree = new Map(nodes.map((node) => [node.id, 0]))
    const outgoing = new Map<string, string[]>()
    for (const edge of edges) {
      indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1)
      outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge.target])
    }

    const queue = [...indegree.entries()].filter(([, degree]) => degree === 0).map(([id]) => id)
    let visited = 0
    while (queue.length > 0) {
      const id = queue.shift()!
      visited += 1
      for (const target of outgoing.get(id) ?? []) {
        const nextDegree = (indegree.get(target) ?? 0) - 1
        indegree.set(target, nextDegree)
        if (nextDegree === 0) queue.push(target)
      }
    }

    if (visited !== nodes.length) throw invalidApp('应用编排不能存在环形依赖')
  }

  private async validateNodeData(
    nodes: AppGraphNode[],
    variableKeys: Set<string>,
    variables: AppVariable[],
    edges: AppGraph['edges']
  ) {
    const readableVariables = await this.buildReadableVariablesByNode(nodes, variables, edges)

    for (const node of nodes) {
      if (node.type === 'manual_gate') {
        for (const varKey of node.data.displayVars ?? []) {
          if (!variableKeys.has(varKey)) throw invalidApp(`节点 ${node.id} 引用了不存在的应用变量`)
          if (!readableVariables.get(node.id)?.has(varKey)) {
            throw invalidApp(`节点 ${node.id} 引用了尚未在上游赋值的应用变量 $${varKey}`)
          }
        }
      }

      if (isOutputNode(node)) {
        const varKey = node.data.varKey
        if (!varKey) continue
        if (!variableKeys.has(varKey)) throw invalidApp(`节点 ${node.id} 引用了不存在的应用变量`)
        if (!readableVariables.get(node.id)?.has(varKey)) {
          throw invalidApp(`节点 ${node.id} 引用了尚未在上游赋值的应用变量 $${varKey}`)
        }
        const variable = variables.find((item) => item.key === varKey)
        const expectedType = node.type === 'output_image' ? 'IMAGE' : 'STRING'
        if (variable && !isCompatibleVariableType(variable.type, expectedType)) {
          throw invalidApp(`节点 ${node.id} 的输出变量类型应为 ${expectedType}`)
        }
      }

      if (node.type === 'image_concat') {
        for (const input of node.data.inputs ?? []) {
          if (!input.varKey) continue
          if (!variableKeys.has(input.varKey)) throw invalidApp(`节点 ${node.id} 引用了不存在的应用变量`)
          const inputVariable = variables.find((item) => item.key === input.varKey)
          if (inputVariable && !isCompatibleVariableType(inputVariable.type, 'IMAGE')) {
            throw invalidApp(`节点 ${node.id} 的输入变量类型应为 IMAGE`)
          }
        }

        const varKey = node.data.outputValue
        if (!varKey) continue
        if (!variableKeys.has(varKey)) throw invalidApp(`节点 ${node.id} 引用了不存在的应用变量`)
        const variable = variables.find((item) => item.key === varKey)
        if (variable && !isCompatibleVariableType(variable.type, 'IMAGE')) {
          throw invalidApp(`节点 ${node.id} 的输出变量类型应为 IMAGE`)
        }
      }

      if (node.type === 'workflow_run') {
        await this.validateWorkflowRunNode(node, variableKeys, readableVariables.get(node.id) ?? new Set())
      }
    }
  }

  private async validateWorkflowRunNode(
    node: WorkflowRunNode,
    variableKeys: Set<string>,
    readableVariables: Set<string>
  ) {
    if (!node.data.workflowId) return
    const workflow = await this.workflowRepository.findOrFail(node.data.workflowId)
    const parameterKeys = new Set(workflow.parameters.map((parameter) => parameter.key))
    const resultKeys = new Set(workflow.results.map((result) => result.key))

    for (const parameter of workflow.parameters) {
      const binding = node.data.inputBindings?.[parameter.key]
      if (!binding) {
        if (parameter.default !== undefined || parameter.type === 'SEED') continue
        throw invalidApp(`工作流节点 ${node.id} 的参数 ${parameter.name} 未赋值`)
      }
      if (binding.kind === 'variable' && (!binding.varKey || !variableKeys.has(binding.varKey))) {
        throw invalidApp(`工作流节点 ${node.id} 的参数 ${parameter.name} 引用了不存在的应用变量`)
      }
      if (binding.kind === 'variable' && binding.varKey && !readableVariables.has(binding.varKey)) {
        throw invalidApp(`工作流节点 ${node.id} 的参数 ${parameter.name} 引用了尚未在上游赋值的应用变量`)
      }
    }

    for (const key of Object.keys(node.data.inputBindings ?? {})) {
      if (!parameterKeys.has(key)) throw invalidApp(`工作流节点 ${node.id} 存在无效参数赋值`)
    }

    for (const [resultKey, varKey] of Object.entries(node.data.outputAssignments ?? {})) {
      if (!resultKeys.has(resultKey)) throw invalidApp(`工作流节点 ${node.id} 存在无效结果赋值`)
      if (varKey && !variableKeys.has(varKey)) {
        throw invalidApp(`工作流节点 ${node.id} 的结果赋值引用了不存在的应用变量`)
      }
    }
  }

  private async buildReadableVariablesByNode(
    nodes: AppGraphNode[],
    variables: AppVariable[],
    edges: AppGraph['edges']
  ) {
    const initialVariables = new Set(
      variables.filter((variable) => variable.source === 'user_input').map((variable) => variable.key)
    )
    const nodeById = new Map(nodes.map((node) => [node.id, node]))
    const parents = new Map<string, string[]>()
    for (const edge of edges) parents.set(edge.target, [...(parents.get(edge.target) ?? []), edge.source])

    const result = new Map<string, Set<string>>()
    for (const node of nodes) {
      const readable = new Set(initialVariables)
      const visited = new Set<string>()
      const stack = [...(parents.get(node.id) ?? [])]
      while (stack.length > 0) {
        const parentId = stack.pop()!
        if (visited.has(parentId)) continue
        visited.add(parentId)
        const parent = nodeById.get(parentId)
        if (parent?.type === 'workflow_run') {
          for (const varKey of Object.values(parent.data.outputAssignments ?? {})) {
            if (varKey) readable.add(varKey)
          }
        }
        if (parent?.type === 'coalesce') {
          if (parent.data.outputValue) readable.add(parent.data.outputValue)
          if (parent.data.outputSourceIndex) readable.add(parent.data.outputSourceIndex)
        }
        if (parent?.type === 'image_concat' && parent.data.outputValue) {
          readable.add(parent.data.outputValue)
        }
        stack.push(...(parents.get(parentId) ?? []))
      }
      result.set(node.id, readable)
    }
    return result
  }
}

type LegacyOutputCollectNode = {
  id: string
  type: 'output_collect'
  position: { x: number; y: number }
  data: { displayVars: string[] }
}
type LegacyGraphNode = AppGraphNode | LegacyOutputCollectNode

function normalizeGraph(graph: AppGraph, variables: AppVariable[]): AppGraph {
  const variableByKey = new Map(variables.map((variable) => [variable.key, variable]))
  const legacyOutputIds = new Map<string, string[]>()
  const nodes: AppGraphNode[] = []

  for (const node of (graph.nodes ?? []) as LegacyGraphNode[]) {
    if (node.type !== 'output_collect') {
      nodes.push(node)
      continue
    }

    const displayVars = node.data.displayVars ?? []
    const outputIds = displayVars.map((_, index) => (index === 0 ? node.id : `${node.id}-${index + 1}`))
    legacyOutputIds.set(node.id, outputIds)
    for (const [index, varKey] of displayVars.entries()) {
      const variable = variableByKey.get(varKey)
      nodes.push({
        id: outputIds[index],
        type: variable?.type === 'IMAGE' ? 'output_image' : 'output_text',
        position: { x: node.position.x, y: node.position.y + index * 120 },
        data: { varKey },
      })
    }
  }

  const nodeIds = new Set(nodes.map((node) => node.id))
  const edges: AppGraph['edges'] = []
  const edgeIds = new Set<string>()
  for (const edge of graph.edges ?? []) {
    const sourceIds = legacyOutputIds.get(edge.source) ?? [edge.source]
    const targetIds = legacyOutputIds.get(edge.target) ?? [edge.target]
    for (const source of sourceIds) {
      for (const target of targetIds) {
        if (!nodeIds.has(source) || !nodeIds.has(target) || source === target) continue
        const id = buildEdgeId(source, target, edge.sourceHandle, edge.targetHandle)
        if (edgeIds.has(id)) continue
        edgeIds.add(id)
        edges.push({
          id,
          source,
          target,
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle,
        })
      }
    }
  }

  return { nodes, edges }
}

function isOutputNode(node: AppGraphNode | undefined): node is Extract<AppGraphNode, { type: 'output_text' | 'output_image' }> {
  return node?.type === 'output_text' || node?.type === 'output_image'
}

function isCompatibleVariableType(actual: string, expected: string) {
  return actual === 'UNKNOWN' || expected === 'UNKNOWN' || actual === expected
}

function normalizeKey(value: string) {
  return value.trim().replace(/^\$+/, '').trim()
}

function buildEdgeId(source: string, target: string, sourceHandle?: string, targetHandle?: string) {
  if (sourceHandle || targetHandle) {
    return `${source}-${sourceHandle || 'default'}-${target}-${targetHandle || 'default'}`
  }
  return `${source}-${target}`
}

function invalidApp(message: string) {
  return new Exception(message, { status: 422, code: 'E_INVALID_APP' })
}
