<script setup lang="ts">
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import { VueFlow, type Edge, type Node } from '@vue-flow/core'
import type {
  NodeDefinition,
  ParsedWorkflowGraph,
  WorkflowParameter,
  WorkflowResult,
} from '@/lib/workflow'

const props = defineProps<{
  graph?: ParsedWorkflowGraph
  nodeDefinitions: Record<string, NodeDefinition>
  parameters: WorkflowParameter[]
  results: WorkflowResult[]
  fullscreen?: boolean
  controlsOffsetLeft?: number
}>()

const controlsStyle = computed(() => ({
  left: `${props.controlsOffsetLeft ?? 0}px`,
}))

const emit = defineEmits<{
  toggleInput: [nodeId: string, field: string]
  toggleOutput: [nodeId: string, slotIndex: number]
}>()

const flowNodes = computed<Node[]>(() =>
  (props.graph?.nodes ?? []).map((node) => ({
    id: node.id,
    type: 'comfy',
    position: node.position,
    data: {
      node,
      definition: props.nodeDefinitions[node.classType],
      parameters: props.parameters,
      results: props.results,
      onToggleInput: (nodeId: string, field: string) => emit('toggleInput', nodeId, field),
      onToggleOutput: (nodeId: string, slotIndex: number) => emit('toggleOutput', nodeId, slotIndex),
    },
  }))
)

const flowEdges = computed<Edge[]>(() =>
  (props.graph?.edges ?? []).map((edge) => ({
    id: edge.id,
    source: edge.from,
    target: edge.to,
    label: edge.toField,
    animated: true,
  }))
)
</script>

<template>
  <div :class="props.fullscreen ? 'fixed inset-0 z-0' : 'h-full w-full'">
    <VueFlow :nodes="flowNodes" :edges="flowEdges" fit-view-on-init>
      <template #node-comfy="nodeProps">
        <WorkflowNodeCard :data="nodeProps.data" />
      </template>

      <Background pattern-color="#cbd5e1" :gap="24" />
      <Controls :style="controlsStyle" />
      <MiniMap pannable zoomable />
    </VueFlow>
  </div>
</template>
