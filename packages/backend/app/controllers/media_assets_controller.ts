import MediaAssetService from '#services/media_asset_service'
import type { HttpContext } from '@adonisjs/core/http'

export default class MediaAssetsController {
  private mediaAssetService = new MediaAssetService()

  async show({ params, response }: HttpContext) {
    const filePath = await this.mediaAssetService.localPathForHash(String(params.hash))
    return response.download(filePath)
  }

  async updateStar({ params, request, response }: HttpContext) {
    const isStarred = request.input('isStarred') === true
    const asset = await this.mediaAssetService.updateStarred(String(params.hash), isStarred)
    return response.ok(asset)
  }

  async starStates({ request, response }: HttpContext) {
    const hashes = request.input('hashes', [])
    const states = await this.mediaAssetService.listStarStates(Array.isArray(hashes) ? hashes.map(String) : [])
    return response.ok(states)
  }

  async proxies({ request, response }: HttpContext) {
    const hashes = request.input('hashes', [])
    const proxies = await this.mediaAssetService.listProxiesByOriginalHashes(Array.isArray(hashes) ? hashes.map(String) : [])
    return response.ok(proxies)
  }

  async thumbnails({ request, response }: HttpContext) {
    const hashes = request.input('hashes', [])
    const thumbnails = await this.mediaAssetService.listThumbnailsByOriginalHashes(Array.isArray(hashes) ? hashes.map(String) : [])
    return response.ok(thumbnails)
  }
}
