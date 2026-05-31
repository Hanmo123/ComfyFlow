import { registerNode } from '../registry.js'

registerNode({
  classType: 'KSamplerAdvanced',
  displayName: 'KSampler Advanced',
  category: 'sampler',
  color: '#be185d',
  inputs: {
    model: { type: 'MODEL', promotable: false },
    add_noise: { type: 'COMBO', promotable: true },
    noise_seed: { type: 'SEED', promotable: true },
    steps: { type: 'INT', promotable: true },
    cfg: { type: 'FLOAT', promotable: true },
    sampler_name: { type: 'COMBO', promotable: true },
    scheduler: { type: 'COMBO', promotable: true },
    positive: { type: 'CONDITIONING', promotable: false },
    negative: { type: 'CONDITIONING', promotable: false },
    latent_image: { type: 'LATENT', promotable: false },
    start_at_step: { type: 'INT', promotable: true },
    end_at_step: { type: 'INT', promotable: true },
    return_with_leftover_noise: { type: 'COMBO', promotable: true },
  },
  outputs: [{ name: 'LATENT', type: 'LATENT', exposable: true }],
})
