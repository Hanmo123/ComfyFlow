export interface LibraryAsset {
  id: number
  displayName: string
  description: string | null
  tags: string | null
  createdAt: string
  mediaAsset: {
    id: number
    hash: string
    name: string
    filename: string
    subfolder: string
    type: string
    url: string
    localUrl: string
    originalName: string
    size: number
    extension: string | null
    isStarred: boolean
  }
}

export interface LibraryAssetListResponse {
  data: LibraryAsset[]
  meta: {
    total: number
    perPage: number
    currentPage: number
    lastPage: number
    firstPage: number
    firstPageUrl: string
    lastPageUrl: string
    nextPageUrl: string | null
    previousPageUrl: string | null
  }
}

export interface CreateLibraryAssetInput {
  file: File
  displayName?: string
  description?: string
  tags?: string
}

export interface UpdateLibraryAssetInput {
  displayName?: string
  description?: string
  tags?: string
}
