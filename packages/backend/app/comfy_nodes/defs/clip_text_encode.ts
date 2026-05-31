import { registerNode } from '../registry.js'

registerNode({
  classType: 'CLIPTextEncode',
  displayName: 'CLIP Text Encode',
  category: 'conditioning',
  color: '#7c3aed',
  inputs: {
    text: { type: 'STRING', promotable: true, multiline: true },
    clip: { type: 'CLIP', promotable: false },
  },
  outputs: [{ name: 'CONDITIONING', type: 'CONDITIONING', exposable: false }],
})
