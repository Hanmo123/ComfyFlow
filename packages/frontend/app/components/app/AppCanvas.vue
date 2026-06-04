<script setup lang="ts">
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { Handle, Position, VueFlow, type Connection, type Edge, type Node } from '@vue-flow/core'
import { CirclePause, FileInput, FileOutput, Workflow } from 'lucide-vue-next'
import { nodeTypeLabel, type AppGraph, type AppGraphNode, type AppVariable } from '@/lib/app'
import type { WorkflowRecord } from '@/lib/workflow'

const props = defineProps<{
  graph: AppGraph
  variables: AppVariable[]
  workflows: WorkflowRecord[]
  selectedNodeId?: string | null
  controlsOffsetLeft?: number
}>()

const emit = defineEmits<{
  selectNode: [nodeId: string]
  connect: [source: string, target: string]
  moveNode: [nodeId: string, position: { x: number; y: number }]
}>()

const controlsStyle = computed(() => ({ left: `${props.controlsOffsetLeft ?? 0}px` }))

const nodeIcons = {
  input_collect: FileInput,
  output_collect: FileOutput,
  manual_gate: CirclePause,
  workflow_run: Workflow,
} as const

const variableByKey = computed(() => new Map(props.variables.map((variable) => [variable.key, variable])))
const userInputVariables = computed(() => props.variables.filter((variable) => variable.source === 'user_input'))
const workflowById = computed(() => new Map(props.workflows.map((workflow) => [workflow.id, workflow])))

const flowNodes = computed<Node[]>(() =>
  props.graph.nodes.map((node) => ({
    id: node.id,
    type: 'app',
    position: node.position,
    data: { node },
  }))
)

const flowEdges = computed<Edge[]>(() =>
  props.graph.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    animated: true,
  }))
)

function onConnect(connection: Connection) {
  if (connection.source && connection.target) emit('connect', connection.source, connection.target)
}

function onNodeDragStop(event: { node: Node }) {
  emit('moveNode', event.node.id, event.node.position)
}

function variableLabel(varKey?: string | null) {
  if (!varKey) return '未设置'
  return variableByKey.value.get(varKey)?.name ?? varKey
}

function workflowOf(node: AppGraphNode) {
  if (node.type !== 'workflow_run' || !node.data.workflowId) return null
  return workflowById.value.get(node.data.workflowId) ?? null
}
</script>

<template>
  <div class="fixed inset-0 z-0">
    <VueFlow
      :nodes="flowNodes"
      :edges="flowEdges"
      fit-view-on-init
      @connect="onConnect"
      @node-drag-stop="onNodeDragStop"
    >
      <template #node-app="nodeProps">
        <button
          type="button"
          class="w-80 rounded-xl border bg-white text-left transition-colors"
          :class="nodeProps.data.node.id === selectedNodeId ? 'border-slate-900' : 'border-slate-300 hover:border-slate-500'"
          @click="emit('selectNode', nodeProps.data.node.id)"
        >
          <Handle type="target" :position="Position.Left" class="!bg-slate-500" />

          <div class="flex items-start gap-3 border-b px-3 py-3">
            <div class="rounded-lg border bg-slate-50 p-2 text-slate-700">
              <component :is="nodeIcons[nodeProps.data.node.type as keyof typeof nodeIcons]" class="size-4" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="truncate text-sm font-semibold text-slate-950">{{ nodeTypeLabel(nodeProps.data.node.type) }}</div>
              <div class="truncate text-xs text-slate-500">{{ nodeProps.data.node.id }}</div>
            </div>
          </div>

          <div class="space-y-2 px-3 py-3 text-xs">
            <div v-if="nodeProps.data.node.type === 'input_collect'">
              <div v-if="userInputVariables.length === 0" class="rounded border border-dashed px-2 py-2 text-slate-400">
                尚未定义用户输入变量
              </div>
              <div v-else class="space-y-1">
                <div
                  v-for="variable in userInputVariables.slice(0, 5)"
                  :key="variable.key"
                  class="flex items-center justify-between gap-2 rounded bg-slate-50 px-2 py-1.5"
                >
                  <span class="truncate text-slate-700">${{ variable.name }}</span>
                  <span class="text-[10px] text-slate-400">{{ variable.type }}</span>
                </div>
                <div v-if="userInputVariables.length > 5" class="text-[10px] text-slate-400">
                  ...共 {{ userInputVariables.length }} 个
                </div>
              </div>
            </div>

            <div v-else-if="nodeProps.data.node.type === 'output_collect'">
              <div
                v-if="nodeProps.data.node.data.displayVars.length === 0"
                class="rounded border border-dashed px-2 py-2 text-slate-400"
              >
                未选择输出变量
              </div>
              <div v-else class="space-y-1">
                <div
                  v-for="varKey in nodeProps.data.node.data.displayVars.slice(0, 5)"
                  :key="varKey"
                  class="rounded bg-emerald-50 px-2 py-1.5 text-emerald-700"
                >
                  ${{ variableLabel(varKey) }}
                </div>
              </div>
            </div>

            <div v-else-if="nodeProps.data.node.type === 'manual_gate'" class="space-y-1.5">
              <div class="font-medium text-slate-700">
                {{ nodeProps.data.node.data.title || '人工卡点' }}
              </div>
              <div v-if="nodeProps.data.node.data.description" class="line-clamp-2 text-slate-500">
                {{ nodeProps.data.node.data.description }}
              </div>
              <div v-if="nodeProps.data.node.data.displayVars.length > 0" class="flex flex-wrap gap-1">
                <span
                  v-for="varKey in nodeProps.data.node.data.displayVars"
                  :key="varKey"
                  class="rounded bg-amber-50 px-1.5 py-0.5 text-amber-700"
                >
                  ${{ variableLabel(varKey) }}
                </span>
              </div>
            </div>

            <div v-else-if="nodeProps.data.node.type === 'workflow_run'" class="space-y-2">
              <div
                v-if="!workflowOf(nodeProps.data.node)"
                class="rounded border border-dashed px-2 py-2 text-slate-400"
              >
                未选择工作流
              </div>
              <template v-else>
                <div class="truncate font-medium text-slate-700">
                  {{ workflowOf(nodeProps.data.node)?.name || `未命名工作流 #${workflowOf(nodeProps.data.node)?.id}` }}
                </div>
                <div v-if="workflowOf(nodeProps.data.node)?.parameters.length" class="space-y-1">
                  <div class="text-[10px] uppercase tracking-wide text-slate-400">参数</div>
                  <div
                    v-for="parameter in workflowOf(nodeProps.data.node)?.parameters"
                    :key="parameter.key"
                    class="flex items-center gap-1.5 rounded bg-indigo-50 px-2 py-1.5 text-indigo-700"
                  >
                    <span class="shrink-0">{{ parameter.name }}</span>
                    <span class="text-indigo-400">←</span>
                    <span class="truncate">
                      ${{ variableLabel(nodeProps.data.node.data.inputBindings[parameter.key]?.varKey) }}
                    </span>
                  </div>
                </div>
                <div v-if="workflowOf(nodeProps.data.node)?.results.length" class="space-y-1">
                  <div class="text-[10px] uppercase tracking-wide text-slate-400">结果</div>
                  <div
                    v-for="result in workflowOf(nodeProps.data.node)?.results"
                    :key="result.key"
                    class="flex items-center gap-1.5 rounded bg-emerald-50 px-2 py-1.5 text-emerald-700"
                  >
                    <span class="shrink-0">{{ result.name }}</span>
                    <span class="text-emerald-400">→</span>
                    <span class="truncate">
                      ${{ variableLabel(nodeProps.data.node.data.outputAssignments[result.key]) }}
                    </span>
                  </div>
                </div>
              </template>
            </div>
          </div>

          <Handle type="source" :position="Position.Right" class="!bg-slate-500" />
        </button>
      </template>

      <Background pattern-color="#cbd5e1" :gap="24" />
      <Controls :style="controlsStyle" />
    </VueFlow>
  </div>
</template>

<style>
.vue-flow__node-app {
  padding: 0;
  border: none;
  background: transparent;
  font-family: inherit;
  width: auto;
}
</style>
