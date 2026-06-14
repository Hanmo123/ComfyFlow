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
