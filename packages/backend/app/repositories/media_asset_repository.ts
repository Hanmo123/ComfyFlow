import MediaAsset from '#models/media_asset'

export interface CreateMediaAssetPayload {
  hash: string
  originalName: string
  extension: string | null
  mimeType: string | null
  size: number
  localPath: string
  comfyName: string
  comfyFilename: string
  comfySubfolder: string
  comfyType: string
  comfyUrl: string
}

export default class MediaAssetRepository {
  async findByHash(hash: string) {
    return MediaAsset.findBy('hash', hash)
  }

  async findByHashOrFail(hash: string) {
    return MediaAsset.findByOrFail('hash', hash)
  }

  async create(payload: CreateMediaAssetPayload) {
    return MediaAsset.create(payload)
  }
}
