import { BaseSchema } from '@adonisjs/lucid/schema'
import { DateTime } from 'luxon'

const DEFAULT_TASK_GROUP_NAME = '默认分组'

export default class extends BaseSchema {
  protected groupsTableName = 'task_groups'
  protected tasksTableName = 'app_tasks'

  async up() {
    const groupsExists = await this.schema.hasTable(this.groupsTableName)
    if (!groupsExists) {
      this.schema.createTable(this.groupsTableName, (table) => {
        table.increments('id').notNullable()
        table.string('name').notNullable()
        table.integer('sort_order').notNullable().defaultTo(1)

        table.timestamp('created_at').notNullable()
        table.timestamp('updated_at').nullable()
      })
    }

    const tasksExists = await this.schema.hasTable(this.tasksTableName)
    const hasTaskGroupId =
      tasksExists && (await this.schema.hasColumn(this.tasksTableName, 'task_group_id'))
    if (tasksExists && !hasTaskGroupId) {
      this.schema.alterTable(this.tasksTableName, (table) => {
        table
          .integer('task_group_id')
          .nullable()
          .references('id')
          .inTable(this.groupsTableName)
          .onDelete('SET NULL')
      })
    }

    this.defer(async (db) => {
      const now = DateTime.now().toSQL({ includeOffset: false })
      const defaultGroup = await db
        .from(this.groupsTableName)
        .where('name', DEFAULT_TASK_GROUP_NAME)
        .first()
      let defaultGroupId = defaultGroup?.id
      if (!defaultGroupId) {
        const insertedGroupIds = await db.table(this.groupsTableName).insert({
          name: DEFAULT_TASK_GROUP_NAME,
          sort_order: 1,
          created_at: now,
          updated_at: now,
        })
        defaultGroupId = insertedGroupIds[0]
      }

      if (tasksExists) {
        await db
          .from(this.tasksTableName)
          .whereNull('task_group_id')
          .update({ task_group_id: defaultGroupId })
      }
    })
  }

  async down() {
    const tasksExists = await this.schema.hasTable(this.tasksTableName)
    const hasTaskGroupId =
      tasksExists && (await this.schema.hasColumn(this.tasksTableName, 'task_group_id'))
    if (hasTaskGroupId) {
      this.schema.alterTable(this.tasksTableName, (table) => {
        table.dropColumn('task_group_id')
      })
    }

    this.schema.dropTableIfExists(this.groupsTableName)
  }
}
