<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import { Check, CirclePause, FileInput, Image, RotateCw, Type, Workflow } from 'lucide-vue-next'
import { nodeTypeLabel, type AppGraphNode, type AppTaskNodeRun } from '@/lib/app'

const props = defineProps<{
  data: {
    node: AppGraphNode
    nodeRun?: AppTaskNodeRun
    canRetry: boolean
    retrying: boolean
    canResume: boolean
    resuming: boolean
    onRetry: (nodeId: string) => void
    onResume: (nodeId: string) => void
  }
}>()

const nodeIcons = {
  input_collect: FileInput,
  output_text: Type,
  output_image: Image,
  manual_gate: CirclePause,
  workflow_run: Workflow,
} as const

const statusLabel = computed(() => {
  const labels = {
    queued: '排队',
    running: '执行中',
    waiting: '等待确认',
    completed: '完成',
    failed: '失败',
    skipped: '跳过',
  }
  return props.data.nodeRun ? labels[props.data.nodeRun.status] : '未执行'
})

const cardClass = computed(() => {
  const status = props.data.nodeRun?.status
  if (status === 'completed') return 'border-green-300 bg-green-50'
  if (status === 'failed') return 'border-red-300 bg-red-50'
  if (status === 'running') return 'border-blue-300 bg-blue-50'
  if (status === 'waiting') return 'border-amber-300 bg-amber-50'
  return 'border-slate-300 bg-white'
})

const showResumeButton = computed(
  () => props.data.node.type === 'manual_gate' && props.data.nodeRun?.status === 'waiting',
)
</script>

<template>
  <div
    class="w-[300px] rounded-xl border bg-white p-1 text-left transition-colors"
    :class="showResumeButton ? 'border-amber-300 bg-amber-50' : 'border-transparent'"
  >
    <Handle type="target" :position="Position.Left" class="!bg-slate-500" />

    <div class="rounded-lg border transition-colors" :class="cardClass">
      <div class="flex items-start gap-3 px-3 py-3">
        <div class="rounded-lg border bg-white p-2 text-slate-700">
          <component :is="nodeIcons[props.data.node.type]" class="size-4" />
        </div>
        <div class="min-w-0 flex-1">
          <div class="truncate text-sm font-semibold text-slate-950">
            {{ nodeTypeLabel(props.data.node.type) }}
          </div>
          <div class="mt-0.5 truncate text-xs text-slate-500">{{ props.data.node.id }}</div>
          <div class="mt-2 inline-flex rounded-full border bg-white px-2 py-0.5 text-xs text-slate-600">
            {{ statusLabel }}
          </div>
        </div>
        <Button
          v-if="props.data.node.type === 'workflow_run'"
          variant="outline"
          size="icon"
          type="button"
          class="size-8 bg-white"
          :disabled="!props.data.canRetry || props.data.retrying"
          aria-label="重试节点"
          @click.stop="props.data.onRetry(props.data.node.id)"
        >
          <RotateCw class="size-4" :class="props.data.retrying ? 'animate-spin' : ''" />
        </Button>
      </div>

      <div v-if="props.data.nodeRun?.error" class="border-t border-red-200 px-3 py-2 text-xs text-red-700">
        {{ props.data.nodeRun.error }}
      </div>
    </div>

    <div v-if="showResumeButton" class="px-1 pb-1 pt-2">
      <Button
        type="button"
        class="h-11 w-full bg-amber-600 text-sm font-semibold text-white hover:bg-amber-700"
        :disabled="!props.data.canResume || props.data.resuming"
        @click.stop="props.data.onResume(props.data.node.id)"
      >
        <Check class="size-4" />
        确认继续
      </Button>
    </div>

    <Handle type="source" :position="Position.Right" class="!bg-slate-500" />
  </div>
</template>
