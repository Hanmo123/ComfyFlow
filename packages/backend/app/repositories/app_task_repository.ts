import AppTask, {
  type AppTaskNodeRun,
  type AppTaskSnapshot,
  type AppTaskStatus,
} from '#models/app_task'
import { DateTime } from 'luxon'

export interface CreateAppTaskPayload {
  appId: number
  inputs: Record<string, unknown>
  variables: Record<string, unknown>
  appSnapshot: AppTaskSnapshot
}

export interface UpdateAppTaskPayload {
  status?: AppTaskStatus
  variables?: Record<string, unknown>
  outputs?: Record<string, unknown>
  nodeRuns?: AppTaskNodeRun[]
  waitingNodeId?: string | null
  error?: string | null
  startedAt?: DateTime | null
  completedAt?: DateTime | null
}

export default class AppTaskRepository {
  async create(payload: CreateAppTaskPayload) {
    return AppTask.create({
      appId: payload.appId,
      status: 'queued',
      inputs: payload.inputs,
      variables: payload.variables,
      outputs: {},
      appSnapshot: payload.appSnapshot,
      nodeRuns: [],
      waitingNodeId: null,
      error: null,
      startedAt: null,
      completedAt: null,
    })
  }

  async findForAppOrFail(appId: number, taskId: number) {
    return AppTask.query().where('app_id', appId).where('id', taskId).firstOrFail()
  }

  async findOrFail(id: number) {
    return AppTask.findOrFail(id)
  }

  async update(task: AppTask, payload: UpdateAppTaskPayload) {
    task.merge(payload)
    await task.save()
    return task
  }
}
