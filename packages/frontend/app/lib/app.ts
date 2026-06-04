export type AppStatus = 'draft' | 'published'
export type AppVariableSource = 'user_input' | 'computed'
export type AppNodeType = 'input_collect' | 'output_collect' | 'manual_gate' | 'workflow_run'

export const APP_VARIABLE_TYPES = [
  'STRING',
  'INT',
  'FLOAT',
  'BOOL',
  'IMAGE',
  'LATENT',
  'MODEL',
  'CLIP',
  'VAE',
  'CONDITIONING',
  'CONTROL_NET',
  'UNKNOWN',
] as const

export interface AppVariable {
  key: string
  name: string
  type: string
  source: AppVariableSource
  required?: boolean
  default?: unknown
}

export interface AppEdge {
  id: string
  source: string
  target: string
}

export interface VariableBinding {
  kind: 'literal' | 'variable'
  literal?: unknown
  varKey?: string
}

export interface BaseAppNode<TType extends AppNodeType, TData extends Record<string, unknown>> {
  id: string
  type: TType
  position: { x: number; y: number }
  data: TData
}

export type InputCollectNode = BaseAppNode<'input_collect', Record<string, never>>
export type OutputCollectNode = BaseAppNode<'output_collect', { displayVars: string[] }>
export type ManualGateNode = BaseAppNode<
  'manual_gate',
  { title: string; description?: string; displayVars: string[] }
>
export type WorkflowRunNode = BaseAppNode<
  'workflow_run',
  {
    workflowId: number | null
    inputBindings: Record<string, VariableBinding>
    outputAssignments: Record<string, string | null>
  }
>

export type AppGraphNode = InputCollectNode | OutputCollectNode | ManualGateNode | WorkflowRunNode

export interface AppGraph {
  nodes: AppGraphNode[]
  edges: AppEdge[]
}

export interface AppRecord {
  id: number
  name: string
  description: string | null
  status: AppStatus
  variables: AppVariable[]
  graph: AppGraph
  createdAt: string
  updatedAt: string | null
}

export interface AppSavePayload {
  name: string
  description?: string | null
  status?: AppStatus
  variables: AppVariable[]
  graph: AppGraph
}

export function createDefaultGraph(): AppGraph {
  return {
    nodes: [
      { id: 'input', type: 'input_collect', position: { x: 0, y: 0 }, data: {} },
      {
        id: 'output',
        type: 'output_collect',
        position: { x: 720, y: 0 },
        data: { displayVars: [] },
      },
    ],
    edges: [{ id: 'input-output', source: 'input', target: 'output' }],
  }
}

export function nodeTypeLabel(type: AppNodeType) {
  const labels: Record<AppNodeType, string> = {
    input_collect: '输入收集',
    output_collect: '输出收集',
    manual_gate: '人工卡点',
    workflow_run: '工作流运行',
  }
  return labels[type]
}
