import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'app_tasks'

  async up() {
    const exists = await this.schema.hasTable(this.tableName)
    if (exists) return

    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.integer('app_id').notNullable().references('id').inTable('apps').onDelete('CASCADE')
      table.string('status').notNullable().defaultTo('queued')
      table.json('inputs').notNullable().defaultTo('{}')
      table.json('variables').notNullable().defaultTo('{}')
      table.json('outputs').notNullable().defaultTo('{}')
      table.json('app_snapshot').notNullable()
      table.json('node_runs').notNullable().defaultTo('[]')
      table.string('waiting_node_id').nullable()
      table.text('error').nullable()
      table.timestamp('started_at').nullable()
      table.timestamp('completed_at').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTableIfExists(this.tableName)
  }
}
