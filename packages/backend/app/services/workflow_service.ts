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
      parameters: payload.parameters?.map((item) => ({ ...item, name: normalizeVariableName(item) })),
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
