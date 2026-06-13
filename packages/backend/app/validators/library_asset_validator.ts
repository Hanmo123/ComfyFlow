import vine from '@vinejs/vine'

export const createLibraryAssetValidator = vine.compile(
  vine.object({
    displayName: vine.string().trim().minLength(1).maxLength(255).optional(),
    description: vine.string().trim().maxLength(1000).optional(),
    tags: vine.string().trim().maxLength(500).optional(),
  })
)

export const updateLibraryAssetValidator = vine.compile(
  vine.object({
    displayName: vine.string().trim().minLength(1).maxLength(255).optional(),
    description: vine.string().trim().maxLength(1000).optional(),
    tags: vine.string().trim().maxLength(500).optional(),
  })
)

export const listLibraryAssetsValidator = vine.compile(
  vine.object({
    page: vine.number().min(1).optional(),
    limit: vine.number().min(1).max(100).optional(),
    keyword: vine.string().trim().optional(),
  })
)
