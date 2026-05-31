<script setup lang="ts">
import type { WorkflowRecord } from '@/lib/workflow'

defineProps<{ workflows: WorkflowRecord[]; activeId?: number; loading?: boolean }>()
const emit = defineEmits<{ upload: [rawJson: Record<string, unknown>]; select: [id: number] }>()
</script>

<template>
  <WorkflowUploadButton @upload="emit('upload', $event)" />
  <div v-if="loading" class="px-3 pb-2 text-xs text-slate-500">处理中...</div>
  <WorkflowList :workflows="workflows" :active-id="activeId" @select="emit('select', $event)" />
</template>
