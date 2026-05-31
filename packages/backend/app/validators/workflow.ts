import vine from '@vinejs/vine'

export const uploadWorkflowValidator = vine.create({
  rawJson: vine.any(),
})

export const updateWorkflowValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(120).nullable().optional(),
  status: vine.enum(['draft', 'saved']).optional(),
  inputs: vine.array(vine.any()).optional(),
  outputs: vine.array(vine.any()).optional(),
})
