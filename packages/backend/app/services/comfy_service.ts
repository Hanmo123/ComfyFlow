import type { WorkflowResult } from '#models/workflow'
import { Exception } from '@adonisjs/core/exceptions'

interface PromptResponse {
  prompt_id?: string
  error?: unknown
}

interface ComfyHistoryItem {
  status?: { completed?: boolean; status_str?: string }
  outputs?: Record<string, Record<string, unknown>>
}

export default class ComfyService {
  private baseUrl = (process.env.COMFY_BASE_URL ?? 'http://127.0.0.1:8188').replace(/\/+$/, '')

  async runWorkflow(prompt: Record<string, unknown>, results: WorkflowResult[]) {
    const promptId = await this.queuePrompt(prompt)
    const history = await this.waitForHistory(promptId)
    return extractWorkflowResults(history.outputs ?? {}, results, this.baseUrl)
  }

  private async queuePrompt(prompt: Record<string, unknown>) {
    const response = await fetch(`${this.baseUrl}/prompt`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt, client_id: `comfyui-tools-${Date.now()}` }),
    })

    const body = (await response.json().catch(() => ({}))) as PromptResponse
    if (!response.ok || !body.prompt_id) {
      throw new Exception(`ComfyUI 提交失败：${formatComfyError(body.error) || response.statusText}`, {
        status: 502,
        code: 'E_COMFY_PROMPT_FAILED',
      })
    }

    return body.prompt_id
  }

  private async waitForHistory(promptId: string) {
    const deadline = Date.now() + 30 * 60 * 1000
    while (Date.now() < deadline) {
      const response = await fetch(`${this.baseUrl}/history/${promptId}`)
      if (!response.ok) {
        throw new Exception(`ComfyUI 查询任务失败：${response.statusText}`, {
          status: 502,
          code: 'E_COMFY_HISTORY_FAILED',
        })
      }

      const history = (await response.json()) as Record<string, ComfyHistoryItem>
      const item = history[promptId]
      if (item?.status?.completed) return item
      if (item?.status?.status_str === 'error') {
        throw new Exception('ComfyUI 工作流执行失败', { status: 502, code: 'E_COMFY_EXECUTION_FAILED' })
      }

      await sleep(1000)
    }

    throw new Exception('ComfyUI 工作流执行超时', { status: 504, code: 'E_COMFY_TIMEOUT' })
  }
}

function extractWorkflowResults(outputs: Record<string, Record<string, unknown>>, results: WorkflowResult[], baseUrl: string) {
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
  if (typeof error === 'object' && 'message' in error) return String((error as { message?: unknown }).message)
  return JSON.stringify(error)
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
