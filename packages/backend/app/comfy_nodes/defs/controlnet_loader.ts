import { registerNode } from '../registry.js'

registerNode({
  classType: 'ControlNetLoader',
  displayName: 'ControlNet Loader',
  category: 'loader',
  color: '#334155',
  inputs: {
    control_net_name: { type: 'MODEL_NAME', promotable: true },
  },
  outputs: [{ name: 'CONTROL_NET', type: 'CONTROL_NET', exposable: false }],
})
