import WorkflowRepository from '#repositories/workflow_repository'
import type { WorkflowInputVariable, WorkflowOutputVariable, WorkflowStatus } from '#models/workflow'
import { Exception } from '@adonisjs/core/exceptions'
import { parseComfyApiJson } from './comfy_parser.js'

export interface UpdateWorkflowPayload {
  name?: string | null
  status?: WorkflowStatus
  inputs?: WorkflowInputVariable[]
  outputs?: WorkflowOutputVariable[]
}

export default class WorkflowService {
  constructor(private repository = new WorkflowRepository()) {}

  async list() {
    return this.repository.list()
  }

  async upload(rawJson: Record<string, unknown>) {
    const parsed = parseComfyApiJson(rawJson)
    const workflow = await this.repository.create({
      name: null,
      status: 'draft',
      rawJson,
      inputs: [],
      outputs: [],
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
      inputs: payload.inputs?.map((item) => ({ ...item, name: normalizeVariableName(item) })),
      outputs: payload.outputs?.map((item) => ({ ...item, name: normalizeVariableName(item) })),
    }
  }

  private ensureUniqueVariableNames(payload: UpdateWorkflowPayload) {
    const names = [...(payload.inputs ?? []), ...(payload.outputs ?? [])].map((item) => item.name)

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

function normalizeVariableName(item: WorkflowInputVariable | WorkflowOutputVariable) {
  const legacyLabel = (item as unknown as { label?: string }).label ?? ''
  return (item.name || legacyLabel).trim().replace(/^\$+/, '').trim()
}
