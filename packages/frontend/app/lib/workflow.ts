export type WorkflowStatus = 'draft' | 'saved'

export interface WorkflowRecord {
  id: number
  name: string | null
  status: WorkflowStatus
  rawJson: Record<string, unknown>
  parameters: WorkflowParameter[]
  results: WorkflowResult[]
  createdAt: string
  updatedAt: string | null
}

export interface WorkflowParameter {
  key: string
  nodeId: string
  field: string
  name: string
  type: string
  default?: unknown
}

export interface WorkflowResult {
  key: string
  nodeId: string
  slotIndex: number
  name: string
  type: string
}

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

export interface InputFieldDefinition {
  type: string
  promotable: boolean
  default?: unknown
  options?: string[]
  multiline?: boolean
}

export interface OutputSlotDefinition {
  name: string
  type: string
  exposable: boolean
}

export interface NodeDefinition {
  classType: string
  displayName: string
  category: string
  color?: string
  inputs: Record<string, InputFieldDefinition>
  outputs: OutputSlotDefinition[]
}

export interface WorkflowDetailResponse {
  workflow: WorkflowRecord
  graph: ParsedWorkflowGraph
  nodeDefinitions: Record<string, NodeDefinition>
}
