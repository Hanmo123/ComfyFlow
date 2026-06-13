<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import { CirclePause, FileInput, GitMerge, GitBranch, Image, Trash2, Type, Workflow } from 'lucide-vue-next'
import { nodeTypeLabel, type AppGraphNode } from '@/lib/app'

const props = defineProps<{
  node: AppGraphNode
}>()

const store = useAppDesignerStore()

const nodeIcons = {
  input_collect: FileInput,
  output_text: Type,
  output_image: Image,
  manual_gate: CirclePause,
  workflow_run: Workflow,
  coalesce: GitMerge,
  conditional: GitBranch,
} as const
</script>

<template>
  <div
    class="w-[360px] rounded-xl border bg-white text-left transition-colors"
    :class="props.node.id === store.selectedAppNodeId.value ? 'border-slate-900' : 'border-slate-300 hover:border-slate-500'"
    @click="store.selectedAppNodeId.value = props.node.id"
  >
    <Handle type="target" :position="Position.Left" class="!bg-slate-500" />

    <div class="flex items-start gap-3 border-b px-3 py-3">
      <div class="rounded-lg border bg-slate-50 p-2 text-slate-700">
        <component :is="nodeIcons[props.node.type]" class="size-4" />
      </div>
      <div class="min-w-0 flex-1">
        <div class="truncate text-sm font-semibold text-slate-950">
          {{ nodeTypeLabel(props.node.type) }}
        </div>
        <div class="truncate text-xs text-slate-500">{{ props.node.id }}</div>
      </div>
      <Button
        v-if="props.node.type !== 'input_collect'"
        variant="ghost"
        size="icon"
        type="button"
        class="size-8"
        @mousedown.stop
        @click.stop="store.removeAppNode(props.node.id)"
      >
        <Trash2 class="size-4" />
      </Button>
    </div>

    <div class="space-y-3 px-3 py-3 text-xs" @mousedown.stop>
      <AppVariableDefinitionNode v-if="props.node.type === 'input_collect'" />
      <AppOutputNode v-else-if="props.node.type === 'output_text' || props.node.type === 'output_image'" :node="props.node" />
      <AppManualGateNode v-else-if="props.node.type === 'manual_gate'" :node="props.node" />
      <AppWorkflowRunNode v-else-if="props.node.type === 'workflow_run'" :node="props.node" />
      <AppCoalesceNode v-else-if="props.node.type === 'coalesce'" :node="props.node" />
      <AppConditionalNode v-else-if="props.node.type === 'conditional'" :node="props.node" />
    </div>

    <Handle type="source" :position="Position.Right" class="!bg-slate-500" />
  </div>
</template>
