import { registerNode } from '../registry.js'

registerNode({
  classType: 'LoraLoader',
  displayName: 'LoRA Loader',
  category: 'loader',
  color: '#475569',
  inputs: {
    model: { type: 'MODEL', promotable: false },
    clip: { type: 'CLIP', promotable: false },
    lora_name: { type: 'MODEL_NAME', promotable: true },
    strength_model: { type: 'FLOAT', promotable: true },
    strength_clip: { type: 'FLOAT', promotable: true },
  },
  outputs: [
    { name: 'MODEL', type: 'MODEL', exposable: false },
    { name: 'CLIP', type: 'CLIP', exposable: false },
  ],
})
