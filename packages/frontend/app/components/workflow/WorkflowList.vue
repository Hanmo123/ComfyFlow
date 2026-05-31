<script setup lang="ts">
import type { WorkflowRecord } from '@/lib/workflow'

defineProps<{ workflows: WorkflowRecord[]; activeId?: number }>()
const emit = defineEmits<{ select: [id: number] }>()
</script>

<template>
  <div class="min-h-0 flex-1 overflow-y-auto border-t border-slate-200 p-3">
    <div v-if="workflows.length === 0" class="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
      暂无工作流，先上传一个 ComfyUI API JSON。
    </div>

    <button
      v-for="workflow in workflows"
      :key="workflow.id"
      class="mb-2 w-full rounded-lg border p-3 text-left transition hover:border-slate-400 hover:bg-slate-50"
      :class="activeId === workflow.id ? 'border-slate-950 bg-slate-50' : 'border-slate-200'"
      type="button"
      @click="emit('select', workflow.id)"
    >
      <div class="flex items-center justify-between gap-2">
        <span class="truncate text-sm font-medium">{{ workflow.name || `未命名工作流 #${workflow.id}` }}</span>
        <span
          class="rounded-full px-2 py-0.5 text-[11px]"
          :class="workflow.status === 'draft' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'"
        >
          {{ workflow.status === 'draft' ? '草稿' : '已保存' }}
        </span>
      </div>
      <div class="mt-1 text-xs text-slate-500">ID {{ workflow.id }}</div>
    </button>
  </div>
</template>
