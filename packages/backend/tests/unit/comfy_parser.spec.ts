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

    assert.deepEqual(Object.keys(definition.inputs).sort(), ['lora_name', 'model', 'strength_model'])
    assert.equal(definition.inputs.model.type, 'MODEL')
    assert.equal(definition.inputs.model.promotable, false)
    assert.equal(definition.inputs.lora_name.type, 'LORA_NAME')
    assert.equal(definition.outputs[0].type, 'MODEL')
  })
})
