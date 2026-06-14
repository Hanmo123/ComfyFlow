import AppTaskService from '#services/app_task_service'
import { retryTaskValidator } from '#validators/task'
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

  async retry({ params, request }: HttpContext) {
    const payload = await request.validateUsing(retryTaskValidator)
    return this.taskService.retryTask(Number(params.id), normalizeOptionalInputs(payload.inputs))
  }

  async destroy({ params, request, response }: HttpContext) {
    await this.taskService.deleteTask(Number(params.id), { force: isTruthy(request.input('force')) })
    return response.noContent()
  }
}

function isTruthy(value: unknown) {
  return value === true || value === 'true' || value === '1' || value === 1
}

function normalizeOptionalInputs(inputs: unknown) {
  if (inputs === undefined) return undefined
  if (!inputs || typeof inputs !== 'object' || Array.isArray(inputs)) return {}
  return inputs as Record<string, unknown>
}
