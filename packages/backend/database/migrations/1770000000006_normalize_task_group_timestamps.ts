import { BaseSchema } from '@adonisjs/lucid/schema'
import { DateTime } from 'luxon'

export default class extends BaseSchema {
  protected tableName = 'task_groups'

  async up() {
    const exists = await this.schema.hasTable(this.tableName)
    if (!exists) return

    this.defer(async (db) => {
      const rows = await db.from(this.tableName).select('id', 'created_at', 'updated_at')
      for (const row of rows) {
        const createdAt = normalizeTimestamp(row.created_at)
        const updatedAt = normalizeTimestamp(row.updated_at)
        if (createdAt === row.created_at && updatedAt === row.updated_at) continue

        await db.from(this.tableName).where('id', row.id).update({
          created_at: createdAt,
          updated_at: updatedAt,
        })
      }
    })
  }
}

function normalizeTimestamp(value: unknown) {
  if (value === null || value === undefined) return value
  if (typeof value !== 'number') return value
  const millis = value > 1_000_000_000_000 ? value : value * 1000
  return DateTime.fromMillis(millis).toSQL({ includeOffset: false })
}
