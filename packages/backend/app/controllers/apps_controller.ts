import AppService from '#services/app_service'
import { createAppValidator, updateAppValidator } from '#validators/app'
import type { HttpContext } from '@adonisjs/core/http'

export default class AppsController {
  private service = new AppService()

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

  async destroy({ params, response }: HttpContext) {
    await this.service.delete(Number(params.id))
    return response.noContent()
  }
}
