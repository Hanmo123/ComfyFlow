import type { ComfyType, InputFieldDefinition, NodeDefinition } from './types.js'

const definitions = new Map<string, NodeDefinition>()

export function registerNode(definition: NodeDefinition) {
  definitions.set(definition.classType, definition)
}

export function getNodeDefinition(classType: string) {
  return definitions.get(classType)
}

export function getNodeDefinitions(classTypes: string[]) {
  return classTypes.reduce<Record<string, NodeDefinition>>((result, classType) => {
    result[classType] = getNodeDefinition(classType) ?? createFallbackDefinition(classType)
    return result
  }, {})
}

export function createFallbackDefinition(classType: string, inputs: Record<string, unknown> = {}) {
  return {
    classType,
    displayName: classType,
    category: 'other',
    color: '#6b7280',
    inputs: Object.entries(inputs).reduce<Record<string, InputFieldDefinition>>((result, [field, value]) => {
      if (!isConnectionValue(value)) {
        result[field] = { type: inferTypeFromValue(value), promotable: true, default: value }
      }
      return result
    }, {}),
    outputs: [{ name: 'output', type: 'UNKNOWN', exposable: true }],
  } satisfies NodeDefinition
}

export function inferTypeFromValue(value: unknown): ComfyType {
  if (typeof value === 'boolean') return 'BOOLEAN'
  if (typeof value === 'number') return Number.isInteger(value) ? 'INT' : 'FLOAT'
  if (typeof value === 'string') return 'STRING'
  return 'UNKNOWN'
}

export function isConnectionValue(value: unknown): value is [string | number, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    (typeof value[0] === 'string' || typeof value[0] === 'number') &&
    typeof value[1] === 'number'
  )
}
