import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import App from '#models/app'

export type PresetType = 'LORA_LIST' | 'STRING'

export default class AppInputPreset extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare appId: number

  @column()
  declare name: string

  @column()
  declare type: PresetType

  @column({ prepare: stringifyJson, consume: parseJson })
  declare value: unknown

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => App)
  declare app: BelongsTo<typeof App>
}

function stringifyJson(value: unknown) {
  return JSON.stringify(value ?? null)
}

function parseJson(value: unknown) {
  if (typeof value !== 'string') return value
  return JSON.parse(value)
}
