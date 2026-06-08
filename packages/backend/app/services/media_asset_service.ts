import MediaAsset from '#models/media_asset'
import MediaAssetRepository from '#repositories/media_asset_repository'
import ComfyService from '#services/comfy_service'
import { Exception } from '@adonisjs/core/exceptions'
import app from '@adonisjs/core/services/app'
import { createHash } from 'node:crypto'
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

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
    if (existing) return serializeMediaAsset(existing)

    const extension = normalizeExtension(file.extname, file.clientName)
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

    const buffer = Buffer.from(await response.arrayBuffer())
    const hash = hashBuffer(buffer)
    const existing = await this.repository.findByHash(hash)
    if (existing) return mergeComfyImageReference(image, serializeMediaAsset(existing))

    const extension = normalizeExtension(undefined, image.filename)
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

  async localPathForHash(hash: string) {
    const asset = await this.repository.findByHashOrFail(hash)
    return asset.localPath
  }
}

function serializeMediaAsset(asset: MediaAsset) {
  const appUrl = (process.env.APP_URL ?? 'http://localhost:3333').replace(/\/+$/, '')
  return {
    id: asset.id,
    hash: asset.hash,
    name: asset.comfyName,
    filename: asset.comfyFilename,
    subfolder: asset.comfySubfolder,
    type: asset.comfyType,
    url: asset.comfyUrl,
    localUrl: `${appUrl}/api/v1/media/${asset.hash}`,
    originalName: asset.originalName,
    size: asset.size,
  }
}

async function hashFile(filePath: string) {
  const buffer = await readFile(filePath)
  return hashBuffer(buffer)
}

function hashBuffer(buffer: Buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

async function persistLocalImage(tmpPath: string, hash: string, extension: string | null) {
  const storageDir = app.makePath('storage', 'images', hash.slice(0, 2))
  await mkdir(storageDir, { recursive: true })

  const fileName = extension ? `${hash}.${extension}` : hash
  const localPath = path.join(storageDir, fileName)
  await copyFile(tmpPath, localPath)
  return localPath
}

async function persistImageBuffer(buffer: Buffer, hash: string, extension: string | null) {
  const storageDir = app.makePath('storage', 'images', hash.slice(0, 2))
  await mkdir(storageDir, { recursive: true })

  const fileName = extension ? `${hash}.${extension}` : hash
  const localPath = path.join(storageDir, fileName)
  await writeFile(localPath, buffer)
  return localPath
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
