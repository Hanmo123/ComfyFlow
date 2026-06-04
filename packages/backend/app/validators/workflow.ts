import vine from '@vinejs/vine'

export const uploadWorkflowValidator = vine.create({
  rawJson: vine.any(),
})

export const updateWorkflowValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(120).nullable().optional(),
  status: vine.enum(['draft', 'saved']).optional(),
  parameters: vine.array(vine.any()).optional(),
  results: vine.array(vine.any()).optional(),
})
