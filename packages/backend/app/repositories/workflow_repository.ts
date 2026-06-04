import Workflow, {
  type WorkflowParameter,
  type WorkflowResult,
  type WorkflowStatus,
} from '#models/workflow'

export interface CreateWorkflowPayload {
  name?: string | null
  status: WorkflowStatus
  rawJson: Record<string, unknown>
  parameters?: WorkflowParameter[]
  results?: WorkflowResult[]
}

export interface UpdateWorkflowPayload {
  name?: string | null
  status?: WorkflowStatus
  parameters?: WorkflowParameter[]
  results?: WorkflowResult[]
}

export default class WorkflowRepository {
  async list() {
    return Workflow.query().orderBy('updated_at', 'desc')
  }

  async findOrFail(id: number) {
    return Workflow.findOrFail(id)
  }

  async create(payload: CreateWorkflowPayload) {
    return Workflow.create({
      name: payload.name ?? null,
      status: payload.status,
      rawJson: payload.rawJson,
      parameters: payload.parameters ?? [],
      results: payload.results ?? [],
    })
  }

  async update(workflow: Workflow, payload: UpdateWorkflowPayload) {
    workflow.merge(payload)
    await workflow.save()
    return workflow
  }

  async delete(workflow: Workflow) {
    await workflow.delete()
  }
}
