import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export type AppStatus = 'draft' | 'published'
export type AppVariableSource = 'user_input' | 'computed'
export type AppNodeType =
  | 'input_collect'
  | 'output_text'
  | 'output_image'
  | 'manual_gate'
  | 'workflow_run'
  | 'coalesce'

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
export type OutputTextNode = BaseAppNode<'output_text', { varKey: string | null }>
export type OutputImageNode = BaseAppNode<'output_image', { varKey: string | null }>
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
export type CoalesceNode = BaseAppNode<
  'coalesce',
  {
    inputs: Array<{ varKey: string | null }>
    outputValue: string | null
    outputSourceIndex: string | null
  }
>

export type AppGraphNode =
  | InputCollectNode
  | OutputTextNode
  | OutputImageNode
  | ManualGateNode
  | WorkflowRunNode
  | CoalesceNode

export interface AppGraph {
  nodes: AppGraphNode[]
  edges: AppEdge[]
}

export default class App extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare description: string | null

  @column()
  declare status: AppStatus

  @column({ prepare: stringifyJson, consume: parseJson })
  declare variables: AppVariable[]

  @column({ prepare: stringifyJson, consume: parseJson })
  declare graph: AppGraph

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}

function stringifyJson(value: unknown) {
  return JSON.stringify(value ?? null)
}

function parseJson(value: unknown) {
  if (typeof value !== 'string') return value
  return JSON.parse(value)
}
