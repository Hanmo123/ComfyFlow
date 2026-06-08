import AppTaskService from '#services/app_task_service'
import type { HttpContext } from '@adonisjs/core/http'

export default class TasksController {
  private taskService = new AppTaskService()

  async index({ request }: HttpContext) {
    const groupId = Number(request.qs().groupId)
    return this.taskService.list(Number.isFinite(groupId) && groupId > 0 ? groupId : undefined)
  }

  async show({ params }: HttpContext) {
    return this.taskService.showById(Number(params.id))
  }

  async retryNode({ params }: HttpContext) {
    return this.taskService.retryNode(Number(params.id), String(params.nodeId))
  }
}
