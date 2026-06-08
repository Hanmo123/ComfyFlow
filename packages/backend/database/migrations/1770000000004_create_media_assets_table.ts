import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'media_assets'

  async up() {
    const exists = await this.schema.hasTable(this.tableName)
    if (exists) return

    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('hash').notNullable().unique()
      table.string('original_name').notNullable()
      table.string('extension').nullable()
      table.string('mime_type').nullable()
      table.integer('size').notNullable()
      table.string('local_path').notNullable()
      table.string('comfy_name').notNullable()
      table.string('comfy_filename').notNullable()
      table.string('comfy_subfolder').notNullable().defaultTo('')
      table.string('comfy_type').notNullable().defaultTo('input')
      table.text('comfy_url').notNullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTableIfExists(this.tableName)
  }
}
