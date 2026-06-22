import AppTaskService from '#services/app_task_service'
import {
  retryTaskValidator,
  retryTaskNodeValidator,
  moveTaskGroupValidator,
  updateTaskInputsValidator,
} from '#validators/task'
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

  async retryNode({ params, request }: HttpContext) {
    const payload = await request.validateUsing(retryTaskNodeValidator)
    return this.taskService.retryNode(Number(params.id), String(params.nodeId), payload.force)
  }

  async retry({ params, request }: HttpContext) {
    const payload = await request.validateUsing(retryTaskValidator)
    return this.taskService.retryTask(Number(params.id), normalizeOptionalInputs(payload.inputs), payload.force)
  }

  async updateInputs({ params, request }: HttpContext) {
    const payload = await request.validateUsing(updateTaskInputsValidator)
    return this.taskService.updateTaskInputs(Number(params.id), normalizeInputs(payload.inputs))
  }

  async syncSnapshot({ params, request }: HttpContext) {
    return this.taskService.syncSnapshot(Number(params.id), isTruthy(request.input('force')))
  }

  async repairLogic({ params }: HttpContext) {
    return this.taskService.repairLogic(Number(params.id))
  }

  async moveToGroup({ params, request }: HttpContext) {
    const payload = await request.validateUsing(moveTaskGroupValidator)
    return this.taskService.moveToGroup(Number(params.id), payload.taskGroupId)
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
  return normalizeInputs(inputs)
}

function normalizeInputs(inputs: unknown) {
  if (!inputs || typeof inputs !== 'object' || Array.isArray(inputs)) return {}
  return inputs as Record<string, unknown>
}
