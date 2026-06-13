import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'app_input_presets'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('app_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('apps')
        .onDelete('CASCADE')
      table.string('name').notNullable()
      table.string('type').notNullable() // 'LORA_LIST' or 'STRING'
      table.text('value').notNullable() // JSON string

      table.timestamp('created_at')
      table.timestamp('updated_at')

      table.index(['app_id', 'type'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
