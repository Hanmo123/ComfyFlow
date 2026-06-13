<script setup lang="ts">
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { VueFlow, type Connection, type Edge, type Node, type VueFlowStore } from '@vue-flow/core'
import { CirclePause, GitBranch, GitMerge, Image, Type, Workflow } from 'lucide-vue-next'

const props = defineProps<{
  controlsOffsetLeft?: number
}>()

const store = useAppDesignerStore()
const controlsStyle = computed(() => ({ left: `${props.controlsOffsetLeft ?? 0}px` }))
const fitViewOptions = { padding: 0.2, minZoom: 0.1, maxZoom: 1 }
let flowInstance: VueFlowStore | null = null
let fitFrame: number | null = null

const flowNodes = computed<Node[]>(() =>
  store.appGraph.value.nodes.map((node) => ({
    id: node.id,
    type: 'app',
    position: node.position,
    data: { node },
  })),
)

const flowEdges = computed<Edge[]>(() =>
  store.appGraph.value.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    animated: true,
  })),
)

function onConnect(connection: Connection) {
  if (connection.source && connection.target) store.connectAppNodes(connection.source, connection.target)
}

function onNodeDragStop(event: { node: Node }) {
  store.moveAppNode(event.node.id, event.node.position)
}

function onFlowInit(instance: VueFlowStore) {
  flowInstance = instance
  scheduleFitView()
}

function scheduleFitView() {
  if (!flowInstance || flowNodes.value.length === 0) return
  if (fitFrame !== null) cancelAnimationFrame(fitFrame)
  fitFrame = requestAnimationFrame(() => {
    fitFrame = null
    void flowInstance?.fitView(fitViewOptions)
  })
}

watch(
  () => store.activeApp.value?.id,
  () => {
    void nextTick(scheduleFitView)
  },
)

onBeforeUnmount(() => {
  if (fitFrame !== null) cancelAnimationFrame(fitFrame)
})
</script>

<template>
  <div class="absolute inset-0 z-0">
    <ContextMenu>
      <ContextMenuTrigger as-child>
        <div class="h-full w-full">
          <VueFlow
            :nodes="flowNodes"
            :edges="flowEdges"
            fit-view-on-init
            :min-zoom="0.1"
            :max-zoom="1"
            @init="onFlowInit"
            @nodes-initialized="scheduleFitView"
            @connect="onConnect"
            @node-drag-stop="onNodeDragStop"
          >
            <template #node-app="nodeProps">
              <AppNodeCard :node="nodeProps.data.node" />
            </template>

            <Background pattern-color="#cbd5e1" :gap="24" />
            <Controls :style="controlsStyle" />
          </VueFlow>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent class="w-44">
        <ContextMenuLabel>添加节点</ContextMenuLabel>
        <ContextMenuItem @select="store.addAppNode('workflow_run')">
          <Workflow class="mr-2 size-4" />
          工作流运行
        </ContextMenuItem>
        <ContextMenuItem @select="store.addAppNode('coalesce')">
          <GitMerge class="mr-2 size-4" />
          取非空值
        </ContextMenuItem>
        <ContextMenuItem @select="store.addAppNode('conditional')">
          <GitBranch class="mr-2 size-4" />
          条件执行
        </ContextMenuItem>
        <ContextMenuItem @select="store.addAppNode('manual_gate')">
          <CirclePause class="mr-2 size-4" />
          人工卡点
        </ContextMenuItem>
        <ContextMenuItem @select="store.addAppNode('output_text')">
          <Type class="mr-2 size-4" />
          输出文本
        </ContextMenuItem>
        <ContextMenuItem @select="store.addAppNode('output_image')">
          <Image class="mr-2 size-4" />
          输出图片
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
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
