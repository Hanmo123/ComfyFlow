import app from '@adonisjs/core/services/app'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import path from 'node:path'

const PUBLIC_ROOT = app.makePath('public')
const INDEX_FILE = path.join(PUBLIC_ROOT, 'index.html')

const MIME_TYPES: Record<string, string> = {
  '.avif': 'image/avif',
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

export default class FrontendStaticMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    if (!app.inProduction || !['GET', 'HEAD'].includes(ctx.request.method())) {
      return next()
    }

    const requestPath = pathnameFromRequest(ctx.request.url())
    if (requestPath.startsWith('/api/')) return next()

    const filePath = await resolveStaticFile(requestPath)
    if (!filePath) return next()

    ctx.response.header('content-type', MIME_TYPES[path.extname(filePath)] ?? 'application/octet-stream')
    if (ctx.request.method() === 'HEAD') return ctx.response.status(200).send('')

    return ctx.response.stream(createReadStream(filePath))
  }
}

function pathnameFromRequest(url: string) {
  const rawPath = url.split('?')[0] || '/'

  try {
    return decodeURIComponent(rawPath)
  } catch {
    return rawPath
  }
}

async function resolveStaticFile(requestPath: string) {
  const requestedFile = path.resolve(PUBLIC_ROOT, `.${requestPath}`)
  if (!requestedFile.startsWith(`${PUBLIC_ROOT}${path.sep}`) && requestedFile !== PUBLIC_ROOT) {
    return null
  }

  const existingFile = await readableFile(requestedFile)
  if (existingFile) return existingFile

  if (path.extname(requestPath)) return null
  return readableFile(INDEX_FILE)
}

async function readableFile(filePath: string) {
  try {
    const fileStat = await stat(filePath)
    return fileStat.isFile() ? filePath : null
  } catch {
    return null
  }
}
