<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import { Box } from 'lucide-vue-next'
import type {
  NodeDefinition,
  ParsedWorkflowNode,
  WorkflowParameter,
  WorkflowResult,
} from '@/lib/workflow'

const props = defineProps<{
  data: {
    node: ParsedWorkflowNode
    definition: NodeDefinition
    parameters: WorkflowParameter[]
    results: WorkflowResult[]
    onToggleInput: (nodeId: string, field: string) => void
    onToggleOutput: (nodeId: string, slotIndex: number) => void
  }
}>()

const inputEntries = computed(() => Object.entries(props.data.definition.inputs))

function inputVariable(field: string) {
  return props.data.parameters.find((item) => item.nodeId === props.data.node.id && item.field === field)
}

function outputVariable(slotIndex: number) {
  return props.data.results.find((item) => item.nodeId === props.data.node.id && item.slotIndex === slotIndex)
}
</script>

<template>
  <div class="w-[340px] overflow-hidden rounded-xl border border-slate-300 bg-white text-left transition-colors">
    <Handle type="target" :position="Position.Left" class="!bg-slate-500" />

    <div class="flex items-start gap-3 border-b px-3 py-3">
      <div
        class="rounded-lg border bg-slate-50 p-2 text-slate-700"
        :style="{ borderColor: data.definition.color || '#e2e8f0', color: data.definition.color || '#334155' }"
      >
        <Box class="size-4" />
      </div>
      <div class="min-w-0 flex-1">
        <div class="truncate text-sm font-semibold text-slate-950">{{ data.definition.displayName }}</div>
        <div class="mt-0.5 truncate text-xs text-slate-500">#{{ data.node.id }} · {{ data.node.classType }}</div>
      </div>
    </div>

    <div v-if="inputEntries.length > 0" class="space-y-1.5 px-3 py-3">
      <WorkflowNodeFieldRow
        v-for="[field, definition] in inputEntries"
        :key="field"
        :node-id="data.node.id"
        :field="field"
        :definition="definition"
        :value="data.node.fieldValues[field]"
        :variable="inputVariable(field)"
        @toggle="data.onToggleInput(data.node.id, field)"
      />
    </div>

    <div v-if="data.definition.outputs.length > 0" class="space-y-1.5 border-t border-slate-200 bg-slate-50/60 px-3 py-3">
      <WorkflowNodeOutputRow
        v-for="(output, slotIndex) in data.definition.outputs"
        :key="`${slotIndex}-${output.name}`"
        :slot-index="slotIndex"
        :definition="output"
        :variable="outputVariable(slotIndex)"
        @toggle="data.onToggleOutput(data.node.id, slotIndex)"
      />
    </div>

    <Handle type="source" :position="Position.Right" class="!bg-slate-500" />
  </div>
</template>
