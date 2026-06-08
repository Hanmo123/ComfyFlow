import TaskGroup from '#models/task_group'

export const DEFAULT_TASK_GROUP_NAME = '默认分组'

export interface CreateTaskGroupPayload {
  name: string
}

export default class TaskGroupRepository {
  async list() {
    return TaskGroup.query().orderBy('sort_order', 'asc').orderBy('id', 'asc')
  }

  async create(payload: CreateTaskGroupPayload) {
    const maxSortOrder = await TaskGroup.query().max('sort_order as value').first()
    const nextSortOrder = Number(maxSortOrder?.$extras.value ?? 0) + 1
    return TaskGroup.create({
      name: payload.name,
      sortOrder: nextSortOrder,
    })
  }

  async findOrFail(id: number) {
    return TaskGroup.findOrFail(id)
  }

  async findDefault() {
    return TaskGroup.query().where('name', DEFAULT_TASK_GROUP_NAME).orderBy('id', 'asc').first()
  }

  async createDefault() {
    return TaskGroup.create({ name: DEFAULT_TASK_GROUP_NAME, sortOrder: 1 })
  }
}
