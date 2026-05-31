import {
  createFallbackDefinition,
  getNodeDefinition,
  getNodeDefinitions,
  isConnectionValue,
} from '#comfy_nodes/index'
import type { NodeDefinition } from '#comfy_nodes/index'

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
  const entries = Object.entries(rawJson).filter(([, value]) => isRawComfyNode(value)) as [
    string,
    RawComfyNode,
  ][]

  const edges: ParsedWorkflowEdge[] = []
  const nodes = entries.map(([id, rawNode]) => {
    const inputs = rawNode.inputs ?? {}

    for (const [field, value] of Object.entries(inputs)) {
      if (isConnectionValue(value)) {
        edges.push({
          id: `${value[0]}:${value[1]}->${id}:${field}`,
          from: String(value[0]),
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
    nodeDefinitions: getNodeDefinitions(Object.keys(nodeDefinitions)),
  }
}

function isRawComfyNode(value: unknown): value is RawComfyNode {
  return Boolean(
    value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      typeof (value as RawComfyNode).class_type === 'string'
  )
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
