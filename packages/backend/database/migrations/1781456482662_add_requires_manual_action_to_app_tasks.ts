import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'app_tasks'

  async up() {
    const exists = await this.schema.hasTable(this.tableName)
    const hasColumn = exists && (await this.schema.hasColumn(this.tableName, 'requires_manual_action'))
    if (!exists || hasColumn) return

    this.schema.alterTable(this.tableName, (table) => {
      table.boolean('requires_manual_action').notNullable().defaultTo(false)
    })
  }

  async down() {
    const exists = await this.schema.hasTable(this.tableName)
    const hasColumn = exists && (await this.schema.hasColumn(this.tableName, 'requires_manual_action'))
    if (!exists || !hasColumn) return

    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('requires_manual_action')
    })
  }
}
