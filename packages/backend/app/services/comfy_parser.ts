import {
  createFallbackDefinition,
  getNodeDefinition,
  isConnectionValue,
} from '#comfy_nodes/index'
import type { NodeDefinition, LoraItem } from '#comfy_nodes/index'

export interface ParsedWorkflowNode {
  id: string
  classType: string
  position: { x: number; y: number }
  fieldValues: Record<string, unknown>
}

export interface ParsedWorkflowEdge {
  id: string
  from: string
  fromSlot: number
  to: string
  toField: string
}

export interface ParsedWorkflowGraph {
  nodes: ParsedWorkflowNode[]
  edges: ParsedWorkflowEdge[]
}

interface RawComfyNode {
  class_type?: string
  inputs?: Record<string, unknown>
}

export interface ParsedComfyWorkflow {
  graph: ParsedWorkflowGraph
  nodeDefinitions: Record<string, NodeDefinition>
}

export function parseComfyApiJson(rawJson: Record<string, unknown>): ParsedComfyWorkflow {
  const normalizedRawJson = normalizeComfyApiJson(rawJson)
  const entries = Object.entries(normalizedRawJson).filter(([, value]) => isRawComfyNode(value)) as [
    string,
    RawComfyNode,
  ][]

  const edges: ParsedWorkflowEdge[] = []
  const nodes = entries.map(([id, rawNode]) => {
    const inputs = rawNode.inputs ?? {}

    for (const [field, value] of Object.entries(inputs)) {
      if (isConnectionValue(value)) {
        const fromId = String(value[0])

        edges.push({
          id: `${fromId}:${value[1]}->${id}:${field}`,
          from: fromId,
          fromSlot: value[1],
          to: id,
          toField: field,
        })
      }
    }

    return {
      id,
      classType: rawNode.class_type!,
      position: { x: 0, y: 0 },
      fieldValues: inputs,
    }
  })

  const positionedNodes = applyLayeredLayout(nodes, edges)
  const nodeDefinitions = entries.reduce<Record<string, NodeDefinition>>((result, [, rawNode]) => {
    const classType = rawNode.class_type!
    result[classType] = getNodeDefinition(classType) ?? createFallbackDefinition(classType, rawNode.inputs)
    return result
  }, {})

  return {
    graph: { nodes: positionedNodes, edges },
    nodeDefinitions,
  }
}

export function normalizeComfyApiJson(rawJson: Record<string, unknown>): Record<string, unknown> {
  const entries = Object.entries(rawJson).filter(([, value]) => isRawComfyNode(value)) as [
    string,
    RawComfyNode,
  ][]
  const { mergedEntries, nodesToRemove, nodeRedirects } = mergeChainedLoraLoaders(entries)
  if (nodesToRemove.size === 0) return structuredClone(rawJson)

  const normalized = structuredClone(rawJson)
  for (const nodeId of nodesToRemove) delete normalized[nodeId]
  for (const [nodeId, node] of mergedEntries) normalized[nodeId] = structuredClone(node)

  for (const value of Object.values(normalized)) {
    if (!isRawComfyNode(value) || !value.inputs) continue
    for (const [field, input] of Object.entries(value.inputs)) {
      if (!isConnectionValue(input)) continue
      const redirectTo = nodeRedirects.get(String(input[0]))
      if (redirectTo) value.inputs[field] = [redirectTo, input[1]]
    }
  }

  return normalized
}

function isRawComfyNode(value: unknown): value is RawComfyNode {
  return Boolean(
    value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      typeof (value as RawComfyNode).class_type === 'string'
  )
}

function isLoraLoaderNode(classType: string): boolean {
  return classType === 'LoraLoader' || classType === 'LoraLoaderModelOnly'
}

function mergeChainedLoraLoaders(
  entries: [string, RawComfyNode][]
): { mergedEntries: [string, RawComfyNode][]; nodesToRemove: Set<string>; nodeRedirects: Map<string, string> } {
  const nodeMap = new Map(entries)
  const nodesToRemove = new Set<string>()
  const nodeRedirects = new Map<string, string>() // 被删除的节点ID -> 替代节点ID
  const processed = new Set<string>()

  // 构建节点连接关系
  const childrenMap = new Map<string, Set<string>>() // nodeId -> Set<下游节点ID>
  const parentMap = new Map<string, Map<string, [string, number]>>() // nodeId -> { field -> [parentId, slot] }

  for (const [id, node] of entries) {
    const inputs = node.inputs ?? {}
    const parents = new Map<string, [string, number]>()

    for (const [field, value] of Object.entries(inputs)) {
      if (isConnectionValue(value)) {
        const parentId = String(value[0])
        const slot = value[1]
        parents.set(field, [parentId, slot])

        if (!childrenMap.has(parentId)) {
          childrenMap.set(parentId, new Set())
        }
        childrenMap.get(parentId)!.add(id)
      }
    }

    parentMap.set(id, parents)
  }

  // 查找 Lora 链的起点（第一个 Lora 节点）
  for (const [id, node] of entries) {
    if (processed.has(id) || nodesToRemove.has(id)) continue
    if (!isLoraLoaderNode(node.class_type!)) continue

    const chain = collectLoraChain(id, nodeMap, parentMap, childrenMap)
    if (chain.length <= 1) continue

    // 合并链
    processed.add(id)
    const firstNode = nodeMap.get(id)!
    const hasClip = firstNode.class_type === 'LoraLoader'
    const loraList: LoraItem[] = []

    for (const chainNodeId of chain) {
      const chainNode = nodeMap.get(chainNodeId)!
      const inputs = chainNode.inputs ?? {}

      const loraName = inputs.lora_name
      const strengthModel = inputs.strength_model
      const strengthClip = hasClip ? inputs.strength_clip : undefined

      if (typeof loraName === 'string') {
        loraList.push({
          name: loraName,
          strength_model: typeof strengthModel === 'number' ? strengthModel : 1.0,
          strength_clip: typeof strengthClip === 'number' ? strengthClip : 1.0,
        })
      }

      if (chainNodeId !== id) {
        nodesToRemove.add(chainNodeId)
        nodeRedirects.set(chainNodeId, id) // 将被删除的节点重定向到第一个节点
        processed.add(chainNodeId)
      }
    }

    // 更新第一个节点，添加 lora_list 字段
    const firstInputs = { ...(firstNode.inputs ?? {}) }
    firstInputs.lora_list = loraList

    // 保留原始上游连接（model 和 clip）
    const firstParents = parentMap.get(id)!
    if (firstParents.has('model')) {
      const [parentId, slot] = firstParents.get('model')!
      firstInputs.model = [parentId, slot]
    }
    if (hasClip && firstParents.has('clip')) {
      const [parentId, slot] = firstParents.get('clip')!
      firstInputs.clip = [parentId, slot]
    }

    nodeMap.set(id, {
      ...firstNode,
      inputs: firstInputs,
    })
  }

  // 过滤掉被删除的节点，并使用更新后的 nodeMap
  const mergedEntries: [string, RawComfyNode][] = []
  for (const [id] of entries) {
    if (!nodesToRemove.has(id)) {
      mergedEntries.push([id, nodeMap.get(id)!])
    }
  }

  return { mergedEntries, nodesToRemove, nodeRedirects }
}

function collectLoraChain(
  startId: string,
  nodeMap: Map<string, RawComfyNode>,
  parentMap: Map<string, Map<string, [string, number]>>,
  childrenMap: Map<string, Set<string>>
): string[] {
  const chain: string[] = [startId]
  let currentId = startId
  const startNode = nodeMap.get(startId)!
  const hasClip = startNode.class_type === 'LoraLoader'

  while (true) {
    const children = Array.from(childrenMap.get(currentId) ?? [])

    // 查找唯一的 Lora 子节点
    let loraChild: string | null = null
    for (const childId of children) {
      const childNode = nodeMap.get(childId)
      if (!childNode || !isLoraLoaderNode(childNode.class_type!)) continue

      const childParents = parentMap.get(childId)!
      const modelParent = childParents.get('model')
      const clipParent = hasClip ? childParents.get('clip') : null

      // 检查是否直接连接到当前节点（注意 parentId 可能是字符串或数字）
      const isModelConnected = modelParent && String(modelParent[0]) === currentId && modelParent[1] === 0
      const isClipConnected = hasClip
        ? clipParent && String(clipParent[0]) === currentId && clipParent[1] === 1
        : true

      if (isModelConnected && isClipConnected) {
        // 确保这是唯一的 Lora 子节点
        if (loraChild !== null) return chain // 有多个分支，停止
        loraChild = childId
      }
    }

    if (!loraChild) break

    // 检查子节点是否只被当前节点连接（没有其他输入）
    const childParents = parentMap.get(loraChild)!
    const nonLoraInputs = Array.from(childParents.entries()).filter(
      ([field]) => field !== 'model' && field !== 'clip'
    )
    if (nonLoraInputs.length > 0) break // 有其他输入，停止

    chain.push(loraChild)
    currentId = loraChild
  }

  return chain
}

function applyLayeredLayout(nodes: ParsedWorkflowNode[], edges: ParsedWorkflowEdge[]) {
  const nodeIds = new Set(nodes.map((node) => node.id))
  const incoming = new Map<string, ParsedWorkflowEdge[]>()
  const outgoing = new Map<string, ParsedWorkflowEdge[]>()

  for (const node of nodes) {
    incoming.set(node.id, [])
    outgoing.set(node.id, [])
  }

  for (const edge of edges) {
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) continue
    incoming.get(edge.to)?.push(edge)
    outgoing.get(edge.from)?.push(edge)
  }

  const indegree = new Map(nodes.map((node) => [node.id, incoming.get(node.id)?.length ?? 0]))
  const queue = nodes.filter((node) => indegree.get(node.id) === 0).map((node) => node.id)
  const layer = new Map(nodes.map((node) => [node.id, 0]))

  while (queue.length > 0) {
    const current = queue.shift()!
    const currentLayer = layer.get(current) ?? 0

    for (const edge of outgoing.get(current) ?? []) {
      layer.set(edge.to, Math.max(layer.get(edge.to) ?? 0, currentLayer + 1))
      const nextDegree = (indegree.get(edge.to) ?? 0) - 1
      indegree.set(edge.to, nextDegree)
      if (nextDegree === 0) queue.push(edge.to)
    }
  }

  const grouped = new Map<number, ParsedWorkflowNode[]>()
  for (const node of nodes) {
    const nodeLayer = layer.get(node.id) ?? 0
    grouped.set(nodeLayer, [...(grouped.get(nodeLayer) ?? []), node])
  }

  return nodes.map((node) => {
    const nodeLayer = layer.get(node.id) ?? 0
    const siblings = grouped.get(nodeLayer) ?? []
    const index = siblings.findIndex((sibling) => sibling.id === node.id)

    return {
      ...node,
      position: { x: nodeLayer * 360 + 80, y: index * 260 + 80 },
    }
  })
}
