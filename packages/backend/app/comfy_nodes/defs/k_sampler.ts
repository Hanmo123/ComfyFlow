import { registerNode } from '../registry.js'

registerNode({
  classType: 'KSampler',
  displayName: 'KSampler',
  category: 'sampler',
  color: '#db2777',
  inputs: {
    model: { type: 'MODEL', promotable: false },
    seed: { type: 'SEED', promotable: true },
    steps: { type: 'INT', promotable: true },
    cfg: { type: 'FLOAT', promotable: true },
    sampler_name: { type: 'COMBO', promotable: true },
    scheduler: { type: 'COMBO', promotable: true },
    positive: { type: 'CONDITIONING', promotable: false },
    negative: { type: 'CONDITIONING', promotable: false },
    latent_image: { type: 'LATENT', promotable: false },
    denoise: { type: 'FLOAT', promotable: true },
  },
  outputs: [{ name: 'LATENT', type: 'LATENT', exposable: true }],
})
