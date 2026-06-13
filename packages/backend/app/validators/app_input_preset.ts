import vine from '@vinejs/vine'

export const listPresetsValidator = vine.compile(
  vine.object({
    type: vine.enum(['LORA_LIST', 'STRING']).optional(),
  })
)

export const createPresetValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(1).maxLength(120),
    type: vine.enum(['LORA_LIST', 'STRING']),
    value: vine.any(),
  })
)

export const updatePresetValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(1).maxLength(120).optional(),
    value: vine.any().optional(),
  })
)
