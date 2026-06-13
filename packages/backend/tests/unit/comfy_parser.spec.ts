import { parseComfyApiJson } from '#services/comfy_parser'
import { test } from '@japa/runner'

test.group('parseComfyApiJson', () => {
  test('keeps fallback inputs for unknown node types', ({ assert }) => {
    const parsed = parseComfyApiJson({
      1: {
        class_type: 'CustomNode',
        inputs: {
          model: ['4', 0],
          prompt: 'hello',
          strength: 0.8,
        },
      },
    })

    const inputs = parsed.nodeDefinitions.CustomNode.inputs

    assert.deepEqual(Object.keys(inputs).sort(), ['prompt', 'strength'])
    assert.equal(inputs.prompt.type, 'STRING')
    assert.equal(inputs.prompt.default, 'hello')
    assert.equal(inputs.strength.type, 'FLOAT')
    assert.equal(inputs.strength.default, 0.8)
  })

  test('includes LoraLoaderModelOnly inputs', ({ assert }) => {
    const parsed = parseComfyApiJson({
      1: {
        class_type: 'LoraLoaderModelOnly',
        inputs: {
          model: ['4', 0],
          lora_name: 'example.safetensors',
          strength_model: 0.8,
        },
      },
    })

    const definition = parsed.nodeDefinitions.LoraLoaderModelOnly

    assert.deepEqual(Object.keys(definition.inputs).sort(), ['lora_list', 'lora_name', 'model', 'strength_model'])
    assert.equal(definition.inputs.model.type, 'MODEL')
    assert.equal(definition.inputs.model.promotable, false)
    assert.equal(definition.inputs.lora_name.type, 'LORA_NAME')
    assert.equal(definition.inputs.lora_list.type, 'LORA_LIST')
    assert.equal(definition.outputs[0].type, 'MODEL')
  })

  test('merges chained LoraLoader nodes into single node with lora_list', ({ assert }) => {
    const parsed = parseComfyApiJson({
      1: {
        class_type: 'CheckpointLoaderSimple',
        inputs: { ckpt_name: 'model.safetensors' },
      },
      2: {
        class_type: 'LoraLoader',
        inputs: {
          model: ['1', 0],
          clip: ['1', 1],
          lora_name: 'lora1.safetensors',
          strength_model: 0.8,
          strength_clip: 0.7,
        },
      },
      3: {
        class_type: 'LoraLoader',
        inputs: {
          model: ['2', 0],
          clip: ['2', 1],
          lora_name: 'lora2.safetensors',
          strength_model: 1.0,
          strength_clip: 1.0,
        },
      },
      4: {
        class_type: 'LoraLoader',
        inputs: {
          model: ['3', 0],
          clip: ['3', 1],
          lora_name: 'lora3.safetensors',
          strength_model: 0.5,
          strength_clip: 0.6,
        },
      },
      5: {
        class_type: 'KSampler',
        inputs: {
          model: ['4', 0],
          seed: 42,
        },
      },
    })

    // 应该只保留第一个 Lora 节点，其他两个被合并
    const nodeIds = parsed.graph.nodes.map(n => n.id).sort()
    assert.deepEqual(nodeIds, ['1', '2', '5'])

    // 检查第一个 Lora 节点包含合并后的 lora_list
    const loraNode = parsed.graph.nodes.find(n => n.id === '2')!
    assert.equal(loraNode.classType, 'LoraLoader')

    const loraList = loraNode.fieldValues.lora_list as any[]
    assert.equal(loraList.length, 3)
    assert.deepEqual(loraList[0], { name: 'lora1.safetensors', strength_model: 0.8, strength_clip: 0.7 })
    assert.deepEqual(loraList[1], { name: 'lora2.safetensors', strength_model: 1.0, strength_clip: 1.0 })
    assert.deepEqual(loraList[2], { name: 'lora3.safetensors', strength_model: 0.5, strength_clip: 0.6 })

    // 检查边连接正确（KSampler 应该连接到第一个 Lora 节点）
    const samplerEdge = parsed.graph.edges.find(e => e.to === '5' && e.toField === 'model')
    assert.equal(samplerEdge?.from, '2')
    assert.equal(samplerEdge?.fromSlot, 0)
  })

  test('does not merge non-chained LoraLoader nodes', ({ assert }) => {
    const parsed = parseComfyApiJson({
      1: {
        class_type: 'CheckpointLoaderSimple',
        inputs: { ckpt_name: 'model.safetensors' },
      },
      2: {
        class_type: 'LoraLoader',
        inputs: {
          model: ['1', 0],
          clip: ['1', 1],
          lora_name: 'lora1.safetensors',
          strength_model: 0.8,
          strength_clip: 0.7,
        },
      },
      3: {
        class_type: 'LoraLoader',
        inputs: {
          model: ['1', 0], // 连接到同一个源，不是链式
          clip: ['1', 1],
          lora_name: 'lora2.safetensors',
          strength_model: 1.0,
          strength_clip: 1.0,
        },
      },
    })

    // 应该保留两个独立的 Lora 节点
    const nodeIds = parsed.graph.nodes.map(n => n.id).sort()
    assert.deepEqual(nodeIds, ['1', '2', '3'])

    // 两个节点都不应该有 lora_list（或为空）
    const loraNode2 = parsed.graph.nodes.find(n => n.id === '2')!
    const loraNode3 = parsed.graph.nodes.find(n => n.id === '3')!
    
    // 没有合并时不会自动添加 lora_list
    assert.isUndefined(loraNode2.fieldValues.lora_list)
    assert.isUndefined(loraNode3.fieldValues.lora_list)
  })
})
