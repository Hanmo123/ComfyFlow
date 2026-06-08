<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
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
  <div class="w-72 overflow-hidden rounded-lg border border-slate-300 bg-white">
    <Handle type="target" :position="Position.Left" class="!bg-slate-500" />

    <div class="border-b px-3 py-2" :style="{ borderTop: `4px solid ${data.definition.color || '#64748b'}` }">
      <div class="truncate text-sm font-semibold text-slate-950">{{ data.definition.displayName }}</div>
      <div class="truncate text-xs text-slate-500">#{{ data.node.id }} · {{ data.node.classType }}</div>
    </div>

    <div class="space-y-2 p-3">
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

    <div v-if="data.definition.outputs.length > 0" class="space-y-2 border-t border-slate-200 bg-slate-50 p-3">
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
