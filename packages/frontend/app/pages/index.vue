<script setup lang="ts">
import type {
  NodeDefinition,
  ParsedWorkflowGraph,
  WorkflowDetailResponse,
  WorkflowInputVariable,
  WorkflowOutputVariable,
  WorkflowRecord,
} from '@/lib/workflow'

const section = ref<'workflow' | 'app' | 'task'>('workflow')
const workflows = ref<WorkflowRecord[]>([])
const activeWorkflow = ref<WorkflowRecord | null>(null)
const graph = ref<ParsedWorkflowGraph | undefined>()
const nodeDefinitions = ref<Record<string, NodeDefinition>>({})
const inputs = ref<WorkflowInputVariable[]>([])
const outputs = ref<WorkflowOutputVariable[]>([])
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const saveDialogOpen = ref(false)

const api = useWorkflowApi()

const panelTitle = computed(() => {
  if (section.value === 'workflow') return activeWorkflow.value?.name || (activeWorkflow.value ? `未命名工作流 #${activeWorkflow.value.id}` : '工作流')
  if (section.value === 'app') return '应用编排'
  return '任务'
})

onMounted(async () => {
  await refreshWorkflows()
})

async function refreshWorkflows() {
  workflows.value = await api.listWorkflows()
}

function applyDetail(detail: WorkflowDetailResponse) {
  activeWorkflow.value = detail.workflow
  graph.value = detail.graph
  nodeDefinitions.value = detail.nodeDefinitions
  inputs.value = [...(detail.workflow.inputs ?? [])]
  outputs.value = [...(detail.workflow.outputs ?? [])]
}

async function upload(rawJson: Record<string, unknown>) {
  try {
    loading.value = true
    error.value = ''
    const detail = await api.uploadWorkflow(rawJson)
    applyDetail(detail)
    await refreshWorkflows()
  } catch (uploadError) {
    error.value = uploadError instanceof Error ? uploadError.message : '上传失败'
  } finally {
    loading.value = false
  }
}

async function selectWorkflow(id: number) {
  try {
    loading.value = true
    error.value = ''
    const detail = await api.getWorkflow(id)
    applyDetail(detail)
  } catch (selectError) {
    error.value = selectError instanceof Error ? selectError.message : '加载工作流失败'
  } finally {
    loading.value = false
  }
}

function backToWorkflowList() {
  activeWorkflow.value = null
  graph.value = undefined
  nodeDefinitions.value = {}
  inputs.value = []
  outputs.value = []
  error.value = ''
}

function toggleInput(nodeId: string, field: string) {
  const key = `${nodeId}.${field}`
  const existing = inputs.value.findIndex((item) => item.key === key)
  if (existing >= 0) {
    inputs.value.splice(existing, 1)
    return
  }

  const node = graph.value?.nodes.find((item) => item.id === nodeId)
  const definition = node ? nodeDefinitions.value[node.classType]?.inputs[field] : undefined
  if (!node || !definition) return

  inputs.value.push({
    key,
    nodeId,
    field,
    label: field,
    type: definition.type,
    default: node.fieldValues[field],
  })
}

function toggleOutput(nodeId: string, slotIndex: number) {
  const key = `${nodeId}.${slotIndex}`
  const existing = outputs.value.findIndex((item) => item.key === key)
  if (existing >= 0) {
    outputs.value.splice(existing, 1)
    return
  }

  const node = graph.value?.nodes.find((item) => item.id === nodeId)
  const definition = node ? nodeDefinitions.value[node.classType]?.outputs[slotIndex] : undefined
  if (!node || !definition) return

  outputs.value.push({
    key,
    nodeId,
    slotIndex,
    label: definition.name.toLowerCase(),
    type: definition.type,
  })
}

function renameInput(key: string, label: string) {
  const item = inputs.value.find((input) => input.key === key)
  if (item) item.label = label
}

function renameOutput(key: string, label: string) {
  const item = outputs.value.find((output) => output.key === key)
  if (item) item.label = label
}

async function saveWorkflow(name: string) {
  if (!activeWorkflow.value) return
  try {
    saving.value = true
    error.value = ''
    const detail = await api.saveWorkflow(activeWorkflow.value.id, {
      name,
      inputs: inputs.value,
      outputs: outputs.value,
    })
    applyDetail(detail)
    saveDialogOpen.value = false
    await refreshWorkflows()
  } catch (saveError) {
    error.value = saveError instanceof Error ? saveError.message : '保存失败'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <LayoutAppShell :workflow-mode="section === 'workflow'">
    <template #rail>
      <LayoutSidebarRail :active="section" @select="section = $event" />
    </template>

    <template #panel>
      <LayoutSidebarPanel :title="panelTitle">
        <template v-if="section === 'workflow' && activeWorkflow" #header-leading>
          <button
            class="rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-600 hover:bg-slate-50"
            type="button"
            @click="backToWorkflowList"
          >
            返回
          </button>
        </template>
        <template v-if="section === 'workflow' && activeWorkflow" #header-actions>
          <button
            class="rounded-lg bg-slate-950 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            type="button"
            :disabled="saving"
            @click="saveDialogOpen = true"
          >
            保存
          </button>
        </template>
        <WorkflowSidebar
          v-if="section === 'workflow' && !activeWorkflow"
          :workflows="workflows"
          :active-id="activeWorkflow?.id"
          :loading="loading"
          @upload="upload"
          @select="selectWorkflow"
        />
        <div v-else-if="section === 'workflow'" class="flex flex-1 flex-col gap-3 overflow-y-auto p-3">
          <div class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
            {{ graph?.nodes.length || 0 }} 个节点 · {{ graph?.edges.length || 0 }} 条连接
          </div>
          <WorkflowInputsPanel
            :inputs="inputs"
            @rename="renameInput"
            @remove="inputs = inputs.filter((item) => item.key !== $event)"
          />
          <WorkflowOutputsPanel
            :outputs="outputs"
            @rename="renameOutput"
            @remove="outputs = outputs.filter((item) => item.key !== $event)"
          />
        </div>
        <div v-else class="p-4 text-sm text-slate-500">{{ panelTitle }}功能开发中。</div>
      </LayoutSidebarPanel>
    </template>

    <div v-if="section !== 'workflow'" class="flex h-full items-center justify-center text-slate-500">
      {{ panelTitle }}功能开发中
    </div>

    <div v-else-if="!activeWorkflow" class="h-full" />

    <div v-else class="relative h-full">
      <div v-if="error" class="absolute bottom-4 left-4 z-20 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 shadow-sm">
        {{ error }}
      </div>

      <WorkflowGraph
        :graph="graph"
        :node-definitions="nodeDefinitions"
        :inputs="inputs"
        :outputs="outputs"
        fullscreen
        :controls-offset-left="356"
        @toggle-input="toggleInput"
        @toggle-output="toggleOutput"
      />

      <WorkflowSaveWorkflowDialog
        :open="saveDialogOpen"
        :initial-name="activeWorkflow.name"
        :saving="saving"
        @close="saveDialogOpen = false"
        @save="saveWorkflow"
      />
    </div>
  </LayoutAppShell>
</template>
