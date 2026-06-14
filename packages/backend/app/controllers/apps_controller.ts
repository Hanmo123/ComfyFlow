import AppService from '#services/app_service'
import AppTaskService from '#services/app_task_service'
import { createAppValidator, runAppValidator, updateAppValidator } from '#validators/app'
import type { HttpContext } from '@adonisjs/core/http'

export default class AppsController {
  private service = new AppService()
  private taskService = new AppTaskService()

  async index() {
    return this.service.list()
  }

  async store({ request }: HttpContext) {
    const payload = await request.validateUsing(createAppValidator)
    return this.service.create(payload)
  }

  async show({ params }: HttpContext) {
    return this.service.show(Number(params.id))
  }

  async update({ params, request }: HttpContext) {
    const payload = await request.validateUsing(updateAppValidator)
    return this.service.update(Number(params.id), payload)
  }

  async run({ params, request }: HttpContext) {
    const payload = await request.validateUsing(runAppValidator)
    return this.taskService.run(
      Number(params.id),
      payload.taskGroupId,
      normalizeInputs(payload.inputs)
    )
  }

  async showTask({ params }: HttpContext) {
    return this.taskService.show(Number(params.id), Number(params.taskId))
  }

  async latestTask({ params }: HttpContext) {
    return this.taskService.getLatestTask(Number(params.id))
  }

  async resumeTask({ params }: HttpContext) {
    return this.taskService.resume(Number(params.id), Number(params.taskId))
  }

  async destroy({ params, response }: HttpContext) {
    await this.service.delete(Number(params.id))
    return response.noContent()
  }
}

function normalizeInputs(inputs: unknown) {
  if (!inputs || typeof inputs !== 'object' || Array.isArray(inputs)) return {}
  return inputs as Record<string, unknown>
}
