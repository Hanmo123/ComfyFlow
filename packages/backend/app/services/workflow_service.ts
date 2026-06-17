import WorkflowRepository from '#repositories/workflow_repository'
import type { WorkflowParameter, WorkflowResult, WorkflowStatus } from '#models/workflow'
import { Exception } from '@adonisjs/core/exceptions'
import { normalizeComfyApiJson, parseComfyApiJson } from './comfy_parser.js'

export interface UpdateWorkflowPayload {
  name?: string | null
  status?: WorkflowStatus
  parameters?: WorkflowParameter[]
  results?: WorkflowResult[]
}

export default class WorkflowService {
  constructor(private repository = new WorkflowRepository()) {}

  async list() {
    return this.repository.list()
  }

  async upload(rawJson: Record<string, unknown>) {
    const normalizedRawJson = normalizeComfyApiJson(rawJson)
    const parsed = parseComfyApiJson(normalizedRawJson)
    const workflow = await this.repository.create({
      name: null,
      status: 'draft',
      rawJson: normalizedRawJson,
      parameters: [],
      results: [],
    })

    return { workflow, ...parsed }
  }

  async show(id: number) {
    const workflow = await this.repository.findOrFail(id)
    return { workflow, ...parseComfyApiJson(workflow.rawJson) }
  }

  async update(id: number, payload: UpdateWorkflowPayload) {
    const workflow = await this.repository.findOrFail(id)
    const normalizedPayload = this.normalizePayload(payload)
    this.ensureUniqueVariableNames(normalizedPayload)
    const updated = await this.repository.update(workflow, normalizedPayload)
    return { workflow: updated, ...parseComfyApiJson(updated.rawJson) }
  }

  async delete(id: number) {
    const workflow = await this.repository.findOrFail(id)
    await this.repository.delete(workflow)
  }

  private normalizePayload(payload: UpdateWorkflowPayload): UpdateWorkflowPayload {
    return {
      ...payload,
      parameters: payload.parameters?.map((item) => normalizeParameter(item)),
      results: payload.results?.map((item) => ({ ...item, name: normalizeVariableName(item) })),
    }
  }

  private ensureUniqueVariableNames(payload: UpdateWorkflowPayload) {
    const names = [...(payload.parameters ?? []), ...(payload.results ?? [])].map((item) => item.name)

    if (names.some((name) => !name)) {
      throw new Exception('变量名不能为空', { status: 422, code: 'E_INVALID_WORKFLOW_VARIABLES' })
    }

    const seen = new Set<string>()
    for (const name of names) {
      if (seen.has(name)) {
        throw new Exception(`变量名 $${name} 重复`, {
          status: 422,
          code: 'E_INVALID_WORKFLOW_VARIABLES',
        })
      }
      seen.add(name)
    }
  }
}

function normalizeVariableName(item: WorkflowParameter | WorkflowResult) {
  const legacyLabel = (item as unknown as { label?: string }).label ?? ''
  return (item.name || legacyLabel).trim().replace(/^\$+/, '').trim()
}

function normalizeParameter(item: WorkflowParameter): WorkflowParameter {
  const normalized = { ...item, name: normalizeVariableName(item), type: normalizeWorkflowType(item.type) }
  if (normalized.default !== undefined) normalized.default = normalizeParameterDefault(normalized.type, normalized.default)
  return normalized
}

function normalizeWorkflowType(type: string) {
  return type === 'BOOLEAN' ? 'BOOL' : type
}

function normalizeParameterDefault(type: string, value: unknown) {
  if (type === 'INT') {
    if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value)
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number.parseInt(value, 10)
      if (Number.isFinite(parsed)) return parsed
    }
  }
  if (type === 'FLOAT') {
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number.parseFloat(value)
      if (Number.isFinite(parsed)) return parsed
    }
  }
  if (type === 'BOOL') {
    if (typeof value === 'boolean') return value
    if (typeof value === 'string') return value === 'true'
    return Boolean(value)
  }
  if (type === 'STRING') return value == null ? '' : String(value)
  return value
}
