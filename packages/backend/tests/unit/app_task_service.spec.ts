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

  test('updates task inputs without resetting execution state', async ({ assert }) => {
    const task = createRetryableTask()
    const service = createService(task, [])
    let enqueuedTaskId: number | null = null
    ;(service as unknown as { enqueue(taskId: number): void }).enqueue = (taskId) => {
      enqueuedTaskId = taskId
    }

    await service.updateTaskInputs(task.id, { prompt: 'saved prompt' })

    assert.equal(enqueuedTaskId, null)
    assert.equal(task.status, 'failed')
    assert.deepEqual(task.inputs, { prompt: 'saved prompt' })
    assert.deepEqual(task.variables, { prompt: 'saved prompt', result: 'old result' })
    assert.deepEqual(task.outputs, { result: 'old result' })
    assert.deepEqual(task.nodeRuns, [{ nodeId: 'input', type: 'input_collect', status: 'completed' }])
    assert.equal(task.waitingNodeId, 'gate')
    assert.equal(task.error, 'old error')
    assert.equal(task.startedAt, 'old started at')
    assert.equal(task.completedAt, 'old completed at')
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

  test('keeps merge nodes reachable from the active conditional branch', async ({ assert }) => {
    const task = createConditionalMergeTask(false)
    const service = createService(task, [])

    await executeTask(service, task.id)

    assert.equal(task.status, 'completed')
    assert.equal(nodeStatus(task, 'true_workflow'), 'skipped')
    assert.equal(nodeStatus(task, 'merge'), 'completed')
    assert.equal(nodeStatus(task, 'final_output'), 'completed')
    assert.deepEqual(task.outputs, { selected_result: 'fallback value' })
  })

  test('counts skipped incoming edges for wait-for-previous nodes', async ({ assert }) => {
    const task = createConditionalWaitTask(false)
    const service = createService(task, [])

    await executeTask(service, task.id)

    const waitRun = task.nodeRuns.find((nodeRun) => nodeRun.nodeId === 'wait')

    assert.equal(task.status, 'completed')
    assert.equal(nodeStatus(task, 'true_workflow'), 'skipped')
    assert.equal(nodeStatus(task, 'wait'), 'completed')
    assert.equal(nodeStatus(task, 'final_output'), 'completed')
    assert.deepEqual(waitRun?.inputs, {
      arrivedParentIds: ['true_workflow', 'condition'],
      arrivedCount: 2,
      expectedCount: 2,
    })
    assert.deepEqual(waitRun?.outputs, { canContinue: true })
  })

  test('injects prompt placeholder from task variables without explicit binding', async ({ assert }) => {
    const task = createWorkflowTask({ 提示词: '去除丝袜和内裤' })
    const workflowRuns: unknown[] = []
    const service = createService(task, workflowRuns, {
      rawJson: {
        1: {
          class_type: 'CLIPTextEncode',
          inputs: { text: '__PROMPT__' },
        },
      },
      parameters: [],
    })

    await executeTask(service, task.id)

    assert.equal((workflowRuns[0] as Record<string, any>)['1'].inputs.text, '去除丝袜和内裤')
  })

  test('randomizes seed parameters when running workflow nodes', async ({ assert }) => {
    const task = createWorkflowTask({ seed: 'fixed-seed', steps: 30 })
    const workflowRuns: unknown[] = []
    const service = createService(
      task,
      workflowRuns,
      {
        rawJson: {
          1: {
            class_type: 'KSampler',
            inputs: { seed: 42, steps: 20 },
          },
        },
        parameters: [
          { key: 'input:seed', nodeId: '1', field: 'seed', name: 'seed', type: 'SEED' },
          { key: 'input:steps', nodeId: '1', field: 'steps', name: 'steps', type: 'INT' },
        ],
      },
      () => 123456
    )

    await executeTask(service, task.id)

    const prompt = workflowRuns[0] as Record<string, any>
    const seed = prompt['1'].inputs.seed
    const workflowRun = task.nodeRuns.find((nodeRun) => nodeRun.nodeId === 'workflow')

    assert.equal(seed, 123456)
    assert.equal(prompt['1'].inputs.steps, 30)
    assert.equal(workflowRun?.inputs?.['input:seed'], seed)
  })

  test('randomizes unexposed seed inputs when retrying workflow nodes', async ({ assert }) => {
    const task = createWorkflowTask({ steps: 30 })
    const workflowRuns: unknown[] = []
    const seeds = [111, 222]
    const service = createService(
      task,
      workflowRuns,
      {
        rawJson: {
          1: {
            class_type: 'KSampler',
            inputs: { seed: 42, steps: 20 },
          },
        },
        parameters: [
          { key: 'input:steps', nodeId: '1', field: 'steps', name: 'steps', type: 'INT' },
        ],
      },
      () => seeds.shift() ?? 333
    )

    await executeTask(service, task.id)
    ;(service as unknown as { enqueue(taskId: number): void }).enqueue = () => {}

    await service.retryNode(task.id, 'workflow')
    await executeTask(service, task.id)

    assert.equal(workflowRuns.length, 2)
    assert.equal((workflowRuns[0] as Record<string, any>)['1'].inputs.seed, 111)
    assert.equal((workflowRuns[1] as Record<string, any>)['1'].inputs.seed, 222)
    assert.equal((workflowRuns[1] as Record<string, any>)['1'].inputs.steps, 30)
  })

  test('normalizes and expands chained lora nodes before running workflow', async ({ assert }) => {
    const task = createWorkflowTask({
      loras: [
        { name: 'dynamic1.safetensors', strength_model: 1 },
        { name: 'dynamic2.safetensors', strength_model: 0.3 },
      ],
    })
    const workflowRuns: unknown[] = []
    const service = createService(task, workflowRuns, {
      rawJson: {
        1: {
          class_type: 'UNETLoader',
          inputs: { unet_name: 'model.safetensors' },
        },
        2: {
          class_type: 'LoraLoaderModelOnly',
          inputs: { model: ['1', 0], lora_name: 'old1.safetensors', strength_model: 0.9 },
        },
        3: {
          class_type: 'LoraLoaderModelOnly',
          inputs: { model: ['2', 0], lora_name: 'old2.safetensors', strength_model: 0.4 },
        },
        4: {
          class_type: 'KSampler',
          inputs: { model: ['3', 0] },
        },
      },
      parameters: [
        { key: 'input:2:lora_list', nodeId: '2', field: 'lora_list', name: 'loras', type: 'LORA_LIST' },
      ],
    })

    await executeTask(service, task.id)

    const prompt = workflowRuns[0] as Record<string, any>
    assert.isUndefined(prompt['3'])
    assert.equal(prompt['2'].inputs.lora_name, 'dynamic1.safetensors')
    assert.equal(prompt['2_lora_1'].inputs.lora_name, 'dynamic2.safetensors')
    assert.deepEqual(prompt['4'].inputs.model, ['2_lora_1', 0])
  })

  test('uses non-default clip strength as model strength for model-only lora inputs', async ({ assert }) => {
    const task = createWorkflowTask({
      loras: [
        { name: 'dynamic1.safetensors', strength_model: 1, strength_clip: 0.7 },
        { name: 'dynamic2.safetensors', strength_model: 1, strength_clip: 0.3 },
      ],
    })
    const workflowRuns: unknown[] = []
    const service = createService(task, workflowRuns, {
      rawJson: {
        1: {
          class_type: 'UNETLoader',
          inputs: { unet_name: 'model.safetensors' },
        },
        2: {
          class_type: 'LoraLoaderModelOnly',
          inputs: { model: ['1', 0], lora_name: 'old1.safetensors', strength_model: 0.9 },
        },
        3: {
          class_type: 'LoraLoaderModelOnly',
          inputs: { model: ['2', 0], lora_name: 'old2.safetensors', strength_model: 0.4 },
        },
        4: {
          class_type: 'KSampler',
          inputs: { model: ['3', 0] },
        },
      },
      parameters: [
        { key: 'input:2:lora_list', nodeId: '2', field: 'lora_list', name: 'loras', type: 'LORA_LIST' },
      ],
    })

    await executeTask(service, task.id)

    const prompt = workflowRuns[0] as Record<string, any>
    assert.equal(prompt['2'].inputs.strength_model, 0.7)
    assert.equal(prompt['2_lora_1'].inputs.strength_model, 0.3)
  })
})

function createService(
  task: AppTask,
  workflowRuns: unknown[],
  workflowPatch: Partial<Workflow> = {},
  seedGenerator?: () => number
) {
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
        ...workflowPatch,
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
    {} as AppTaskServiceArgs[5],
    seedGenerator
  )
}

function createWorkflowTask(variables: Record<string, unknown>) {
  const inputBindings = Object.fromEntries(
    Object.keys(variables).map((key) => [
      key === 'loras' ? 'input:2:lora_list' : `input:${key}`,
      { kind: 'variable', varKey: key },
    ])
  )

  return {
    id: 5,
    appId: 1,
    taskGroupId: 1,
    status: 'queued',
    inputs: variables,
    variables,
    outputs: {},
    appSnapshot: {
      id: 1,
      name: 'workflow task',
      variables: Object.keys(variables).map((key) => ({
        key,
        name: key,
        type: key === 'loras' ? 'LORA_LIST' : 'STRING',
        source: 'user_input',
        required: true,
      })),
      graph: {
        nodes: [
          { id: 'input', type: 'input_collect', position: { x: 0, y: 0 }, data: {} },
          {
            id: 'workflow',
            type: 'workflow_run',
            position: { x: 200, y: 0 },
            data: { workflowId: 1, inputBindings, outputAssignments: {} },
          },
        ],
        edges: [{ id: 'input-workflow', source: 'input', target: 'workflow' }],
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

function createConditionalMergeTask(conditionValue: unknown) {
  const nodes: AppGraphNode[] = [
    { id: 'input', type: 'input_collect', position: { x: 0, y: 0 }, data: {} },
    {
      id: 'condition',
      type: 'conditional',
      position: { x: 200, y: 0 },
      data: { conditionVarKey: 'flag' },
    },
    {
      id: 'true_workflow',
      type: 'workflow_run',
      position: { x: 420, y: -80 },
      data: {
        workflowId: 1,
        inputBindings: {},
        outputAssignments: { result: 'generated_result' },
      },
    },
    {
      id: 'merge',
      type: 'coalesce',
      position: { x: 640, y: 0 },
      data: {
        inputs: [{ varKey: 'generated_result' }, { varKey: 'fallback_result' }],
        outputValue: 'selected_result',
        outputSourceIndex: null,
      },
    },
    {
      id: 'final_output',
      type: 'output_text',
      position: { x: 860, y: 0 },
      data: { varKey: 'selected_result' },
    },
  ]

  return {
    id: 4,
    appId: 1,
    taskGroupId: 1,
    status: 'queued',
    inputs: { flag: conditionValue },
    variables: {
      flag: conditionValue,
      fallback_result: 'fallback value',
    },
    outputs: {},
    appSnapshot: {
      id: 1,
      name: 'conditional merge app',
      variables: [
        { key: 'flag', name: 'flag', type: 'BOOL', source: 'user_input', required: true },
        { key: 'generated_result', name: 'generated_result', type: 'STRING', source: 'computed' },
        { key: 'fallback_result', name: 'fallback_result', type: 'STRING', source: 'computed' },
        { key: 'selected_result', name: 'selected_result', type: 'STRING', source: 'computed' },
      ],
      graph: {
        nodes,
        edges: [
          { id: 'input-condition', source: 'input', target: 'condition' },
          {
            id: 'condition-true-true_workflow-default',
            source: 'condition',
            target: 'true_workflow',
            sourceHandle: 'true',
          },
          {
            id: 'true_workflow-merge',
            source: 'true_workflow',
            target: 'merge',
          },
          {
            id: 'condition-false-merge-default',
            source: 'condition',
            target: 'merge',
            sourceHandle: 'false',
          },
          { id: 'merge-final_output', source: 'merge', target: 'final_output' },
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

function createConditionalWaitTask(conditionValue: unknown) {
  const nodes: AppGraphNode[] = [
    { id: 'input', type: 'input_collect', position: { x: 0, y: 0 }, data: {} },
    {
      id: 'condition',
      type: 'conditional',
      position: { x: 200, y: 0 },
      data: { conditionVarKey: 'flag' },
    },
    {
      id: 'true_workflow',
      type: 'workflow_run',
      position: { x: 420, y: -80 },
      data: {
        workflowId: 1,
        inputBindings: {},
        outputAssignments: { result: 'generated_result' },
      },
    },
    {
      id: 'wait',
      type: 'wait_for_previous',
      position: { x: 640, y: 0 },
      data: {},
    },
    {
      id: 'final_output',
      type: 'output_text',
      position: { x: 860, y: 0 },
      data: { varKey: 'fallback_result' },
    },
  ]

  return {
    id: 6,
    appId: 1,
    taskGroupId: 1,
    status: 'queued',
    inputs: { flag: conditionValue },
    variables: {
      flag: conditionValue,
      fallback_result: 'fallback value',
    },
    outputs: {},
    appSnapshot: {
      id: 1,
      name: 'conditional wait app',
      variables: [
        { key: 'flag', name: 'flag', type: 'BOOL', source: 'user_input', required: true },
        { key: 'generated_result', name: 'generated_result', type: 'STRING', source: 'computed' },
        { key: 'fallback_result', name: 'fallback_result', type: 'STRING', source: 'computed' },
      ],
      graph: {
        nodes,
        edges: [
          { id: 'input-condition', source: 'input', target: 'condition' },
          {
            id: 'condition-true-true_workflow-default',
            source: 'condition',
            target: 'true_workflow',
            sourceHandle: 'true',
          },
          {
            id: 'true_workflow-wait',
            source: 'true_workflow',
            target: 'wait',
          },
          {
            id: 'condition-false-wait-default',
            source: 'condition',
            target: 'wait',
            sourceHandle: 'false',
          },
          { id: 'wait-final_output', source: 'wait', target: 'final_output' },
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
