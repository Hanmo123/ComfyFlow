import { registerNode } from '../registry.js'

registerNode({
  classType: 'VAEDecode',
  displayName: 'VAE Decode',
  category: 'image',
  color: '#16a34a',
  inputs: {
    samples: { type: 'LATENT', promotable: false },
    vae: { type: 'VAE', promotable: false },
  },
  outputs: [{ name: 'IMAGE', type: 'IMAGE', exposable: true }],
})
