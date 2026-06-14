import type { AppGraphNode } from '#models/app'
import type AppTask from '#models/app_task'
import type { AppTaskNodeStatus } from '#models/app_task'
import type Workflow from '#models/workflow'
import type { UpdateAppTaskPayload } from '#repositories/app_task_repository'
import AppTaskService from '#services/app_task_service'
import { test } from '@japa/runner'

test.group('AppTaskService', () => {
  test('continues independent branches after a manual gate starts waiting', async ({ assert }) => {
    const task = createQueuedTask()
    const workflowRuns: unknown[] = []
    const service = createService(task, workflowRuns)

    await executeTask(service, task.id)

    assert.equal(task.status, 'waiting')
    assert.equal(task.waitingNodeId, 'gate')
    assert.equal(workflowRuns.length, 1)
    assert.equal(task.variables.normal_result, 'normal value')
    assert.equal(task.outputs.normal_result, 'normal value')
    assert.equal(nodeStatus(task, 'gate'), 'waiting')
    assert.equal(nodeStatus(task, 'normal_workflow'), 'completed')
    assert.equal(nodeStatus(task, 'normal_output'), 'completed')
    assert.equal(nodeStatus(task, 'blocked_output'), undefined)
  })

  test('completes blocked downstream nodes after the manual gate resumes', async ({ assert }) => {
    const task = createQueuedTask()
    const workflowRuns: unknown[] = []
    const service = createService(task, workflowRuns)

    await executeTask(service, task.id)
    const gateRun = task.nodeRuns.find((nodeRun) => nodeRun.nodeId === 'gate')
    if (!gateRun) throw new Error('Expected gate node run to exist')
    gateRun.status = 'completed'
    gateRun.completedAt = new Date().toISOString()
    task.status = 'queued'
    task.waitingNodeId = null

    await executeTask(service, task.id)

    assert.equal(task.status, 'completed')
    assert.equal(workflowRuns.length, 1)
    assert.equal(nodeStatus(task, 'blocked_output'), 'completed')
  })

  test('resets an existing task with replacement inputs when retrying the whole task', async ({
    assert,
  }) => {
    const task = createRetryableTask()
    const service = createService(task, [])
    let enqueuedTaskId: number | null = null
    ;(service as unknown as { enqueue(taskId: number): void }).enqueue = (taskId) => {
      enqueuedTaskId = taskId
    }

    await service.retryTask(task.id, { prompt: 'new prompt' })

    assert.equal(enqueuedTaskId, task.id)
    assert.equal(task.status, 'queued')
    assert.deepEqual(task.inputs, { prompt: 'new prompt' })
    assert.deepEqual(task.variables, { prompt: 'new prompt' })
    assert.deepEqual(task.outputs, {})
    assert.deepEqual(task.nodeRuns, [])
    assert.equal(task.waitingNodeId, null)
    assert.equal(task.error, null)
    assert.equal(task.startedAt, null)
    assert.equal(task.completedAt, null)
  })

  test('runs the false branch when conditional input is false string', async ({ assert }) => {
    const task = createConditionalTask('false')
    const service = createService(task, [])

    await executeTask(service, task.id)

    assert.equal(task.status, 'completed')
    assert.equal(nodeStatus(task, 'true_output'), 'skipped')
    assert.equal(nodeStatus(task, 'false_output'), 'completed')
    assert.deepEqual(task.outputs, { false_result: 'false branch' })
  })
})

function createService(task: AppTask, workflowRuns: unknown[]) {
  type AppTaskServiceArgs = ConstructorParameters<typeof AppTaskService>
  const taskRepository = {
    async findOrFail(id: number) {
      if (id !== task.id) throw new Error(`Unexpected task id ${id}`)
      return task
    },
    async update(receivedTask: AppTask, payload: UpdateAppTaskPayload) {
      Object.assign(receivedTask, payload)
      return receivedTask
    },
  }
  const workflowRepository = {
    async findOrFail(id: number) {
      return {
        id,
        name: 'normal workflow',
        status: 'saved',
        rawJson: {},
        parameters: [],
        results: [{ key: 'result', nodeId: '1', slotIndex: 0, name: 'Result', type: 'STRING' }],
      } as unknown as Workflow
    },
  }
  const comfyService = {
    async runWorkflow(prompt: Record<string, unknown>) {
      workflowRuns.push(prompt)
      return { result: 'normal value' }
    },
  }

  return new AppTaskService(
    {} as AppTaskServiceArgs[0],
    taskRepository as AppTaskServiceArgs[1],
    workflowRepository as AppTaskServiceArgs[2],
    {} as AppTaskServiceArgs[3],
    comfyService as unknown as AppTaskServiceArgs[4],
    {} as AppTaskServiceArgs[5]
  )
}

async function executeTask(service: AppTaskService, taskId: number) {
  await (service as unknown as { execute(taskId: number): Promise<void> }).execute(taskId)
}

function createQueuedTask() {
  const nodes: AppGraphNode[] = [
    { id: 'input', type: 'input_collect', position: { x: 0, y: 0 }, data: {} },
    {
      id: 'gate',
      type: 'manual_gate',
      position: { x: 200, y: -100 },
      data: { title: '人工确认', description: '', displayVars: [] },
    },
    {
      id: 'normal_workflow',
      type: 'workflow_run',
      position: { x: 200, y: 100 },
      data: {
        workflowId: 1,
        inputBindings: {},
        outputAssignments: { result: 'normal_result' },
      },
    },
    {
      id: 'blocked_output',
      type: 'output_text',
      position: { x: 420, y: -100 },
      data: { varKey: 'blocked_result' },
    },
    {
      id: 'normal_output',
      type: 'output_text',
      position: { x: 420, y: 100 },
      data: { varKey: 'normal_result' },
    },
  ]

  return {
    id: 1,
    appId: 1,
    taskGroupId: 1,
    status: 'queued',
    inputs: {},
    variables: {},
    outputs: {},
    appSnapshot: {
      id: 1,
      name: 'parallel manual gate app',
      variables: [
        { key: 'normal_result', name: 'normal_result', type: 'STRING', source: 'computed' },
        { key: 'blocked_result', name: 'blocked_result', type: 'STRING', source: 'computed' },
      ],
      graph: {
        nodes,
        edges: [
          { id: 'input-gate', source: 'input', target: 'gate' },
          { id: 'input-normal', source: 'input', target: 'normal_workflow' },
          { id: 'gate-blocked', source: 'gate', target: 'blocked_output' },
          { id: 'normal-output', source: 'normal_workflow', target: 'normal_output' },
        ],
      },
    },
    nodeRuns: [],
    waitingNodeId: null,
    error: null,
    startedAt: null,
    completedAt: null,
    createdAt: null,
    updatedAt: null,
  } as unknown as AppTask
}

function createRetryableTask() {
  return {
    id: 2,
    appId: 1,
    taskGroupId: 1,
    status: 'failed',
    inputs: { prompt: 'old prompt' },
    variables: { prompt: 'old prompt', result: 'old result' },
    outputs: { result: 'old result' },
    appSnapshot: {
      id: 1,
      name: 'retryable app',
      variables: [
        { key: 'prompt', name: 'prompt', type: 'STRING', source: 'user_input', required: true },
        { key: 'result', name: 'result', type: 'STRING', source: 'computed' },
      ],
      graph: {
        nodes: [{ id: 'input', type: 'input_collect', position: { x: 0, y: 0 }, data: {} }],
        edges: [],
      },
    },
    nodeRuns: [{ nodeId: 'input', type: 'input_collect', status: 'completed' }],
    waitingNodeId: 'gate',
    error: 'old error',
    startedAt: 'old started at',
    completedAt: 'old completed at',
    createdAt: null,
    updatedAt: null,
  } as unknown as AppTask
}

function createConditionalTask(conditionValue: unknown) {
  const nodes: AppGraphNode[] = [
    { id: 'input', type: 'input_collect', position: { x: 0, y: 0 }, data: {} },
    {
      id: 'condition',
      type: 'conditional',
      position: { x: 200, y: 0 },
      data: { conditionVarKey: 'flag' },
    },
    {
      id: 'true_output',
      type: 'output_text',
      position: { x: 420, y: -80 },
      data: { varKey: 'true_result' },
    },
    {
      id: 'false_output',
      type: 'output_text',
      position: { x: 420, y: 80 },
      data: { varKey: 'false_result' },
    },
  ]

  return {
    id: 3,
    appId: 1,
    taskGroupId: 1,
    status: 'queued',
    inputs: { flag: conditionValue },
    variables: {
      flag: conditionValue,
      true_result: 'true branch',
      false_result: 'false branch',
    },
    outputs: {},
    appSnapshot: {
      id: 1,
      name: 'conditional app',
      variables: [
        { key: 'flag', name: 'flag', type: 'BOOL', source: 'user_input', required: true },
        { key: 'true_result', name: 'true_result', type: 'STRING', source: 'computed' },
        { key: 'false_result', name: 'false_result', type: 'STRING', source: 'computed' },
      ],
      graph: {
        nodes,
        edges: [
          { id: 'input-condition', source: 'input', target: 'condition' },
          {
            id: 'condition-true-true_output-default',
            source: 'condition',
            target: 'true_output',
            sourceHandle: 'true',
          },
          {
            id: 'condition-false-false_output-default',
            source: 'condition',
            target: 'false_output',
            sourceHandle: 'false',
          },
        ],
      },
    },
    nodeRuns: [],
    waitingNodeId: null,
    error: null,
    startedAt: null,
    completedAt: null,
    createdAt: null,
    updatedAt: null,
  } as unknown as AppTask
}

function nodeStatus(task: AppTask, nodeId: string): AppTaskNodeStatus | undefined {
  return task.nodeRuns.find((nodeRun) => nodeRun.nodeId === nodeId)?.status
}
