import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'media_assets'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('proxy_for_id').unsigned().nullable().references('id').inTable('media_assets').onDelete('CASCADE')
      table.index('proxy_for_id')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('proxy_for_id')
    })
  }
}
