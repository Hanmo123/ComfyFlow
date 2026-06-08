import vine from '@vinejs/vine'

export const createAppValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(120),
  description: vine.string().trim().maxLength(500).nullable().optional(),
  status: vine.enum(['draft', 'published']).optional(),
  variables: vine.array(vine.any()).optional(),
  graph: vine.any().optional(),
})

export const updateAppValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(120).optional(),
  description: vine.string().trim().maxLength(500).nullable().optional(),
  status: vine.enum(['draft', 'published']).optional(),
  variables: vine.array(vine.any()).optional(),
  graph: vine.any().optional(),
})

export const runAppValidator = vine.create({
  inputs: vine.any().optional(),
})
