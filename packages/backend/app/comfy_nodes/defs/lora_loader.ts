import { registerNode } from '../registry.js'

registerNode({
  classType: 'LoraLoader',
  displayName: 'LoRA Loader',
  category: 'loader',
  color: '#475569',
  inputs: {
    model: { type: 'MODEL', promotable: false },
    clip: { type: 'CLIP', promotable: false },
    lora_name: { type: 'LORA_NAME', promotable: true },
    lora_list: { type: 'LORA_LIST', promotable: true },
    strength_model: { type: 'FLOAT', promotable: true },
    strength_clip: { type: 'FLOAT', promotable: true },
  },
  outputs: [
    { name: 'MODEL', type: 'MODEL', exposable: false },
    { name: 'CLIP', type: 'CLIP', exposable: false },
  ],
})

registerNode({
  classType: 'LoraLoaderModelOnly',
  displayName: 'LoRA Loader Model Only',
  category: 'loader',
  color: '#475569',
  inputs: {
    model: { type: 'MODEL', promotable: false },
    lora_name: { type: 'LORA_NAME', promotable: true },
    lora_list: { type: 'LORA_LIST', promotable: true },
    strength_model: { type: 'FLOAT', promotable: true },
  },
  outputs: [{ name: 'MODEL', type: 'MODEL', exposable: false }],
})
