import { registerNode } from '../registry.js'

registerNode({
  classType: 'LoadImage',
  displayName: 'Load Image',
  category: 'io',
  color: '#ea580c',
  inputs: {
    image: { type: 'IMAGE', promotable: true },
    upload: { type: 'STRING', promotable: false },
  },
  outputs: [
    { name: 'IMAGE', type: 'IMAGE', exposable: true },
    { name: 'MASK', type: 'MASK', exposable: true },
  ],
})
