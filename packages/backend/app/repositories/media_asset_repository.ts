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
  proxyForId?: number | null
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

  async listByHashes(hashes: string[]) {
    if (hashes.length === 0) return []
    return MediaAsset.query().whereIn('hash', hashes)
  }

  async listByProxyForIds(assetIds: number[]) {
    if (assetIds.length === 0) return []
    return MediaAsset.query().whereIn('proxy_for_id', assetIds)
  }

  async hasProxyFor(assetId: number) {
    const proxy = await MediaAsset.query().where('proxy_for_id', assetId).first()
    return Boolean(proxy)
  }
}
