import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'media_assets'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.boolean('is_starred').notNullable().defaultTo(false)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('is_starred')
    })
  }
}
