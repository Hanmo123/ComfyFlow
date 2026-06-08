import TaskGroupService from '#services/task_group_service'
import { createTaskGroupValidator } from '#validators/task_group'
import type { HttpContext } from '@adonisjs/core/http'

export default class TaskGroupsController {
  private service = new TaskGroupService()

  async index() {
    return this.service.list()
  }

  async store({ request }: HttpContext) {
    const payload = await request.validateUsing(createTaskGroupValidator)
    return this.service.create(payload)
  }
}
