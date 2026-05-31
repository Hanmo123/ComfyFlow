import { registerNode } from '../registry.js'

registerNode({
  classType: 'CheckpointLoaderSimple',
  displayName: 'Checkpoint Loader',
  category: 'loader',
  color: '#64748b',
  inputs: {
    ckpt_name: { type: 'MODEL_NAME', promotable: true },
  },
  outputs: [
    { name: 'MODEL', type: 'MODEL', exposable: false },
    { name: 'CLIP', type: 'CLIP', exposable: false },
    { name: 'VAE', type: 'VAE', exposable: false },
  ],
})
