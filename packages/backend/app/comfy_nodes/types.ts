export type ComfyType =
  | 'STRING'
  | 'INT'
  | 'FLOAT'
  | 'BOOLEAN'
  | 'SEED'
  | 'COMBO'
  | 'MODEL_NAME'
  | 'LORA_NAME'
  | 'LORA_LIST'
  | 'IMAGE'
  | 'LATENT'
  | 'MASK'
  | 'MODEL'
  | 'CLIP'
  | 'VAE'
  | 'CONDITIONING'
  | 'CONTROL_NET'
  | 'UNKNOWN'

export interface LoraItem {
  name: string
  strength_model: number
  strength_clip?: number
}

export type ComfyNodeCategory =
  | 'loader'
  | 'sampler'
  | 'conditioning'
  | 'image'
  | 'latent'
  | 'io'
  | 'other'

export interface InputFieldDefinition {
  type: ComfyType
  promotable: boolean
  default?: unknown
  options?: string[]
  multiline?: boolean
}

export interface OutputSlotDefinition {
  name: string
  type: ComfyType
  exposable: boolean
}

export interface NodeDefinition {
  classType: string
  displayName: string
  category: ComfyNodeCategory
  color?: string
  inputs: Record<string, InputFieldDefinition>
  outputs: OutputSlotDefinition[]
}
