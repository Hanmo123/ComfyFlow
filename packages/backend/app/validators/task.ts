import vine from '@vinejs/vine'

export const retryTaskValidator = vine.create({
  inputs: vine.any().optional(),
  force: vine.boolean().optional(),
})

export const retryTaskNodeValidator = vine.create({
  force: vine.boolean().optional(),
})

export const moveTaskGroupValidator = vine.create({
  taskGroupId: vine.number().positive(),
})
