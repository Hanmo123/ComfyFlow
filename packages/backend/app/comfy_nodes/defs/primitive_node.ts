import { registerNode } from '../registry.js'

registerNode({
  classType: 'PrimitiveNode',
  displayName: 'Primitive',
  category: 'other',
  color: '#6b7280',
  inputs: {
    value: { type: 'UNKNOWN', promotable: true },
  },
  outputs: [{ name: 'VALUE', type: 'UNKNOWN', exposable: true }],
})
