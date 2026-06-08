<script setup lang="ts">
import {
  APP_VARIABLE_TYPE_COLORS,
  APP_VARIABLE_TYPE_LABELS,
  APP_VARIABLE_TYPES,
} from '@/lib/app'
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

function typeLabel(type: string) {
  return isKnownType(type) ? APP_VARIABLE_TYPE_LABELS[type] : type
}

function typeClass(type: string) {
  return isKnownType(type) ? APP_VARIABLE_TYPE_COLORS[type] : APP_VARIABLE_TYPE_COLORS.UNKNOWN
}

function isKnownType(type: string): type is (typeof APP_VARIABLE_TYPES)[number] {
  return APP_VARIABLE_TYPES.includes(type as (typeof APP_VARIABLE_TYPES)[number])
}
</script>

<template>
  <div
    class="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 rounded-md px-1.5 py-1.5 text-xs"
    :class="variable ? 'bg-slate-50' : 'bg-white'"
  >
    <Badge class="border-0" :class="typeClass(definition.type)">
      {{ typeLabel(definition.type) }}
    </Badge>
    <div class="min-w-0">
      <div class="truncate text-sm font-medium text-slate-700">{{ field }}</div>
      <div class="truncate text-slate-500" :title="displayValue">{{ displayValue }}</div>
    </div>
    <Button
      v-if="definition.promotable"
      :variant="variable ? 'default' : 'secondary'"
      size="sm"
      class="nodrag nopan h-7 min-w-0 max-w-28 justify-start px-2 text-xs"
      :class="variable ? '' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-950'"
      type="button"
      @pointerdown.stop
      @click.stop="emit('toggle')"
    >
      <span class="min-w-0 truncate">{{ variable ? `$${variable.name}` : '设为参数' }}</span>
    </Button>
  </div>
</template>
