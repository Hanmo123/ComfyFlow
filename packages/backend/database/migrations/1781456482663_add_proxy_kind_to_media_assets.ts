import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'media_assets'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('proxy_kind').nullable()
      table.index(['proxy_for_id', 'proxy_kind'])
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(['proxy_for_id', 'proxy_kind'])
      table.dropColumn('proxy_kind')
    })
  }
}
