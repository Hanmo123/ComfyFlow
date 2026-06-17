import vine from '@vinejs/vine'

export const retryTaskValidator = vine.create({
  inputs: vine.any().optional(),
})

export const moveTaskGroupValidator = vine.create({
  taskGroupId: vine.number().positive(),
})
