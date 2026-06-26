import MediaAsset from '#models/media_asset'

export type MediaAssetProxyKind = 'compressed' | 'thumbnail'

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
  proxyKind?: MediaAssetProxyKind | null
}

export default class MediaAssetRepository {
  async findByHash(hash: string) {
    return MediaAsset.findBy('hash', hash)
  }

  async findByHashOrFail(hash: string) {
    return MediaAsset.findByOrFail('hash', hash)
  }

  async updateStarred(hash: string, isStarred: boolean) {
    const asset = await this.findByHashOrFail(hash)
    asset.isStarred = isStarred
    await asset.save()
    return asset
  }

  async create(payload: CreateMediaAssetPayload) {
    return MediaAsset.create(payload)
  }

  async listByHashes(hashes: string[]) {
    if (hashes.length === 0) return []
    return MediaAsset.query().whereIn('hash', hashes)
  }

  async listStarStates(hashes: string[]) {
    const assets = await this.listByHashes(hashes)
    return Object.fromEntries(assets.map((asset) => [asset.hash, asset.isStarred]))
  }

  async listByProxyForIds(assetIds: number[]) {
    if (assetIds.length === 0) return []
    return MediaAsset.query().whereIn('proxy_for_id', assetIds)
  }

  async listCompressedProxiesByProxyForIds(assetIds: number[]) {
    if (assetIds.length === 0) return []
    return MediaAsset.query()
      .whereIn('proxy_for_id', assetIds)
      .where((query) => query.whereNull('proxy_kind').orWhere('proxy_kind', 'compressed'))
  }

  async listThumbnailsByProxyForIds(assetIds: number[]) {
    if (assetIds.length === 0) return []
    return MediaAsset.query().whereIn('proxy_for_id', assetIds).where('proxy_kind', 'thumbnail')
  }

  async findThumbnailFor(assetId: number) {
    return MediaAsset.query().where('proxy_for_id', assetId).where('proxy_kind', 'thumbnail').first()
  }

  async hasProxyFor(assetId: number) {
    const proxy = await MediaAsset.query().where('proxy_for_id', assetId).first()
    return Boolean(proxy)
  }
}
