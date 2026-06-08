<script setup lang="ts">
import { ArrowLeft, Pencil, Save, Settings2, Trash2 } from 'lucide-vue-next'
import type {
  InputFieldDefinition,
  OutputSlotDefinition,
  WorkflowDetailResponse,
  WorkflowParameter,
  WorkflowRecord,
  WorkflowResult,
} from '@/lib/workflow'

const route = useRoute()
const workflowApi = useWorkflowApi()

const activeDetail = ref<WorkflowDetailResponse | null>(null)
const parameters = ref<WorkflowParameter[]>([])
const results = ref<WorkflowResult[]>([])
const loading = ref(false)
const saving = ref(false)
const saveDialogOpen = ref(false)
const saveDialogMode = ref<'save' | 'rename'>('save')
const panelOpen = ref(true)
const error = ref('')

const workflowId = computed(() => Number(route.params.id))
const activeWorkflow = computed(() => activeDetail.value?.workflow ?? null)
const duplicateNames = computed(() => findDuplicateDraftNames([...parameters.value, ...results.value]))

onMounted(() => {
  loadWorkflow()
})

async function loadWorkflow() {
  if (!Number.isFinite(workflowId.value)) {
    error.value = '工作流 ID 无效'
    return
  }

  await withLoading(async () => {
    applyDetail(await workflowApi.getWorkflow(workflowId.value))
  }, '加载工作流失败')
}

async function saveWorkflow(name: string) {
  if (!activeWorkflow.value || saving.value) return

  const normalizedParameters = normalizeDraftVariables(parameters.value)
  const normalizedResults = normalizeDraftVariables(results.value)
  const invalidMessage = validateDraftVariables([...normalizedParameters, ...normalizedResults])
  if (invalidMessage) {
    error.value = invalidMessage
    return
  }

  try {
    saving.value = true
    error.value = ''
    const detail = await workflowApi.saveWorkflow(activeWorkflow.value.id, {
      name,
      parameters: normalizedParameters,
      results: normalizedResults,
    })
    applyDetail(detail)
    saveDialogOpen.value = false
  } catch (saveError) {
    error.value = saveError instanceof Error ? saveError.message : '保存工作流失败'
  } finally {
    saving.value = false
  }
}

async function quickSaveWorkflow() {
  if (saving.value) return
  if (!activeWorkflow.value) {
    error.value = '工作流尚未加载完成'
    return
  }

  if (!activeWorkflow.value.name) {
    openSaveDialog()
    return
  }

  await saveWorkflow(activeWorkflow.value.name)
}

function openSaveDialog() {
  if (saving.value) return
  if (!activeWorkflow.value) {
    error.value = '工作流尚未加载完成'
    return
  }

  const invalidMessage = validateDraftVariables([...parameters.value, ...results.value])
  if (invalidMessage) {
    error.value = invalidMessage
    panelOpen.value = true
    return
  }

  error.value = ''
  saveDialogMode.value = 'save'
  saveDialogOpen.value = true
}

function openRenameDialog() {
  if (saving.value) return
  if (!activeWorkflow.value) {
    error.value = '工作流尚未加载完成'
    return
  }

  error.value = ''
  saveDialogMode.value = 'rename'
  saveDialogOpen.value = true
}

async function submitWorkflowDialog(name: string) {
  if (saveDialogMode.value === 'rename') {
    await renameWorkflow(name)
    return
  }

  await saveWorkflow(name)
}

async function renameWorkflow(name: string) {
  if (!activeWorkflow.value || saving.value) return

  try {
    saving.value = true
    error.value = ''
    const detail = await workflowApi.renameWorkflow(activeWorkflow.value.id, name)
    applyDetail(detail)
    saveDialogOpen.value = false
  } catch (renameError) {
    error.value = renameError instanceof Error ? renameError.message : '重命名工作流失败'
  } finally {
    saving.value = false
  }
}

async function deleteActiveWorkflow() {
  if (!activeWorkflow.value) return
  const confirmed = window.confirm(`确定删除 ${workflowTitle(activeWorkflow.value)}？`)
  if (!confirmed) return

  await withLoading(async () => {
    await workflowApi.deleteWorkflow(activeWorkflow.value!.id)
    await navigateTo('/workflows')
  }, '删除工作流失败')
}

function applyDetail(detail: WorkflowDetailResponse) {
  activeDetail.value = detail
  parameters.value = clonePlain(detail.workflow.parameters ?? [])
  results.value = clonePlain(detail.workflow.results ?? [])
}

function toggleInput(nodeId: string, field: string) {
  const existing = parameters.value.find((item) => item.nodeId === nodeId && item.field === field)
  if (existing) {
    parameters.value = parameters.value.filter((item) => item !== existing)
    return
  }

  const node = activeDetail.value?.graph.nodes.find((item) => item.id === nodeId)
  const definition = node ? activeDetail.value?.nodeDefinitions[node.classType]?.inputs[field] : undefined
  if (!node || !definition?.promotable) return

  parameters.value.push({
    key: `input:${nodeId}:${field}`,
    nodeId,
    field,
    name: nextVariableName(field),
    type: definition.type,
    default: defaultFieldValue(definition, node.fieldValues[field]),
  })
}

function toggleOutput(nodeId: string, slotIndex: number) {
  const existing = results.value.find((item) => item.nodeId === nodeId && item.slotIndex === slotIndex)
  if (existing) {
    results.value = results.value.filter((item) => item !== existing)
    return
  }

  const output = outputDefinition(nodeId, slotIndex)
  if (!output?.exposable) return

  results.value.push({
    key: `output:${nodeId}:${slotIndex}`,
    nodeId,
    slotIndex,
    name: nextVariableName(output.name || `output_${slotIndex}`),
    type: output.type,
  })
}

function renameParameter(key: string, name: string) {
  const parameter = parameters.value.find((item) => item.key === key)
  if (parameter) parameter.name = name
}

function renameResult(key: string, name: string) {
  const result = results.value.find((item) => item.key === key)
  if (result) result.name = name
}

function outputDefinition(nodeId: string, slotIndex: number): OutputSlotDefinition | undefined {
  const node = activeDetail.value?.graph.nodes.find((item) => item.id === nodeId)
  if (!node) return undefined
  return activeDetail.value?.nodeDefinitions[node.classType]?.outputs[slotIndex]
}

function defaultFieldValue(definition: InputFieldDefinition, value: unknown) {
  if (Array.isArray(value)) return definition.default
  return value ?? definition.default
}

function nextVariableName(base: string) {
  const normalizedBase = normalizeVariableName(base) || 'VAR'
  const names = new Set([...parameters.value, ...results.value].map((item) => normalizeVariableName(item.name)))
  if (!names.has(normalizedBase)) return normalizedBase

  let index = 2
  while (names.has(`${normalizedBase}_${index}`)) index += 1
  return `${normalizedBase}_${index}`
}

function normalizeDraftVariables<T extends WorkflowParameter | WorkflowResult>(items: T[]) {
  return items.map((item) => ({ ...item, name: normalizeVariableName(item.name) }))
}

function validateDraftVariables(items: Array<WorkflowParameter | WorkflowResult>) {
  if (items.some((item) => !normalizeVariableName(item.name))) return '变量名不能为空'
  if (findDuplicateDraftNames(items).length > 0) return '变量名不能重复'
  return ''
}

function findDuplicateDraftNames(items: Array<WorkflowParameter | WorkflowResult>) {
  const counts = new Map<string, number>()
  for (const item of items) {
    const name = normalizeVariableName(item.name)
    if (!name) continue
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  return items
    .filter((item) => {
      const name = normalizeVariableName(item.name)
      return name && (counts.get(name) ?? 0) > 1
    })
    .map((item) => item.name)
}

function normalizeVariableName(value: string) {
  return value.trim().replace(/^\$+/, '').trim()
}

function clonePlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function workflowTitle(workflow: WorkflowRecord) {
  return workflow.name || `未命名工作流 #${workflow.id}`
}

async function withLoading(action: () => Promise<void>, message: string) {
  try {
    loading.value = true
    error.value = ''
    await action()
  } catch (actionError) {
    error.value = actionError instanceof Error ? actionError.message : message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="h-svh overflow-hidden bg-white text-slate-950">
    <div class="relative h-full">
      <WorkflowGraph
        v-if="activeDetail"
        :graph="activeDetail.graph"
        :node-definitions="activeDetail.nodeDefinitions"
        :parameters="parameters"
        :results="results"
        fullscreen
        @toggle-input="toggleInput"
        @toggle-output="toggleOutput"
      />
      <div v-else class="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-slate-500">
        {{ error || '请选择有效工作流。' }}
      </div>

      <div class="pointer-events-none absolute left-4 top-4 z-30 flex max-w-[calc(100%-2rem)] items-center gap-2">
        <div class="pointer-events-auto">
        <LayoutAppNavigationMenu />
        </div>
        <Button class="pointer-events-auto" variant="outline" type="button" @click="navigateTo('/workflows')">
          <ArrowLeft class="size-4" />
          返回列表
        </Button>
        <div v-if="activeWorkflow" class="pointer-events-auto hidden min-w-0 max-w-96 items-baseline gap-2 rounded-md border bg-white px-3 py-2 text-sm sm:flex">
          <div class="min-w-0 truncate font-medium">{{ workflowTitle(activeWorkflow) }}</div>
          <div class="shrink-0 whitespace-nowrap text-xs text-slate-500">#{{ activeWorkflow.id }} · {{ activeWorkflow.status }}</div>
          <Button variant="ghost" size="icon" type="button" :disabled="saving" aria-label="重命名工作流" @click="openRenameDialog">
            <Pencil class="size-3.5" />
          </Button>
        </div>
      </div>

      <div v-if="activeWorkflow" class="pointer-events-none absolute right-4 top-4 z-30 flex items-center gap-2">
        <Button class="pointer-events-auto" variant="outline" size="icon" type="button" aria-label="配置工作流" @click="panelOpen = !panelOpen">
          <Settings2 class="size-4" />
        </Button>
        <button
          type="button"
          class="pointer-events-auto inline-flex h-9 items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:pointer-events-none disabled:opacity-50"
          :disabled="saving"
          @pointerdown.stop
          @click.stop="quickSaveWorkflow"
        >
          <Save class="size-4" />
          保存
        </button>
        <Button class="pointer-events-auto" variant="outline" size="icon" type="button" :disabled="loading" aria-label="删除工作流" @click="deleteActiveWorkflow">
          <Trash2 class="size-4" />
        </Button>
      </div>

      <aside
        v-if="activeDetail && activeWorkflow && panelOpen"
        class="absolute bottom-4 right-4 top-20 z-20 flex w-[min(22rem,calc(100%-2rem))] flex-col overflow-hidden rounded-xl border bg-white"
      >
        <div class="border-b px-3 py-3">
          <div class="truncate text-sm font-medium">输入输出配置</div>
          <div class="mt-1 text-xs text-slate-500">点击画布节点上的按钮添加或移除参数与结果。</div>
        </div>
        <div class="flex-1 space-y-5 overflow-y-auto p-3">
          <WorkflowInputsPanel :parameters="parameters" :duplicate-names="duplicateNames" @rename="renameParameter" />
          <WorkflowOutputsPanel :results="results" :duplicate-names="duplicateNames" @rename="renameResult" />
        </div>
      </aside>

      <div
        v-if="error && activeDetail"
        class="absolute bottom-4 left-4 z-30 max-w-md rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
      >
        {{ error }}
      </div>

      <WorkflowSaveWorkflowDialog
        :open="saveDialogOpen"
        :initial-name="activeWorkflow?.name || ''"
        :saving="saving"
        :title="saveDialogMode === 'rename' ? '重命名工作流' : '保存工作流'"
        :description="saveDialogMode === 'rename' ? '输入新的工作流名称。' : '输入工作流名称，当前输入/输出变量配置将一起保存。'"
        :submit-label="saveDialogMode === 'rename' ? '重命名' : '保存'"
        @close="saveDialogOpen = false"
        @save="submitWorkflowDialog"
      />
    </div>
  </main>
</template>
