import type { AppGraph, AppGraphNode, AppVariable } from '#models/app'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export type AppTaskStatus = 'queued' | 'running' | 'waiting' | 'completed' | 'failed'
export type AppTaskNodeStatus =
  | 'queued'
  | 'running'
  | 'waiting'
  | 'completed'
  | 'failed'
  | 'skipped'

export interface AppTaskSnapshot {
  id: number
  name: string
  variables: AppVariable[]
  graph: AppGraph
}

export interface AppTaskNodeRun {
  nodeId: string
  type: AppGraphNode['type']
  status: AppTaskNodeStatus
  startedAt?: string
  completedAt?: string
  error?: string
  inputs?: Record<string, unknown>
  outputs?: Record<string, unknown>
}

export default class AppTask extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare appId: number

  @column()
  declare taskGroupId: number | null

  @column()
  declare status: AppTaskStatus

  @column({ prepare: stringifyJson, consume: parseJson })
  declare inputs: Record<string, unknown>

  @column({ prepare: stringifyJson, consume: parseJson })
  declare variables: Record<string, unknown>

  @column({ prepare: stringifyJson, consume: parseJson })
  declare outputs: Record<string, unknown>

  @column({ prepare: stringifyJson, consume: parseJson })
  declare appSnapshot: AppTaskSnapshot

  @column({ prepare: stringifyJson, consume: parseJson })
  declare nodeRuns: AppTaskNodeRun[]

  @column()
  declare waitingNodeId: string | null

  @column()
  declare error: string | null

  @column.dateTime()
  declare startedAt: DateTime | null

  @column.dateTime()
  declare completedAt: DateTime | null

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
