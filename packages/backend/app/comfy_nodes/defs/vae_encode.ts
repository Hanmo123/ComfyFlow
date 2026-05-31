import { registerNode } from '../registry.js'

registerNode({
  classType: 'VAEEncode',
  displayName: 'VAE Encode',
  category: 'latent',
  color: '#059669',
  inputs: {
    pixels: { type: 'IMAGE', promotable: false },
    vae: { type: 'VAE', promotable: false },
  },
  outputs: [{ name: 'LATENT', type: 'LATENT', exposable: true }],
})
