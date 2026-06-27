import type {
  LibraryAsset,
  LibraryAssetListResponse,
  CreateLibraryAssetInput,
  UpdateLibraryAssetInput,
} from '~/lib/library'
import { apiBase } from '~/lib/api'

export function useLibraryApi() {
  const baseUrl = apiBase()

  async function listLibraryAssets(params?: {
    page?: number
    limit?: number
    keyword?: string
  }): Promise<LibraryAssetListResponse> {
    const query = new URLSearchParams()
    if (params?.page) query.set('page', params.page.toString())
    if (params?.limit) query.set('limit', params.limit.toString())
    if (params?.keyword) query.set('keyword', params.keyword)

    const url = `${baseUrl}/library${query.toString() ? '?' + query.toString() : ''}`
    const response = await fetch(url)
    if (!response.ok) throw new Error('获取素材库列表失败')
    return await response.json()
  }

  async function getLibraryAsset(id: number): Promise<LibraryAsset> {
    const response = await fetch(`${baseUrl}/library/${id}`)
    if (!response.ok) throw new Error('获取素材详情失败')
    return await response.json()
  }

  async function createLibraryAsset(input: CreateLibraryAssetInput): Promise<LibraryAsset> {
    const formData = new FormData()
    formData.append('file', input.file)
    if (input.displayName) formData.append('displayName', input.displayName)
    if (input.description) formData.append('description', input.description)
    if (input.tags) formData.append('tags', input.tags)

    const response = await fetch(`${baseUrl}/library`, {
      method: 'POST',
      body: formData,
    })
    if (!response.ok) throw new Error('上传素材失败')
    return await response.json()
  }

  async function updateLibraryAsset(id: number, input: UpdateLibraryAssetInput): Promise<LibraryAsset> {
    const response = await fetch(`${baseUrl}/library/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!response.ok) throw new Error('更新素材失败')
    return await response.json()
  }

  async function deleteLibraryAsset(id: number): Promise<void> {
    const response = await fetch(`${baseUrl}/library/${id}`, {
      method: 'DELETE',
    })
    if (!response.ok) throw new Error('删除素材失败')
  }

  async function updateMediaAssetStar(hash: string, isStarred: boolean) {
    const response = await fetch(`${baseUrl}/media/${hash}/star`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isStarred }),
    })
    if (!response.ok) throw new Error('更新星标失败')
    return await response.json()
  }

  async function getMediaAssetStarStates(hashes: string[]) {
    const response = await fetch(`${baseUrl}/media/star-states`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hashes }),
    })
    if (!response.ok) throw new Error('获取星标状态失败')
    return await response.json() as Record<string, boolean>
  }

  async function getMediaAssetProxies(hashes: string[]) {
    const response = await fetch(`${baseUrl}/media/proxies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hashes }),
    })
    if (!response.ok) throw new Error('获取媒体代理图失败')
    return await response.json() as Record<string, { hash: string; url: string; localUrl: string }>
  }

  async function getMediaAssetThumbnails(hashes: string[]) {
    const response = await fetch(`${baseUrl}/media/thumbnails`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hashes }),
    })
    if (!response.ok) throw new Error('获取媒体缩略图失败')
    return await response.json() as Record<string, { hash: string; url: string; localUrl: string }>
  }

  return {
    listLibraryAssets,
    getLibraryAsset,
    createLibraryAsset,
    updateLibraryAsset,
    deleteLibraryAsset,
    updateMediaAssetStar,
    getMediaAssetStarStates,
    getMediaAssetProxies,
    getMediaAssetThumbnails,
  }
}
