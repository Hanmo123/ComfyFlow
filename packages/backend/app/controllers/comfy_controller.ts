import ComfyService from '#services/comfy_service'
import MediaAssetService from '#services/media_asset_service'
import { Exception } from '@adonisjs/core/exceptions'
import type { HttpContext } from '@adonisjs/core/http'

export default class ComfyController {
  private mediaAssetService = new MediaAssetService(undefined, new ComfyService())

  async uploadImage({ request }: HttpContext) {
    const image = request.file('image', {
      size: '20mb',
      extnames: ['jpg', 'jpeg', 'png', 'webp'],
    })
    if (!image) throw new Exception('请选择要上传的图片', { status: 422, code: 'E_IMAGE_REQUIRED' })

    return this.mediaAssetService.saveImage(image)
  }
}
