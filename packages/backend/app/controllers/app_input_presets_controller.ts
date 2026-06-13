import AppInputPresetRepository from '#repositories/app_input_preset_repository'
import {
  createPresetValidator,
  updatePresetValidator,
  listPresetsValidator,
} from '#validators/app_input_preset'
import type { HttpContext } from '@adonisjs/core/http'

export default class AppInputPresetsController {
  private repository = new AppInputPresetRepository()

  async index({ params, request }: HttpContext) {
    const { type } = await request.validateUsing(listPresetsValidator)
    const appId = Number(params.appId)
    return this.repository.listByApp(appId, type)
  }

  async store({ params, request }: HttpContext) {
    const payload = await request.validateUsing(createPresetValidator)
    const appId = Number(params.appId)
    return this.repository.create({ appId, name: payload.name, type: payload.type, value: payload.value })
  }

  async update({ params, request }: HttpContext) {
    const payload = await request.validateUsing(updatePresetValidator)
    const preset = await this.repository.findOrFail(Number(params.id))
    return this.repository.update(preset, payload)
  }

  async destroy({ params, response }: HttpContext) {
    const preset = await this.repository.findOrFail(Number(params.id))
    await this.repository.delete(preset)
    return response.noContent()
  }
}
