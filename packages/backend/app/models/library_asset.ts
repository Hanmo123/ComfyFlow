import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import MediaAsset from '#models/media_asset'

export default class LibraryAsset extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare mediaAssetId: number

  @column()
  declare displayName: string

  @column()
  declare description: string | null

  @column()
  declare tags: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => MediaAsset)
  declare mediaAsset: BelongsTo<typeof MediaAsset>
}
