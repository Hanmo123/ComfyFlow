import LibraryAsset from '#models/library_asset'
import LibraryAssetRepository from '#repositories/library_asset_repository'
import MediaAssetService from '#services/media_asset_service'

interface UploadableImage {
  clientName: string
  tmpPath?: string
  extname?: string
  type?: string
  subtype?: string
  size: number
  isValid?: boolean
}

export default class LibraryAssetService {
  constructor(
    private repository = new LibraryAssetRepository(),
    private mediaAssetService = new MediaAssetService()
  ) {}

  async list(page: number = 1, limit: number = 20) {
    const result = await this.repository.findAll(page, limit)
    return {
      data: result.all().map((asset) => this.serializeLibraryAsset(asset)),
      meta: result.getMeta(),
    }
  }

  async search(keyword: string, page: number = 1, limit: number = 20) {
    const result = await this.repository.search(keyword, page, limit)
    return {
      data: result.all().map((asset) => this.serializeLibraryAsset(asset)),
      meta: result.getMeta(),
    }
  }

  async show(id: number) {
    const asset = await this.repository.findByIdOrFail(id)
    return this.serializeLibraryAsset(asset)
  }

  async create(file: UploadableImage, displayName?: string, description?: string, tags?: string) {
    const mediaAsset = await this.mediaAssetService.saveImage(file)
    
    const libraryAsset = await this.repository.create({
      mediaAssetId: mediaAsset.id,
      displayName: displayName || mediaAsset.originalName,
      description: description || null,
      tags: tags || null,
    })

    return this.serializeLibraryAsset(libraryAsset)
  }

  async update(id: number, data: { displayName?: string; description?: string; tags?: string }) {
    const asset = await this.repository.update(id, data)
    return this.serializeLibraryAsset(asset)
  }

  async delete(id: number) {
    await this.repository.delete(id)
  }

  private serializeLibraryAsset(asset: LibraryAsset) {
    const appUrl = (process.env.APP_URL ?? 'http://localhost:3333').replace(/\/+$/, '')
    const mediaAsset = asset.mediaAsset
    
    return {
      id: asset.id,
      displayName: asset.displayName,
      description: asset.description,
      tags: asset.tags,
      createdAt: asset.createdAt.toISO(),
      mediaAsset: {
        id: mediaAsset.id,
        hash: mediaAsset.hash,
        name: mediaAsset.comfyName,
        filename: mediaAsset.comfyFilename,
        subfolder: mediaAsset.comfySubfolder,
        type: mediaAsset.comfyType,
        url: mediaAsset.comfyUrl,
        localUrl: `${appUrl}/api/v1/media/${mediaAsset.hash}`,
        originalName: mediaAsset.originalName,
        size: mediaAsset.size,
        extension: mediaAsset.extension,
      },
    }
  }
}
