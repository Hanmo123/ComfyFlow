import WorkflowRepository from '#repositories/workflow_repository'
import type { WorkflowInputVariable, WorkflowOutputVariable, WorkflowStatus } from '#models/workflow'
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
    const updated = await this.repository.update(workflow, payload)
    return { workflow: updated, ...parseComfyApiJson(updated.rawJson) }
  }

  async delete(id: number) {
    const workflow = await this.repository.findOrFail(id)
    await this.repository.delete(workflow)
  }
}
