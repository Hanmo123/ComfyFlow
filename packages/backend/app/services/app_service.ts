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
      graph: normalizedPayload.graph ?? app.graph,
    }
    await this.validatePayload(nextPayload)
    return this.repository.update(app, normalizedPayload)
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
    for (const variable of variables) {
      if (!variable.key || !variable.name || !variable.type) {
        throw invalidApp('应用变量的标识、名称和类型不能为空')
      }
      if (!['user_input', 'computed'].includes(variable.source)) {
        throw invalidApp(`应用变量 ${variable.name} 的来源无效`)
      }
      if (keys.has(variable.key)) throw invalidApp(`应用变量 $${variable.key} 重复`)
      keys.add(variable.key)
    }
  }

  private async validateGraph(graph: AppGraph, variables: AppVariable[]) {
    const nodes = graph.nodes ?? []
    const edges = graph.edges ?? []
    const nodeIds = new Set(nodes.map((node) => node.id))
    const variableKeys = new Set(variables.map((variable) => variable.key))

    if (nodes.filter((node) => node.type === 'input_collect').length !== 1) {
      throw invalidApp('应用必须有且仅有一个输入收集节点')
    }
    if (nodes.filter((node) => node.type === 'output_collect').length !== 1) {
      throw invalidApp('应用必须有且仅有一个输出收集节点')
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
    const outputNode = nodes.find((node) => node.type === 'output_collect')!
    if (edges.some((edge) => edge.target === inputNode.id)) {
      throw invalidApp('输入收集节点不能有入边')
    }
    if (edges.some((edge) => edge.source === outputNode.id)) {
      throw invalidApp('输出收集节点不能有出边')
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
      if (node.type === 'output_collect' || node.type === 'manual_gate') {
        for (const varKey of node.data.displayVars ?? []) {
          if (!variableKeys.has(varKey)) throw invalidApp(`节点 ${node.id} 引用了不存在的应用变量`)
          if (!readableVariables.get(node.id)?.has(varKey)) {
            throw invalidApp(`节点 ${node.id} 引用了尚未在上游赋值的应用变量 $${varKey}`)
          }
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
      if (!binding) throw invalidApp(`工作流节点 ${node.id} 的参数 ${parameter.name} 未赋值`)
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
        stack.push(...(parents.get(parentId) ?? []))
      }
      result.set(node.id, readable)
    }
    return result
  }
}

function normalizeKey(value: string) {
  return value.trim().replace(/^\$+/, '').trim()
}

function invalidApp(message: string) {
  return new Exception(message, { status: 422, code: 'E_INVALID_APP' })
}
