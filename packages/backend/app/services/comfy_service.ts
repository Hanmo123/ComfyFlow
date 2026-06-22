import type { WorkflowResult } from '#models/workflow'
import { Exception } from '@adonisjs/core/exceptions'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import WebSocket from 'ws'

interface UploadableImage {
  clientName: string
  tmpPath?: string
  type?: string
  subtype?: string
  isValid?: boolean
}

interface ComfyUploadImageResponse {
  name?: string
  filename?: string
  subfolder?: string
  type?: string
}

interface PromptResponse {
  prompt_id?: string
  error?: unknown
}

interface ComfyHistoryItem {
  status?: { completed?: boolean; status_str?: string }
  outputs?: Record<string, Record<string, unknown>>
}

interface ComfyWebSocketMessage {
  type?: string
  data?: {
    prompt_id?: string
    node?: string | null
    exception_message?: string
    exception_type?: string
  }
}

interface ComfyLoraCache {
  items: string[]
  fetchedAt: number
  expiresAt: number
}

const LORA_CACHE_TTL_MS = 10 * 60 * 1000

export default class ComfyService {
  private static loraCache: ComfyLoraCache | null = null

  private baseUrl = (process.env.COMFY_BASE_URL ?? 'http://127.0.0.1:8188').replace(/\/+$/, '')

  async uploadImage(file: UploadableImage) {
    if (!file.tmpPath || file.isValid === false) {
      throw new Exception('上传图片无效', { status: 422, code: 'E_INVALID_IMAGE_UPLOAD' })
    }

    const buffer = await readFile(file.tmpPath)
    const contentType =
      file.type && file.subtype ? `${file.type}/${file.subtype}` : 'application/octet-stream'
    const formData = new FormData()
    formData.append(
      'image',
      new Blob([new Uint8Array(buffer)], { type: contentType }),
      file.clientName
    )
    formData.append('type', 'input')
    formData.append('overwrite', 'true')

    const response = await fetch(`${this.baseUrl}/upload/image`, {
      method: 'POST',
      body: formData,
    })

    const body = (await response.json().catch(() => ({}))) as ComfyUploadImageResponse
    const name = body.name ?? body.filename
    if (!response.ok || !name) {
      throw new Exception(`ComfyUI 上传图片失败：${response.statusText}`, {
        status: 502,
        code: 'E_COMFY_UPLOAD_IMAGE_FAILED',
      })
    }

    const type = body.type ?? 'input'
    const params = new URLSearchParams({ filename: name, subfolder: body.subfolder ?? '', type })
    return {
      name,
      filename: name,
      subfolder: body.subfolder ?? '',
      type,
      url: `${this.baseUrl}/view?${params.toString()}`,
    }
  }

  async runWorkflow(prompt: Record<string, unknown>, results: WorkflowResult[]) {
    const clientId = `comfyui-tools-${randomUUID()}`
    const socket = await this.connectSocket(clientId)
    try {
      const promptId = await this.queuePrompt(prompt, clientId)
      const history = await this.waitForExecution(socket, promptId)
      return extractWorkflowResults(history.outputs ?? {}, results, this.baseUrl)
    } finally {
      socket.close()
    }
  }

  async listLoras(options: { refresh?: boolean } = {}) {
    const now = Date.now()
    const cache = ComfyService.loraCache
    if (!options.refresh && cache && cache.expiresAt > now) {
      return formatLoraListResponse(cache, true)
    }

    const items = await this.fetchLoraNames()
    const nextCache = { items, fetchedAt: now, expiresAt: now + LORA_CACHE_TTL_MS }
    ComfyService.loraCache = nextCache
    return formatLoraListResponse(nextCache, false)
  }

  private async fetchLoraNames() {
    const modelList = normalizeLoraNames(await this.tryFetchJson('/models/loras'))
    if (modelList) return modelList

    const modelOnlyInfo = await this.tryFetchJson('/object_info/LoraLoaderModelOnly')
    const modelOnlyList = extractLoraNamesFromObjectInfo(modelOnlyInfo, 'LoraLoaderModelOnly')
    if (modelOnlyList) return modelOnlyList

    const loraLoaderInfo = await this.tryFetchJson('/object_info/LoraLoader')
    const loraLoaderList = extractLoraNamesFromObjectInfo(loraLoaderInfo, 'LoraLoader')
    if (loraLoaderList) return loraLoaderList

    throw new Exception('ComfyUI 获取 LoRA 列表失败', {
      status: 502,
      code: 'E_COMFY_LORAS_FAILED',
    })
  }

  private async tryFetchJson(path: string) {
    try {
      const response = await fetch(`${this.baseUrl}${path}`)
      if (!response.ok) return null
      return response.json().catch(() => null)
    } catch (error) {
      // 网络错误或连接失败，返回 null
      return null
    }
  }

  private async queuePrompt(prompt: Record<string, unknown>, clientId: string) {
    const response = await fetch(`${this.baseUrl}/prompt`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt, client_id: clientId }),
    })

    const body = (await response.json().catch(() => ({}))) as PromptResponse
    if (!response.ok || !body.prompt_id) {
      throw new Exception(
        `ComfyUI 提交失败：${formatComfyError(body.error) || response.statusText}`,
        {
          status: 502,
          code: 'E_COMFY_PROMPT_FAILED',
        }
      )
    }

    return body.prompt_id
  }

  private async connectSocket(clientId: string) {
    return new Promise<WebSocket>((resolve, reject) => {
      const socket = new WebSocket(this.comfyWebSocketUrl(clientId))
      const timer = setTimeout(() => {
        socket.terminate()
        reject(
          new Exception('ComfyUI WebSocket 连接超时', { status: 504, code: 'E_COMFY_WS_TIMEOUT' })
        )
      }, 30_000)

      socket.once('open', () => {
        clearTimeout(timer)
        resolve(socket)
      })
      socket.once('error', (error) => {
        clearTimeout(timer)
        reject(
          new Exception(`ComfyUI WebSocket 连接失败：${formatErrorMessage(error)}`, {
            status: 502,
            code: 'E_COMFY_WS_FAILED',
          })
        )
      })
    })
  }

  private comfyWebSocketUrl(clientId: string) {
    const baseUrl = this.baseUrl.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:')
    return `${baseUrl}/ws?clientId=${encodeURIComponent(clientId)}`
  }

  private async waitForExecution(socket: WebSocket, promptId: string) {
    const deadline = Date.now() + 30 * 60 * 1000
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => {
          cleanup()
          reject(new Exception('ComfyUI 工作流执行超时', { status: 504, code: 'E_COMFY_TIMEOUT' }))
        },
        Math.max(0, deadline - Date.now())
      )

      const cleanup = () => {
        clearTimeout(timer)
        socket.off('message', handleMessage)
        socket.off('close', handleClose)
        socket.off('error', handleError)
      }

      const handleMessage = (data: WebSocket.RawData) => {
        const message = parseComfyMessage(data)
        if (!message) return
        if (isPromptExecutionMessage(message) && message.data?.prompt_id !== promptId) return

        if (message.type === 'execution_error' || message.type === 'execution_interrupted') {
          cleanup()
          reject(
            new Exception(`ComfyUI 工作流执行失败：${formatComfyExecutionError(message)}`, {
              status: 502,
              code: 'E_COMFY_EXECUTION_FAILED',
            })
          )
          return
        }

        if (message.type === 'execution_success') {
          cleanup()
          resolve()
          return
        }

        if (message.type === 'executing' && message.data?.node === null) {
          cleanup()
          resolve()
        }
      }

      const handleClose = () => {
        cleanup()
        reject(
          new Exception('ComfyUI WebSocket 连接已关闭', { status: 502, code: 'E_COMFY_WS_CLOSED' })
        )
      }

      const handleError = (error: Error) => {
        cleanup()
        reject(
          new Exception(`ComfyUI WebSocket 错误：${formatErrorMessage(error)}`, {
            status: 502,
            code: 'E_COMFY_WS_FAILED',
          })
        )
      }

      socket.on('message', handleMessage)
      socket.on('close', handleClose)
      socket.on('error', handleError)
    })

    return this.fetchHistory(promptId)
  }

  private async fetchHistory(promptId: string) {
    const response = await fetch(`${this.baseUrl}/history/${promptId}`)
    if (!response.ok) {
      throw new Exception(`ComfyUI 查询任务失败：${response.statusText}`, {
        status: 502,
        code: 'E_COMFY_HISTORY_FAILED',
      })
    }

    const history = (await response.json()) as Record<string, ComfyHistoryItem>
    const item = history[promptId]
    if (item?.status?.status_str === 'error') {
      throw new Exception('ComfyUI 工作流执行失败', {
        status: 502,
        code: 'E_COMFY_EXECUTION_FAILED',
      })
    }
    if (!item) {
      throw new Exception('ComfyUI 未返回任务历史', {
        status: 502,
        code: 'E_COMFY_HISTORY_MISSING',
      })
    }
    return item
  }
}

function extractWorkflowResults(
  outputs: Record<string, Record<string, unknown>>,
  results: WorkflowResult[],
  baseUrl: string
) {
  const extracted: Record<string, unknown> = {}
  for (const result of results) {
    const nodeOutput = outputs[result.nodeId]
    extracted[result.key] = nodeOutput ? normalizeNodeOutput(nodeOutput, baseUrl) : null
  }
  return extracted
}

function normalizeNodeOutput(output: Record<string, unknown>, baseUrl: string) {
  const images = output.images
  if (Array.isArray(images)) {
    return images.map((image) => {
      if (!image || typeof image !== 'object') return image
      const item = image as Record<string, string>
      const params = new URLSearchParams({
        filename: item.filename ?? '',
        subfolder: item.subfolder ?? '',
        type: item.type ?? 'output',
      })
      return { ...item, url: `${baseUrl}/view?${params.toString()}` }
    })
  }

  const entries = Object.entries(output)
  if (entries.length === 1) return entries[0][1]
  return output
}

function formatComfyError(error: unknown) {
  if (!error) return ''
  if (typeof error === 'string') return error
  if (typeof error === 'object' && 'message' in error)
    return String((error as { message?: unknown }).message)
  return JSON.stringify(error)
}

function parseComfyMessage(data: WebSocket.RawData): ComfyWebSocketMessage | null {
  try {
    const text = Array.isArray(data) ? Buffer.concat(data).toString('utf8') : data.toString()
    const parsed = JSON.parse(text) as unknown
    return parsed && typeof parsed === 'object' ? (parsed as ComfyWebSocketMessage) : null
  } catch {
    return null
  }
}

function formatComfyExecutionError(message: ComfyWebSocketMessage) {
  return message.data?.exception_message ?? message.data?.exception_type ?? '执行失败'
}

function isPromptExecutionMessage(message: ComfyWebSocketMessage) {
  return ['executing', 'execution_success', 'execution_error', 'execution_interrupted'].includes(
    message.type ?? ''
  )
}

function formatErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function normalizeLoraNames(value: unknown): string[] | null {
  if (Array.isArray(value)) return uniqueStrings(value)
  if (!value || typeof value !== 'object') return null

  const record = value as Record<string, unknown>
  for (const key of ['items', 'models', 'loras', 'files']) {
    const names = normalizeLoraNames(record[key])
    if (names) return names
  }
  return null
}

function extractLoraNamesFromObjectInfo(value: unknown, classType: string) {
  if (!value || typeof value !== 'object') return null
  const nodeInfo = (value as Record<string, unknown>)[classType]
  if (!nodeInfo || typeof nodeInfo !== 'object') return null

  const input = (nodeInfo as Record<string, unknown>).input
  if (!input || typeof input !== 'object') return null
  const required = (input as Record<string, unknown>).required
  if (!required || typeof required !== 'object') return null
  const loraName = (required as Record<string, unknown>).lora_name
  if (!Array.isArray(loraName)) return null

  return normalizeLoraNames(loraName[0])
}

function uniqueStrings(value: unknown[]) {
  return [...new Set(value.filter((item): item is string => typeof item === 'string'))].sort()
}

function formatLoraListResponse(cache: ComfyLoraCache, cached: boolean) {
  return {
    items: cache.items,
    cached,
    fetchedAt: new Date(cache.fetchedAt).toISOString(),
    expiresAt: new Date(cache.expiresAt).toISOString(),
  }
}
