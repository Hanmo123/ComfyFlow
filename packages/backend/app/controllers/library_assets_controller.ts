import LibraryAssetService from '#services/library_asset_service'
import {
  createLibraryAssetValidator,
  updateLibraryAssetValidator,
  listLibraryAssetsValidator,
} from '#validators/library_asset_validator'
import type { HttpContext } from '@adonisjs/core/http'

export default class LibraryAssetsController {
  async index({ request, response }: HttpContext) {
    const { page = 1, limit = 20, keyword } = await request.validateUsing(
      listLibraryAssetsValidator
    )
    const service = new LibraryAssetService()

    const result = keyword ? await service.search(keyword, page, limit) : await service.list(page, limit)

    return response.ok(result)
  }

  async show({ params, response }: HttpContext) {
    const service = new LibraryAssetService()
    const asset = await service.show(params.id)
    return response.ok(asset)
  }

  async store({ request, response }: HttpContext) {
    const file = request.file('file', {
      size: '50mb',
      extnames: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    })

    if (!file) {
      return response.badRequest({ error: '请上传图片文件' })
    }

    const payload = await request.validateUsing(createLibraryAssetValidator)
    const service = new LibraryAssetService()
    const asset = await service.create(file, payload.displayName, payload.description, payload.tags)

    return response.created(asset)
  }

  async update({ params, request, response }: HttpContext) {
    const payload = await request.validateUsing(updateLibraryAssetValidator)
    const service = new LibraryAssetService()
    const asset = await service.update(params.id, payload)
    return response.ok(asset)
  }

  async destroy({ params, response }: HttpContext) {
    const service = new LibraryAssetService()
    await service.delete(params.id)
    return response.noContent()
  }
}
