import vine from '@vinejs/vine'

export const retryTaskValidator = vine.create({
  inputs: vine.any().optional(),
})
