<script setup lang="ts">
import type { OutputSlotDefinition, WorkflowResult } from '@/lib/workflow'

defineProps<{
  slotIndex: number
  definition: OutputSlotDefinition
  variable?: WorkflowResult
}>()

const emit = defineEmits<{ toggle: [] }>()
</script>

<template>
  <div class="rounded-md border border-dashed border-slate-300 bg-slate-50 p-2 text-xs">
    <div class="flex items-center justify-between gap-2">
      <span class="font-medium text-slate-700">{{ slotIndex }} · {{ definition.name }}</span>
      <span class="rounded bg-white px-1.5 py-0.5 text-[10px] text-slate-500">{{ definition.type }}</span>
    </div>
    <Button
      v-if="definition.exposable"
      variant="secondary"
      size="sm"
      class="mt-2 h-auto px-2 py-1 text-[11px]"
      :class="variable ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
      type="button"
      @click="emit('toggle')"
    >
      {{ variable ? `结果：$${variable.name}` : '设为工作流结果' }}
    </Button>
  </div>
</template>
