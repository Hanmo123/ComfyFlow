import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'library_assets'

  async up() {
    const exists = await this.schema.hasTable(this.tableName)
    if (exists) return

    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.integer('media_asset_id').unsigned().notNullable().references('id').inTable('media_assets').onDelete('CASCADE')
      table.string('display_name').notNullable()
      table.text('description').nullable()
      table.string('tags').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index('media_asset_id')
    })
  }

  async down() {
    this.schema.dropTableIfExists(this.tableName)
  }
}
