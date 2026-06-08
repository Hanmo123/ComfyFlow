import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export default class MediaAsset extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare hash: string

  @column()
  declare originalName: string

  @column()
  declare extension: string | null

  @column()
  declare mimeType: string | null

  @column()
  declare size: number

  @column()
  declare localPath: string

  @column()
  declare comfyName: string

  @column()
  declare comfyFilename: string

  @column()
  declare comfySubfolder: string

  @column()
  declare comfyType: string

  @column()
  declare comfyUrl: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}
