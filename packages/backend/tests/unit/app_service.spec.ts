import type { AppGraph } from '#models/app'
import type { CreateAppPayload } from '#repositories/app_repository'
import AppService from '#services/app_service'
import { test } from '@japa/runner'

test.group('AppService', () => {
  test('preserves conditional edge handles when normalizing graph', async ({ assert }) => {
    const createdPayloads: CreateAppPayload[] = []
    type AppServiceArgs = ConstructorParameters<typeof AppService>
    const repository = {
      async create(payload: CreateAppPayload) {
        createdPayloads.push(payload)
        return { id: 1, ...payload }
      },
    }
    const service = new AppService(repository as AppServiceArgs[0], {} as AppServiceArgs[1])

    await service.create({
      name: 'conditional app',
      variables: [{ key: 'flag', name: 'flag', type: 'BOOL', source: 'user_input' }],
      graph: createConditionalGraph(),
    })

    assert.equal(createdPayloads[0].graph?.edges[1].sourceHandle, 'false')
    assert.equal(createdPayloads[0].graph?.edges[1].id, 'condition-false-false_output-default')
  })

  test('allows output nodes to connect to downstream nodes', async ({ assert }) => {
    const createdPayloads: CreateAppPayload[] = []
    type AppServiceArgs = ConstructorParameters<typeof AppService>
    const repository = {
      async create(payload: CreateAppPayload) {
        createdPayloads.push(payload)
        return { id: 1, ...payload }
      },
    }
    const service = new AppService(repository as AppServiceArgs[0], {} as AppServiceArgs[1])

    await service.create({
      name: 'wait app',
      variables: [{ key: 'result', name: 'result', type: 'STRING', source: 'computed' }],
      graph: createOutputDownstreamGraph(),
    })

    assert.equal(createdPayloads[0].graph?.edges[1].source, 'output')
    assert.equal(createdPayloads[0].graph?.edges[1].target, 'gate')
  })

  test('treats coalesce outputs as readable for downstream workflow nodes', async ({ assert }) => {
    const createdPayloads: CreateAppPayload[] = []
    type AppServiceArgs = ConstructorParameters<typeof AppService>
    const repository = {
      async create(payload: CreateAppPayload) {
        createdPayloads.push(payload)
        return { id: 1, ...payload }
      },
    }
    const workflowRepository = {
      async findOrFail() {
        return {
          id: 1,
          name: 'workflow',
          status: 'saved',
          rawJson: {},
          parameters: [{ key: 'image', name: 'image', type: 'IMAGE' }],
          results: [],
        }
      },
    }
    const service = new AppService(repository as AppServiceArgs[0], workflowRepository as unknown as AppServiceArgs[1])

    await service.create({
      name: 'coalesce app',
      variables: [
        { key: 'image_a', name: 'image_a', type: 'IMAGE', source: 'user_input' },
        { key: 'image_b', name: 'image_b', type: 'IMAGE', source: 'user_input' },
        { key: 'image', name: 'image', type: 'IMAGE', source: 'computed' },
      ],
      graph: createCoalesceWorkflowGraph(),
    })

    assert.equal(createdPayloads.length, 1)
    assert.equal(createdPayloads[0].graph?.nodes[2].type, 'workflow_run')
    assert.equal((createdPayloads[0].graph?.nodes[2] as any).data.inputBindings.image.varKey, 'image')
  })
})

function createConditionalGraph(): AppGraph {
  return {
    nodes: [
      { id: 'input', type: 'input_collect', position: { x: 0, y: 0 }, data: {} },
      {
        id: 'condition',
        type: 'conditional',
        position: { x: 200, y: 0 },
        data: { conditionVarKey: 'flag' },
      },
      {
        id: 'false_output',
        type: 'output_text',
        position: { x: 420, y: 0 },
        data: { varKey: null },
      },
    ],
    edges: [
      { id: 'input-condition', source: 'input', target: 'condition' },
      {
        id: 'condition-false-false_output-default',
        source: 'condition',
        target: 'false_output',
        sourceHandle: 'false',
      },
    ],
  }
}

function createOutputDownstreamGraph(): AppGraph {
  return {
    nodes: [
      { id: 'input', type: 'input_collect', position: { x: 0, y: 0 }, data: {} },
      {
        id: 'output',
        type: 'output_text',
        position: { x: 200, y: 0 },
        data: { varKey: null },
      },
      {
        id: 'gate',
        type: 'manual_gate',
        position: { x: 420, y: 0 },
        data: { title: '确认', description: '', displayVars: [] },
      },
      {
        id: 'final_output',
        type: 'output_text',
        position: { x: 640, y: 0 },
        data: { varKey: null },
      },
    ],
    edges: [
      { id: 'input-output', source: 'input', target: 'output' },
      { id: 'output-gate', source: 'output', target: 'gate' },
      { id: 'gate-final_output', source: 'gate', target: 'final_output' },
    ],
  }
}

function createCoalesceWorkflowGraph(): AppGraph {
  return {
    nodes: [
      { id: 'input', type: 'input_collect', position: { x: 0, y: 0 }, data: {} },
      {
        id: 'merge',
        type: 'coalesce',
        position: { x: 200, y: 0 },
        data: {
          inputs: [{ varKey: 'image_a' }, { varKey: 'image_b' }],
          outputValue: 'image',
          outputSourceIndex: null,
        },
      },
      {
        id: 'workflow',
        type: 'workflow_run',
        position: { x: 420, y: 0 },
        data: {
          workflowId: 1,
          inputBindings: {
            image: { kind: 'variable', varKey: 'image' },
          },
          outputAssignments: {},
        },
      },
    ],
    edges: [
      { id: 'input-merge', source: 'input', target: 'merge' },
      { id: 'merge-workflow', source: 'merge', target: 'workflow' },
    ],
  }
}
