<script setup lang="ts">
import type { WorkflowRecord } from "@/lib/workflow";

defineProps<{ workflows: WorkflowRecord[]; activeId?: number }>();
const emit = defineEmits<{ select: [id: number] }>();
</script>

<template>
  <div class="min-h-0 flex-1 overflow-y-auto border-t border-slate-200 p-3">
    <div
      v-if="workflows.length === 0"
      class="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500"
    >
      暂无工作流，先上传一个 ComfyUI API JSON。
    </div>

    <Button
      v-for="workflow in workflows"
      :key="workflow.id"
      variant="outline"
      class="mb-2 h-auto w-full justify-start rounded-lg p-3 text-left hover:border-slate-400 hover:bg-slate-50"
      :class="
        activeId === workflow.id
          ? 'border-slate-950 bg-slate-50'
          : 'border-slate-200'
      "
      type="button"
      @click="emit('select', workflow.id)"
    >
      <div class="flex items-center justify-between gap-2">
        <span class="text-gray-500 font-light">#{{ workflow.id }}</span>

        <span class="truncate text-sm font-medium">{{
          workflow.name || `未命名工作流 #${workflow.id}`
        }}</span>
      </div>
    </Button>
  </div>
</template>
