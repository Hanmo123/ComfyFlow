import { registerNode } from '../registry.js'

registerNode({
  classType: 'SaveImage',
  displayName: 'Save Image',
  category: 'io',
  color: '#f97316',
  inputs: {
    images: { type: 'IMAGE', promotable: false },
    filename_prefix: { type: 'STRING', promotable: true },
  },
  outputs: [{ name: 'IMAGE', type: 'IMAGE', exposable: true }],
})
