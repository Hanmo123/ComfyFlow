import MediaAsset from '#models/media_asset'
import AppTask from '#models/app_task'
import LibraryAsset from '#models/library_asset'
import MediaAssetRepository from '#repositories/media_asset_repository'
import ComfyService from '#services/comfy_service'
import TaskRealtimeService from '#services/task_realtime_service'
import { storagePath } from '#config/paths'
import { Exception } from '@adonisjs/core/exceptions'
import { createHash } from 'node:crypto'
import { copyFile, mkdir, readFile, writeFile, unlink, access } from 'node:fs/promises'
import { constants } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

interface UploadableImage {
  clientName: string
  tmpPath?: string
  extname?: string
  type?: string
  subtype?: string
  size: number
  isValid?: boolean
}

export interface ComfyImageReference {
  name?: string
  filename: string
  subfolder?: string
  type?: string
  url: string
}

const UPLOAD_THUMBNAIL_SIZE = 256
const uploadThumbnailJobs = new Map<number, Promise<void>>()

export default class MediaAssetService {
  constructor(
    private repository = new MediaAssetRepository(),
    private comfyService = new ComfyService()
  ) {}

  async saveImage(file: UploadableImage) {
    if (!file.tmpPath || file.isValid === false) {
      throw new Exception('上传图片无效', { status: 422, code: 'E_INVALID_IMAGE_UPLOAD' })
    }

    const hash = await hashFile(file.tmpPath)
    const existing = await this.repository.findByHash(hash)
    const extension = normalizeExtension(file.extname, file.clientName)

    if (existing) {
      const fileExists = await checkFileExists(existing.localPath)
      if (!fileExists) {
        const localPath = await persistLocalImage(file.tmpPath, hash, existing.extension ?? extension)
        existing.merge({
          originalName: file.clientName,
          extension: existing.extension ?? extension,
          mimeType: file.type && file.subtype ? `${file.type}/${file.subtype}` : existing.mimeType,
          size: file.size,
          localPath,
        })
        await existing.save()
      }

      const asset = await this.ensureComfyUpload(hash)
      this.startUploadThumbnailJob(existing)
      return asset
    }

    const localPath = await persistLocalImage(file.tmpPath, hash, extension)
    const comfyFileName = extension ? `${hash}.${extension}` : hash
    const uploaded = await this.comfyService.uploadImage({
      clientName: comfyFileName,
      tmpPath: localPath,
      type: file.type,
      subtype: file.subtype,
      isValid: true,
    })

    const asset = await this.repository.create({
      hash,
      originalName: file.clientName,
      extension,
      mimeType: file.type && file.subtype ? `${file.type}/${file.subtype}` : null,
      size: file.size,
      localPath,
      comfyName: uploaded.name,
      comfyFilename: uploaded.filename,
      comfySubfolder: uploaded.subfolder,
      comfyType: uploaded.type,
      comfyUrl: uploaded.url,
    })

    this.startUploadThumbnailJob(asset)

    return serializeMediaAsset(asset)
  }

  async saveComfyImage(image: ComfyImageReference) {
    const response = await fetch(image.url)
    if (!response.ok) {
      throw new Exception(`下载 ComfyUI 输出图片失败：${response.statusText}`, {
        status: 502,
        code: 'E_COMFY_OUTPUT_DOWNLOAD_FAILED',
      })
    }

    const extension = normalizeExtension(undefined, image.filename)
    const buffer = Buffer.from(await response.arrayBuffer())
    const hash = hashBuffer(buffer)
    const existing = await this.repository.findByHash(hash)
    if (existing) {
      const fileExists = await checkFileExists(existing.localPath)
      if (!fileExists) {
        const localPath = await persistImageBuffer(buffer, hash, existing.extension ?? extension)
        existing.merge({
          originalName: image.filename,
          extension: existing.extension ?? extension,
          mimeType: response.headers.get('content-type') ?? existing.mimeType,
          size: buffer.byteLength,
          localPath,
        })
        await existing.save()
      }

      return mergeComfyImageReference(image, serializeMediaAsset(existing))
    }

    const localPath = await persistImageBuffer(buffer, hash, extension)
    const asset = await this.repository.create({
      hash,
      originalName: image.filename,
      extension,
      mimeType: response.headers.get('content-type'),
      size: buffer.byteLength,
      localPath,
      comfyName: image.name ?? image.filename,
      comfyFilename: image.filename,
      comfySubfolder: image.subfolder ?? '',
      comfyType: image.type ?? 'output',
      comfyUrl: image.url,
    })

    return serializeMediaAsset(asset)
  }

  async saveGeneratedImage(options: { buffer: Buffer; originalName: string; mimeType: string }) {
    const extension = normalizeExtension(undefined, options.originalName)
    const hash = hashBuffer(options.buffer)
    const existing = await this.repository.findByHash(hash)
    if (existing) {
      const fileExists = await checkFileExists(existing.localPath)
      if (!fileExists) {
        const localPath = await persistImageBuffer(options.buffer, hash, existing.extension ?? extension)
        existing.merge({
          originalName: options.originalName,
          extension: existing.extension ?? extension,
          mimeType: options.mimeType,
          size: options.buffer.byteLength,
          localPath,
        })
        await existing.save()
      }

      return serializeMediaAsset(existing)
    }

    const localPath = await persistImageBuffer(options.buffer, hash, extension)
    const uploaded = await this.comfyService.uploadImage({
      clientName: extension ? `${hash}.${extension}` : hash,
      tmpPath: localPath,
      type: options.mimeType.split('/')[0],
      subtype: options.mimeType.split('/')[1],
      isValid: true,
    })

    const asset = await this.repository.create({
      hash,
      originalName: options.originalName,
      extension,
      mimeType: options.mimeType,
      size: options.buffer.byteLength,
      localPath,
      comfyName: uploaded.name,
      comfyFilename: uploaded.filename,
      comfySubfolder: uploaded.subfolder,
      comfyType: uploaded.type,
      comfyUrl: uploaded.url,
    })

    return serializeMediaAsset(asset)
  }

  async localPathForHash(hash: string) {
    const asset = await this.repository.findByHashOrFail(hash)
    return asset.localPath
  }

  async existingLocalPathForHash(hash: string) {
    const asset = await this.repository.findByHash(hash)
    if (!asset) return null
    return (await checkFileExists(asset.localPath)) ? asset.localPath : null
  }

  async ensureComfyUpload(hash: string) {
    const asset = await this.repository.findByHashOrFail(hash)
    const fileExists = await checkFileExists(asset.localPath)
    if (!fileExists) {
      throw new Exception('媒体文件不存在，无法上传到 ComfyUI', {
        status: 404,
        code: 'E_MEDIA_FILE_NOT_FOUND',
      })
    }

    const extension = asset.extension ?? normalizeExtension(undefined, asset.originalName)
    const uploaded = await this.comfyService.uploadImage({
      clientName: extension ? `${asset.hash}.${extension}` : asset.hash,
      tmpPath: asset.localPath,
      type: asset.mimeType?.split('/')[0],
      subtype: asset.mimeType?.split('/')[1],
      isValid: true,
    })

    asset.merge({
      comfyName: uploaded.name,
      comfyFilename: uploaded.filename,
      comfySubfolder: uploaded.subfolder,
      comfyType: uploaded.type,
      comfyUrl: uploaded.url,
    })
    await asset.save()

    return serializeMediaAsset(asset)
  }

  async updateStarred(hash: string, isStarred: boolean) {
    const asset = await this.repository.updateStarred(hash, isStarred)
    return serializeMediaAsset(asset)
  }

  async listStarStates(hashes: string[]) {
    const uniqueHashes = [...new Set(hashes.filter(Boolean))]
    return this.repository.listStarStates(uniqueHashes)
  }

  async listProxiesByOriginalHashes(hashes: string[]) {
    const uniqueHashes = [...new Set(hashes.filter(Boolean))]
    const originalAssets = await this.repository.listByHashes(uniqueHashes)
    const proxyAssets = await this.repository.listCompressedProxiesByProxyForIds(originalAssets.map((asset) => asset.id))
    const proxyByOriginalId = new Map<number, MediaAsset>()

    for (const proxyAsset of proxyAssets) {
      if (!proxyAsset.proxyForId) continue
      const current = proxyByOriginalId.get(proxyAsset.proxyForId)
      if (!current || proxyAsset.size < current.size) proxyByOriginalId.set(proxyAsset.proxyForId, proxyAsset)
    }

    return Object.fromEntries(
      originalAssets.flatMap((asset) => {
        const proxy = proxyByOriginalId.get(asset.id)
        return proxy ? [[asset.hash, serializeMediaAsset(proxy)]] : []
      })
    )
  }

  async listThumbnailsByOriginalHashes(hashes: string[]) {
    const uniqueHashes = [...new Set(hashes.filter(Boolean))]
    const originalAssets = await this.repository.listByHashes(uniqueHashes)
    const thumbnails = await this.repository.listThumbnailsByProxyForIds(originalAssets.map((asset) => asset.id))
    const thumbnailByOriginalId = new Map<number, MediaAsset>()

    for (const thumbnail of thumbnails) {
      if (!thumbnail.proxyForId) continue
      const current = thumbnailByOriginalId.get(thumbnail.proxyForId)
      if (!current || thumbnail.size < current.size) thumbnailByOriginalId.set(thumbnail.proxyForId, thumbnail)
    }

    return Object.fromEntries(
      originalAssets.flatMap((asset) => {
        const thumbnail = thumbnailByOriginalId.get(asset.id)
        return thumbnail ? [[asset.hash, serializeMediaAsset(thumbnail)]] : []
      })
    )
  }

  async compressToAvif(options: {
    originalHash: string
    quality: number
    resizeMode: 'longest' | 'shortest' | 'none'
    maxSize?: number
    deleteOriginalFile: boolean
  }) {
    const originalAsset = await this.repository.findByHashOrFail(options.originalHash)

    const fileExists = await checkFileExists(originalAsset.localPath)
    if (!fileExists) {
      throw new Exception('原图文件不存在', {
        status: 404,
        code: 'E_ORIGINAL_FILE_NOT_FOUND',
      })
    }

    let sharpInstance = sharp(originalAsset.localPath)
    let needsResize = false

    if (options.resizeMode !== 'none' && options.maxSize && options.maxSize > 0) {
      const metadata = await sharpInstance.metadata()
      const { width = 0, height = 0 } = metadata

      if (options.resizeMode === 'longest') {
        const longest = Math.max(width, height)
        if (longest > options.maxSize) {
          needsResize = true
          sharpInstance = sharpInstance.resize({
            width: options.maxSize,
            height: options.maxSize,
            fit: 'inside',
            withoutEnlargement: true,
          })
        }
      } else if (options.resizeMode === 'shortest') {
        const shortest = Math.min(width, height)
        if (shortest > options.maxSize) {
          needsResize = true
          sharpInstance = sharpInstance.resize({
            width: options.maxSize,
            height: options.maxSize,
            fit: 'outside',
            withoutEnlargement: true,
          })
        }
      }
    }

    if (!needsResize) {
      return null
    }

    const compressedBuffer = await sharpInstance
      .avif({
        quality: Math.max(1, Math.min(100, options.quality)),
        effort: 4,
      })
      .toBuffer()

    const compressedHash = hashBuffer(compressedBuffer)
    const existing = await this.repository.findByHash(compressedHash)
    if (existing && existing.proxyForId === originalAsset.id) {
      return this.ensureComfyUpload(existing.hash)
    }

    const extension = 'avif'
    const localPath = await persistImageBuffer(compressedBuffer, compressedHash, extension)
    const uploaded = await this.comfyService.uploadImage({
      clientName: `${compressedHash}.${extension}`,
      tmpPath: localPath,
      type: 'image',
      subtype: extension,
      isValid: true,
    })

    const proxyAsset = await this.repository.create({
      hash: compressedHash,
      originalName: originalAsset.originalName.replace(/\.[^.]+$/, '.avif'),
      extension,
      mimeType: 'image/avif',
      size: compressedBuffer.byteLength,
      localPath,
      comfyName: uploaded.name,
      comfyFilename: uploaded.filename,
      comfySubfolder: uploaded.subfolder,
      comfyType: uploaded.type,
      comfyUrl: uploaded.url,
      proxyForId: originalAsset.id,
      proxyKind: 'compressed',
    })

    if (options.deleteOriginalFile) {
      try {
        await unlink(originalAsset.localPath)
      } catch (error) {
        console.warn(`无法删除原图文件: ${originalAsset.localPath}`, error)
      }
    }

    return serializeMediaAsset(proxyAsset)
  }

  async deleteOrphanedByHashes(hashes: string[]) {
    const uniqueHashes = [...new Set(hashes.filter(Boolean))]
    if (uniqueHashes.length === 0) return

    const directAssets = await this.repository.listByHashes(uniqueHashes)
    const proxyAssets = await this.repository.listByProxyForIds(directAssets.map((asset) => asset.id))
    const assetsById = new Map<number, MediaAsset>()
    for (const asset of [...directAssets, ...proxyAssets]) assetsById.set(asset.id, asset)

    const assets = [...assetsById.values()].sort((left, right) => {
      if (left.proxyForId && !right.proxyForId) return -1
      if (!left.proxyForId && right.proxyForId) return 1
      return right.id - left.id
    })

    for (const asset of assets) {
      if (!(await this.canDeleteAsset(asset))) continue
      await asset.delete()
      await deleteLocalFile(asset.localPath)
    }
  }

  private async canDeleteAsset(asset: MediaAsset) {
    if (asset.proxyForId) return this.canDeleteProxyAsset(asset)
    if (await isReferencedByLibrary(asset.id)) return false
    if (await isReferencedByTaskJson(asset.hash)) return false
    if (!asset.proxyForId && (await this.repository.hasProxyFor(asset.id))) return false
    return true
  }

  private async canDeleteProxyAsset(asset: MediaAsset) {
    if (!asset.proxyForId) return true
    const original = await MediaAsset.find(asset.proxyForId)
    if (!original) return true
    if (await isReferencedByLibrary(original.id)) return false
    if (await isReferencedByTaskJson(original.hash)) return false
    return true
  }

  private startUploadThumbnailJob(originalAsset: MediaAsset) {
    if (uploadThumbnailJobs.has(originalAsset.id)) return

    const job = this.ensureUploadThumbnail(originalAsset)
      .then((thumbnail) => {
        TaskRealtimeService.broadcastMediaThumbnailReady(originalAsset.hash, thumbnail)
      })
      .catch((error) => {
        console.warn(`上传缩略图生成失败: ${originalAsset.hash}`, error)
      })
      .finally(() => {
        uploadThumbnailJobs.delete(originalAsset.id)
      })

    uploadThumbnailJobs.set(originalAsset.id, job)
  }

  private async ensureUploadThumbnail(originalAsset: MediaAsset) {
    const existing = await this.repository.findThumbnailFor(originalAsset.id)
    if (existing && (await checkFileExists(existing.localPath))) return serializeMediaAsset(existing)

    const thumbnailBuffer = await sharp(originalAsset.localPath)
      .resize({
        width: UPLOAD_THUMBNAIL_SIZE,
        height: UPLOAD_THUMBNAIL_SIZE,
        fit: 'cover',
        withoutEnlargement: true,
      })
      .avif({ quality: 55, effort: 4 })
      .toBuffer()
    const thumbnailHash = hashBuffer(thumbnailBuffer)
    const extension = 'avif'
    const localPath = await persistImageBuffer(thumbnailBuffer, thumbnailHash, extension)
    const filename = `${thumbnailHash}.${extension}`

    if (existing) {
      existing.merge({
        hash: thumbnailHash,
        originalName: originalAsset.originalName.replace(/\.[^.]+$/, '.thumb.avif'),
        extension,
        mimeType: 'image/avif',
        size: thumbnailBuffer.byteLength,
        localPath,
        comfyName: filename,
        comfyFilename: filename,
        comfySubfolder: '',
        comfyType: 'thumbnail',
        comfyUrl: mediaUrl(thumbnailHash),
        proxyKind: 'thumbnail',
      })
      await existing.save()
      return serializeMediaAsset(existing)
    }

    const thumbnail = await this.repository.create({
      hash: thumbnailHash,
      originalName: originalAsset.originalName.replace(/\.[^.]+$/, '.thumb.avif'),
      extension,
      mimeType: 'image/avif',
      size: thumbnailBuffer.byteLength,
      localPath,
      comfyName: filename,
      comfyFilename: filename,
      comfySubfolder: '',
      comfyType: 'thumbnail',
      comfyUrl: mediaUrl(thumbnailHash),
      proxyForId: originalAsset.id,
      proxyKind: 'thumbnail',
    })

    return serializeMediaAsset(thumbnail)
  }
}

function serializeMediaAsset(asset: MediaAsset) {
  return {
    id: asset.id,
    hash: asset.hash,
    name: asset.comfyName,
    filename: asset.comfyFilename,
    subfolder: asset.comfySubfolder,
    type: asset.comfyType,
    url: asset.comfyUrl,
    localUrl: mediaUrl(asset.hash),
    originalName: asset.originalName,
    size: asset.size,
    proxyForId: asset.proxyForId,
    isStarred: asset.isStarred,
  }
}

function mediaUrl(hash: string) {
  const appUrl = (process.env.APP_URL ?? 'http://localhost:3333').replace(/\/+$/, '')
  return `${appUrl}/api/v1/media/${hash}`
}

async function hashFile(filePath: string) {
  const buffer = await readFile(filePath)
  return hashBuffer(buffer)
}

function hashBuffer(buffer: Buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

async function persistLocalImage(tmpPath: string, hash: string, extension: string | null) {
  const storageDir = storagePath('images', hash.slice(0, 2))
  await mkdir(storageDir, { recursive: true })

  const fileName = extension ? `${hash}.${extension}` : hash
  const localPath = path.join(storageDir, fileName)
  await copyFile(tmpPath, localPath)
  return localPath
}

async function persistImageBuffer(buffer: Buffer, hash: string, extension: string | null) {
  const storageDir = storagePath('images', hash.slice(0, 2))
  await mkdir(storageDir, { recursive: true })

  const fileName = extension ? `${hash}.${extension}` : hash
  const localPath = path.join(storageDir, fileName)
  await writeFile(localPath, buffer)
  return localPath
}

async function deleteLocalFile(filePath: string) {
  try {
    await unlink(filePath)
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return
    console.warn(`无法删除媒体文件: ${filePath}`, error)
  }
}

async function isReferencedByLibrary(assetId: number) {
  const asset = await LibraryAsset.query().where('media_asset_id', assetId).first()
  return Boolean(asset)
}

async function isReferencedByTaskJson(hash: string) {
  const pattern = `%${hash}%`
  const task = await AppTask.query()
    .where('inputs', 'like', pattern)
    .orWhere('variables', 'like', pattern)
    .orWhere('outputs', 'like', pattern)
    .orWhere('node_runs', 'like', pattern)
    .first()
  return Boolean(task)
}

function mergeComfyImageReference(image: ComfyImageReference, asset: ReturnType<typeof serializeMediaAsset>) {
  return {
    ...image,
    hash: asset.hash,
    id: asset.id,
    localUrl: asset.localUrl,
    originalName: asset.originalName,
    size: asset.size,
  }
}

function normalizeExtension(extname: string | undefined, clientName: string) {
  const value = extname || path.extname(clientName).replace(/^\./, '')
  return value ? value.toLowerCase() : null
}

async function checkFileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK)
    return true
  } catch {
    return false
  }
}
