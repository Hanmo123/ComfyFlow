import MediaAssetService from '#services/media_asset_service'
import type { HttpContext } from '@adonisjs/core/http'

export default class MediaAssetsController {
  private mediaAssetService = new MediaAssetService()

  async show({ params, response }: HttpContext) {
    const filePath = await this.mediaAssetService.localPathForHash(String(params.hash))
    return response.download(filePath)
  }
}
