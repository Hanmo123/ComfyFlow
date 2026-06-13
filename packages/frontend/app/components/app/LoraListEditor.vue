<script setup lang="ts">
import { Plus, Trash2, GripVertical } from 'lucide-vue-next'
import type { LoraItem } from '@/lib/app'

const props = defineProps<{
  modelValue: LoraItem[]
  loraOptions: string[]
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: LoraItem[]]
}>()

const EMPTY_LORA_VALUE = '__empty_lora__'

function addLora() {
  const newList = [...props.modelValue, { name: '', strength_model: 1.0, strength_clip: 1.0 }]
  emit('update:modelValue', newList)
}

function removeLora(index: number) {
  const newList = props.modelValue.filter((_, i) => i !== index)
  emit('update:modelValue', newList)
}

function updateLoraName(index: number, value: string) {
  const newList = [...props.modelValue]
  newList[index] = { ...newList[index], name: value === EMPTY_LORA_VALUE ? '' : value }
  emit('update:modelValue', newList)
}

function updateLoraStrengthModel(index: number, value: string) {
  const newList = [...props.modelValue]
  newList[index] = { ...newList[index], strength_model: Number.parseFloat(value) || 1.0 }
  emit('update:modelValue', newList)
}

function updateLoraStrengthClip(index: number, value: string) {
  const newList = [...props.modelValue]
  newList[index] = { ...newList[index], strength_clip: Number.parseFloat(value) || 1.0 }
  emit('update:modelValue', newList)
}

function loraOptionsFor(currentName: string) {
  if (currentName && !props.loraOptions.includes(currentName)) {
    return [currentName, ...props.loraOptions]
  }
  return props.loraOptions
}
</script>

<template>
  <div class="space-y-2">
    <div class="flex items-center justify-between gap-2">
      <div class="text-sm font-medium">LoRA 列表</div>
      <Button
        variant="outline"
        size="sm"
        type="button"
        class="h-7 gap-1 px-2 text-xs"
        :disabled="props.disabled"
        @click="addLora"
      >
        <Plus class="size-3.5" />
        添加 LoRA
      </Button>
    </div>

    <div v-if="props.modelValue.length === 0" class="rounded border border-dashed p-3 text-center text-sm text-slate-400">
      暂无 LoRA，点击上方按钮添加
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="(lora, index) in props.modelValue"
        :key="index"
        class="rounded border p-3 space-y-2"
      >
        <div class="flex items-center gap-2">
          <GripVertical class="size-4 text-slate-400 shrink-0" />
          <div class="text-sm font-medium text-slate-600">LoRA {{ index + 1 }}</div>
          <Button
            variant="ghost"
            size="icon"
            type="button"
            class="ml-auto size-7 text-red-500 hover:text-red-600"
            :disabled="props.disabled"
            @click="removeLora(index)"
          >
            <Trash2 class="size-4" />
          </Button>
        </div>

        <div class="space-y-2">
          <Label :for="`lora-${index}-name`" class="text-xs">名称</Label>
          <Select
            :model-value="lora.name || EMPTY_LORA_VALUE"
            :disabled="props.disabled"
            @update:model-value="updateLoraName(index, $event as string)"
          >
            <SelectTrigger :id="`lora-${index}-name`" class="h-8 text-sm">
              <SelectValue placeholder="选择 LoRA" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem :value="EMPTY_LORA_VALUE">不选择 LoRA</SelectItem>
              <SelectItem v-if="loraOptionsFor(lora.name).length === 0" value="__no_loras__" disabled>
                暂无 LoRA
              </SelectItem>
              <SelectItem v-for="name in loraOptionsFor(lora.name)" :key="name" :value="name">
                {{ name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div class="space-y-1.5">
            <Label :for="`lora-${index}-strength-model`" class="text-xs">Model 强度</Label>
            <Input
              :id="`lora-${index}-strength-model`"
              type="number"
              step="0.01"
              min="0"
              max="2"
              :value="lora.strength_model"
              :disabled="props.disabled"
              class="h-8 text-sm"
              @input="updateLoraStrengthModel(index, ($event.target as HTMLInputElement).value)"
            />
          </div>
          <div class="space-y-1.5">
            <Label :for="`lora-${index}-strength-clip`" class="text-xs">CLIP 强度</Label>
            <Input
              :id="`lora-${index}-strength-clip`"
              type="number"
              step="0.01"
              min="0"
              max="2"
              :value="lora.strength_clip ?? 1.0"
              :disabled="props.disabled"
              class="h-8 text-sm"
              @input="updateLoraStrengthClip(index, ($event.target as HTMLInputElement).value)"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
