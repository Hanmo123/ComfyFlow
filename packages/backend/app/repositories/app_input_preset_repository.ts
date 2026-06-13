import AppInputPreset, { type PresetType } from '#models/app_input_preset'

export interface CreatePresetPayload {
  appId: number
  name: string
  type: PresetType
  value: unknown
}

export interface UpdatePresetPayload {
  name?: string
  value?: unknown
}

export default class AppInputPresetRepository {
  async listByApp(appId: number, type?: PresetType) {
    const query = AppInputPreset.query().where('app_id', appId)
    if (type) {
      query.where('type', type)
    }
    return query.orderBy('created_at', 'desc')
  }

  async findOrFail(id: number) {
    return AppInputPreset.findOrFail(id)
  }

  async create(payload: CreatePresetPayload) {
    return AppInputPreset.create(payload)
  }

  async update(preset: AppInputPreset, payload: UpdatePresetPayload) {
    preset.merge(payload)
    await preset.save()
    return preset
  }

  async delete(preset: AppInputPreset) {
    await preset.delete()
  }
}
