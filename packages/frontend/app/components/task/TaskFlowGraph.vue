<script setup lang="ts">
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { VueFlow, type Edge, type Node } from '@vue-flow/core'
import TaskNodeCard from '@/components/task/TaskNodeCard.vue'
import type { AppTaskRecord } from '@/lib/app'

const props = defineProps<{
  task: AppTaskRecord | null
  retryingNodeId?: string | null
  resumingNodeId?: string | null
  shiftPressed?: boolean
}>()

const emit = defineEmits<{
  retry: [nodeId: string, event?: MouseEvent]
  resume: [nodeId: string]
}>()

const nodeRunById = computed(() => new Map((props.task?.nodeRuns ?? []).map((nodeRun) => [nodeRun.nodeId, nodeRun])))
const taskBusy = computed(() => Boolean(props.task && ['queued', 'running'].includes(props.task.status)))
const canRetry = computed(() => Boolean(props.task && (!taskBusy.value || props.shiftPressed)))
const canResume = computed(() => props.task?.status === 'waiting')

const flowNodes = computed<Node[]>(() =>
  (props.task?.appSnapshot.graph.nodes ?? []).map((node) => ({
    id: node.id,
    type: 'task',
    position: node.position,
    data: {
      node,
      nodeRun: nodeRunById.value.get(node.id),
      taskVariables: props.task?.variables ?? {},
      appVariables: props.task?.appSnapshot.variables ?? [],
      canRetry: canRetry.value,
      retrying: props.retryingNodeId === node.id,
      canResume: canResume.value,
      resuming: props.resumingNodeId === node.id,
      onRetry: (nodeId: string, event?: MouseEvent) => emit('retry', nodeId, event),
      onResume: (nodeId: string) => emit('resume', nodeId),
    },
  })),
)

const flowEdges = computed<Edge[]>(() =>
  (props.task?.appSnapshot.graph.edges ?? []).map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    animated: true,
  })),
)
</script>

<template>
  <div class="h-full w-full">
    <VueFlow :nodes="flowNodes" :edges="flowEdges" fit-view-on-init :nodes-draggable="false" :nodes-connectable="false">
      <template #node-task="nodeProps">
        <TaskNodeCard :data="nodeProps.data" />
      </template>

      <Background pattern-color="#cbd5e1" :gap="24" />
      <Controls />
    </VueFlow>
  </div>
</template>

<style>
.vue-flow__node-task {
  padding: 0;
  border: none;
  background: transparent;
  font-family: inherit;
  width: auto;
}
</style>
