<script setup lang="ts">
import {
  APP_VARIABLE_TYPE_COLORS,
  APP_VARIABLE_TYPE_LABELS,
  APP_VARIABLE_TYPES,
} from '@/lib/app'
import type { OutputSlotDefinition, WorkflowResult } from '@/lib/workflow'

const props = defineProps<{
  slotIndex: number
  definition: OutputSlotDefinition
  variable?: WorkflowResult
}>()

const emit = defineEmits<{ toggle: [] }>()

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
    <Badge class="border-0" :class="typeClass(props.definition.type)">
      {{ typeLabel(props.definition.type) }}
    </Badge>
    <div class="min-w-0">
      <div class="truncate text-sm font-medium text-slate-700">{{ props.definition.name }}</div>
      <div class="truncate text-slate-500">插槽 {{ props.slotIndex }}</div>
    </div>
    <Button
      v-if="props.definition.exposable"
      :variant="props.variable ? 'default' : 'secondary'"
      size="sm"
      class="nodrag nopan h-7 min-w-0 max-w-28 justify-start px-2 text-xs"
      :class="props.variable ? '' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-950'"
      type="button"
      @pointerdown.stop
      @click.stop="emit('toggle')"
    >
      <span class="min-w-0 truncate">{{ props.variable ? `$${props.variable.name}` : '设为结果' }}</span>
    </Button>
  </div>
</template>
