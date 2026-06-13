import LibraryAsset from '#models/library_asset'

export default class LibraryAssetRepository {
  async findAll(page: number = 1, limit: number = 20) {
    return await LibraryAsset.query()
      .preload('mediaAsset')
      .orderBy('created_at', 'desc')
      .paginate(page, limit)
  }

  async findById(id: number) {
    return await LibraryAsset.query().preload('mediaAsset').where('id', id).first()
  }

  async findByIdOrFail(id: number) {
    return await LibraryAsset.query().preload('mediaAsset').where('id', id).firstOrFail()
  }

  async create(data: {
    mediaAssetId: number
    displayName: string
    description?: string | null
    tags?: string | null
  }) {
    const asset = await LibraryAsset.create(data)
    await asset.load('mediaAsset')
    return asset
  }

  async update(
    id: number,
    data: { displayName?: string; description?: string | null; tags?: string | null }
  ) {
    const asset = await this.findByIdOrFail(id)
    asset.merge(data)
    await asset.save()
    return asset
  }

  async delete(id: number) {
    const asset = await this.findByIdOrFail(id)
    await asset.delete()
  }

  async search(keyword: string, page: number = 1, limit: number = 20) {
    return await LibraryAsset.query()
      .preload('mediaAsset')
      .where((query) => {
        query
          .whereLike('display_name', `%${keyword}%`)
          .orWhereLike('description', `%${keyword}%`)
          .orWhereLike('tags', `%${keyword}%`)
      })
      .orderBy('created_at', 'desc')
      .paginate(page, limit)
  }
}
