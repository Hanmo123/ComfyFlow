import { registerNode } from '../registry.js'

registerNode({
  classType: 'EmptyLatentImage',
  displayName: 'Empty Latent Image',
  category: 'latent',
  color: '#0891b2',
  inputs: {
    width: { type: 'INT', promotable: true },
    height: { type: 'INT', promotable: true },
    batch_size: { type: 'INT', promotable: true },
  },
  outputs: [{ name: 'LATENT', type: 'LATENT', exposable: true }],
})
