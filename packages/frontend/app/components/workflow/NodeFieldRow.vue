<script setup lang="ts">
import type { InputFieldDefinition, WorkflowParameter } from '@/lib/workflow'

const props = defineProps<{
  nodeId: string
  field: string
  definition: InputFieldDefinition
  value: unknown
  variable?: WorkflowParameter
}>()

const emit = defineEmits<{ toggle: [] }>()

const displayValue = computed(() => {
  if (Array.isArray(props.value)) return '已连接'
  if (props.value === undefined || props.value === null) return '-'
  if (typeof props.value === 'object') return JSON.stringify(props.value)
  return String(props.value)
})
</script>

<template>
  <div class="rounded-md border border-slate-200 bg-white p-2 text-xs">
    <div class="flex items-center justify-between gap-2">
      <span class="font-medium text-slate-700">{{ field }}</span>
      <span class="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">{{ definition.type }}</span>
    </div>
    <div class="mt-1 truncate text-slate-500" :title="displayValue">{{ displayValue }}</div>
    <Button
      v-if="definition.promotable"
      variant="secondary"
      size="sm"
      class="mt-2 h-auto px-2 py-1 text-[11px]"
      :class="variable ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
      type="button"
      @click="emit('toggle')"
    >
      {{ variable ? `参数：$${variable.name}` : '设为工作流参数' }}
    </Button>
  </div>
</template>
