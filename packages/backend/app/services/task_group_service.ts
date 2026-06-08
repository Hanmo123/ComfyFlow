import TaskGroupRepository, {
  type CreateTaskGroupPayload,
} from '#repositories/task_group_repository'
import { Exception } from '@adonisjs/core/exceptions'

export default class TaskGroupService {
  constructor(private repository = new TaskGroupRepository()) {}

  async list() {
    const groups = await this.repository.list()
    if (groups.length > 0) return groups

    return [await this.repository.createDefault()]
  }

  async create(payload: CreateTaskGroupPayload) {
    const name = payload.name.trim()
    if (!name)
      throw new Exception('任务分组名称不能为空', { status: 422, code: 'E_INVALID_TASK_GROUP' })
    return this.repository.create({ name })
  }

  async ensureExists(id: number) {
    return this.repository.findOrFail(id)
  }
}
