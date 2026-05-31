import WorkflowService from '#services/workflow_service'
import { updateWorkflowValidator, uploadWorkflowValidator } from '#validators/workflow'
import type { HttpContext } from '@adonisjs/core/http'

export default class WorkflowsController {
  private service = new WorkflowService()

  async index() {
    return this.service.list()
  }

  async upload({ request, response }: HttpContext) {
    const { rawJson } = await request.validateUsing(uploadWorkflowValidator)
    if (!rawJson || typeof rawJson !== 'object' || Array.isArray(rawJson)) {
      return response.badRequest({
        errors: [{ message: 'rawJson must be a ComfyUI API JSON object' }],
      })
    }

    return this.service.upload(rawJson as Record<string, unknown>)
  }

  async show({ params }: HttpContext) {
    return this.service.show(Number(params.id))
  }

  async update({ params, request }: HttpContext) {
    const payload = await request.validateUsing(updateWorkflowValidator)
    return this.service.update(Number(params.id), payload)
  }

  async destroy({ params, response }: HttpContext) {
    await this.service.delete(Number(params.id))
    return response.noContent()
  }
}
