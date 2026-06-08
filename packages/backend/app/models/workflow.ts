import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export type WorkflowStatus = 'draft' | 'saved'

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

export default class Workflow extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string | null

  @column()
  declare status: WorkflowStatus

  @column({ prepare: stringifyJson, consume: parseJson })
  declare rawJson: Record<string, unknown>

  @column({ prepare: stringifyJsonArray, consume: parseJsonArray })
  declare parameters: WorkflowParameter[]

  @column({ prepare: stringifyJsonArray, consume: parseJsonArray })
  declare results: WorkflowResult[]

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

function stringifyJsonArray(value: unknown) {
  return JSON.stringify(Array.isArray(value) ? value : [])
}

function parseJsonArray(value: unknown) {
  const parsed = parseJson(value)
  return Array.isArray(parsed) ? parsed : []
}
