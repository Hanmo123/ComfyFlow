import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'workflows'

  async up() {
    const hasInputs = await this.schema.hasColumn(this.tableName, 'inputs')
    if (hasInputs) {
      this.schema.alterTable(this.tableName, (table) => {
        table.renameColumn('inputs', 'parameters')
      })
    }

    const hasOutputs = await this.schema.hasColumn(this.tableName, 'outputs')
    if (hasOutputs) {
      this.schema.alterTable(this.tableName, (table) => {
        table.renameColumn('outputs', 'results')
      })
    }
  }

  async down() {
    const hasParameters = await this.schema.hasColumn(this.tableName, 'parameters')
    if (hasParameters) {
      this.schema.alterTable(this.tableName, (table) => {
        table.renameColumn('parameters', 'inputs')
      })
    }

    const hasResults = await this.schema.hasColumn(this.tableName, 'results')
    if (hasResults) {
      this.schema.alterTable(this.tableName, (table) => {
        table.renameColumn('results', 'outputs')
      })
    }
  }
}
