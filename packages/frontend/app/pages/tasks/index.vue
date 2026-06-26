<script setup lang="ts">
import { toast } from 'vue-sonner'
import { ArrowLeft, ChevronDown, FolderOpen, Image, LayoutGrid, MoreVertical, Pencil, RefreshCw, RotateCw, Trash2, Wrench } from 'lucide-vue-next'
import TaskFlowGraph from '@/components/task/TaskFlowGraph.vue'
import TaskOutputImages from '@/components/task/TaskOutputImages.vue'
import { APP_VARIABLE_TYPE_LABELS, type AppTaskRecord, type AppVariable, type TaskGroupRecord } from '@/lib/app'

const route = useRoute()
const router = useRouter()
const appApi = useAppApi()
const libraryApi = useLibraryApi()
const { loadPreferredTaskGroupId, setPreferredTaskGroupId } = useTaskGroupPreference()

const taskGroups = ref<TaskGroupRecord[]>([])
const tasks = ref<AppTaskRecord[]>([])
const selectedGroupId = ref<number | null>(null)
const selectedTaskId = ref<number | null>(null)
const showingGroupPicker = ref(false)
const error = ref('')
const retryingTask = ref(false)
const savingInputs = ref(false)
const deletingTask = ref(false)
const syncingSnapshot = ref(false)
const repairingLogic = ref(false)
const editingInputs = ref(false)
const shiftPressed = ref(false)
const editTextValues = ref<Record<string, string>>({})
const editFileValues = ref<Record<string, File | null>>({})
const editPreviousImageValues = ref<Record<string, unknown | null>>({})
const retryingNodeId = ref<string | null>(null)
const resumingNodeId = ref<string | null>(null)
const movingTaskToGroup = ref(false)
const thumbnailImages = ref<Record<string, { hash: string; url: string; localUrl: string }>>({})
const proxyImages = ref<Record<string, { hash: string; url: string; localUrl: string }>>({})
const taskRealtime = useTaskRealtime({
  onOpen: () => {
    if (selectedGroupId.value && !showingGroupPicker.value) void refreshTasks()
  },
  onTaskCreated: (task) => upsertTask(task),
  onTaskUpdated: (task) => upsertTask(task),
  onTaskDeleted: ({ taskId, taskGroupId }) => removeTask(taskId, taskGroupId),
})

const selectedGroup = computed(() => taskGroups.value.find((group) => group.id === selectedGroupId.value) ?? null)
const selectedTask = computed(() => tasks.value.find((task) => task.id === selectedTaskId.value) ?? null)
const selectedTaskBusy = computed(() => Boolean(selectedTask.value && ['queued', 'running'].includes(selectedTask.value.status)))
const retryTaskDisabled = computed(() => retryingTask.value || (selectedTaskBusy.value && !shiftPressed.value))
const deleteTaskDisabled = computed(() => deletingTask.value || (selectedTaskBusy.value && !shiftPressed.value))
const syncSnapshotDisabled = computed(() => syncingSnapshot.value || (selectedTaskBusy.value && !shiftPressed.value))
const repairLogicDisabled = computed(() => repairingLogic.value || selectedTaskBusy.value)
const userInputVariables = computed(() => selectedTask.value?.appSnapshot.variables.filter((variable) => variable.source === 'user_input') ?? [])
const thumbnailImageHashes = computed(() => {
  const hashes = new Set<string>()
  for (const task of tasks.value) collectTaskImageHashes(task, hashes)
  return [...hashes]
})

onMounted(async () => {
  window.addEventListener('keydown', handleGlobalKeydown)
  window.addEventListener('keyup', updateShiftPressed)
  window.addEventListener('blur', clearShiftPressed)
  await initializePage()
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown)
  window.removeEventListener('keyup', updateShiftPressed)
  window.removeEventListener('blur', clearShiftPressed)
  stopRealtime()
})

watch(selectedGroupId, () => {
  startRealtime()
})

watch(
  thumbnailImageHashes,
  async (hashes) => {
    thumbnailImages.value = {}
    proxyImages.value = {}
    if (hashes.length === 0) return
    try {
      const [thumbnails, proxies] = await Promise.all([
        libraryApi.getMediaAssetThumbnails(hashes),
        libraryApi.getMediaAssetProxies(hashes),
      ])
      thumbnailImages.value = thumbnails
      proxyImages.value = proxies
    } catch (thumbnailError) {
      console.error(thumbnailError)
    }
  },
  { immediate: true },
)

async function refreshTasks() {
  if (!selectedGroupId.value) {
    tasks.value = []
    selectedTaskId.value = null
    return
  }

  try {
    error.value = ''
    tasks.value = await appApi.listTasks(selectedGroupId.value)
    selectInitialTask()
    await syncTaskRoute()
  } catch (loadError) {
    error.value = loadError instanceof Error ? loadError.message : '加载任务失败'
    toast.error(error.value)
  }
}

async function initializePage() {
  try {
    error.value = ''
    taskGroups.value = await appApi.listTaskGroups()
    const groupId = initialGroupId()
    if (!groupId) {
      showingGroupPicker.value = true
      return
    }
    await selectGroup(groupId, queryTaskId())
  } catch (loadError) {
    error.value = loadError instanceof Error ? loadError.message : '加载任务分组失败'
    showingGroupPicker.value = true
    toast.error(error.value)
  }
}

function initialGroupId() {
  const routeGroupId = Number(route.query.groupId)
  const queryGroup = taskGroups.value.find((group) => group.id === routeGroupId)
  const preferredGroupId = loadPreferredTaskGroupId()
  const preferredGroup = taskGroups.value.find((group) => group.id === preferredGroupId)
  return queryGroup?.id ?? preferredGroup?.id ?? taskGroups.value[0]?.id ?? null
}

function queryTaskId() {
  const taskId = Number(route.query.taskId)
  return Number.isFinite(taskId) && taskId > 0 ? taskId : undefined
}

function selectInitialTask() {
  if (selectedTaskId.value && tasks.value.some((task) => task.id === selectedTaskId.value)) return
  const taskId = queryTaskId()
  const task = tasks.value.find((item) => item.id === taskId) ?? tasks.value[0]
  selectedTaskId.value = task?.id ?? null
}

async function openGroupPicker() {
  stopRealtime()
  showingGroupPicker.value = true
  selectedTaskId.value = null
  await router.replace({ path: '/tasks' })
}

async function selectGroup(groupId: number, taskId?: number) {
  selectedGroupId.value = groupId
  setPreferredTaskGroupId(groupId)
  selectedTaskId.value = null
  showingGroupPicker.value = false
  await router.replace({ path: '/tasks', query: { groupId, ...(taskId ? { taskId } : {}) } })
  await refreshTasks()
  startRealtime()
}

async function selectTask(taskId: number) {
  selectedTaskId.value = taskId
  await syncTaskRoute()
}

function selectAdjacentTask(direction: -1 | 1) {
  if (showingGroupPicker.value || tasks.value.length === 0) return false
  const currentIndex = tasks.value.findIndex((task) => task.id === selectedTaskId.value)
  const nextIndex = currentIndex < 0 ? 0 : currentIndex + direction
  const nextTask = tasks.value[nextIndex]
  if (!nextTask || nextTask.id === selectedTaskId.value) return false
  void selectTask(nextTask.id)
  return true
}

async function syncTaskRoute() {
  if (showingGroupPicker.value || !selectedGroupId.value) return
  await router.replace({
    path: '/tasks',
    query: { groupId: selectedGroupId.value, ...(selectedTaskId.value ? { taskId: selectedTaskId.value } : {}) },
  })
}

async function retryNode(nodeId: string, event?: MouseEvent) {
  if (!selectedTask.value || retryingNodeId.value) return
  const nodeRun = selectedTask.value.nodeRuns.find((item) => item.nodeId === nodeId)
  const userForced = event?.shiftKey === true
  const force = userForced || (selectedTaskBusy.value && nodeRun?.status === 'completed')
  if (!force && selectedTaskBusy.value && nodeRun?.status !== 'completed') return
  try {
    retryingNodeId.value = nodeId
    const updated = await appApi.retryTaskNode(selectedTask.value.id, nodeId, force)
    upsertTask(updated, { select: true })
    toast.success(userForced ? '节点已强制重新提交' : '节点已重新提交')
    startRealtime()
  } catch (retryError) {
    toast.error(retryError instanceof Error ? retryError.message : '重试节点失败')
  } finally {
    retryingNodeId.value = null
  }
}

async function retryTask(event?: MouseEvent) {
  if (!selectedTask.value || retryingTask.value) return
  const force = event?.shiftKey || false
  if (!force && selectedTaskBusy.value) return
  try {
    retryingTask.value = true
    const updated = await appApi.retryTask(selectedTask.value.id, undefined, force)
    upsertTask(updated, { select: true })
    toast.success(force ? '任务已强制重新提交' : '任务已重新提交')
    startRealtime()
  } catch (retryError) {
    toast.error(retryError instanceof Error ? retryError.message : '重试任务失败')
  } finally {
    retryingTask.value = false
  }
}

function openInputEditor() {
  if (!selectedTask.value) return
  const nextTextValues: Record<string, string> = {}
  const nextFileValues: Record<string, File | null> = {}
  const nextPreviousImageValues: Record<string, unknown | null> = {}

  for (const variable of userInputVariables.value) {
    const value = selectedTask.value.inputs[variable.key] ?? variable.default
    if (variable.type === 'IMAGE') {
      nextFileValues[variable.key] = null
      nextPreviousImageValues[variable.key] = value ?? null
    } else if (variable.type === 'LORA_LIST') {
      nextTextValues[variable.key] = stringifyInputValue(value, true)
    } else {
      nextTextValues[variable.key] = stringifyInputValue(value)
    }
  }

  editTextValues.value = nextTextValues
  editFileValues.value = nextFileValues
  editPreviousImageValues.value = nextPreviousImageValues
  editingInputs.value = true
}

async function submitEditedInputs(action: 'save' | 'retry' = 'retry') {
  if (!selectedTask.value || retryingTask.value || savingInputs.value || selectedTaskBusy.value) return

  const validationError = validateEditedInputs()
  if (validationError) {
    toast.error(validationError)
    return
  }

  try {
    const inputs = await buildEditedInputs()
    if (action === 'save') {
      savingInputs.value = true
      const updated = await appApi.updateTaskInputs(selectedTask.value.id, inputs)
      upsertTask(updated, { select: true })
      editingInputs.value = false
      toast.success('任务参数已保存')
      return
    }

    retryingTask.value = true
    const updated = await appApi.retryTask(selectedTask.value.id, inputs)
    upsertTask(updated, { select: true })
    editingInputs.value = false
    toast.success('任务已使用新参数重新提交')
    startRealtime()
  } catch (retryError) {
    toast.error(retryError instanceof Error ? retryError.message : action === 'save' ? '保存任务参数失败' : '重新提交任务失败')
  } finally {
    retryingTask.value = false
    savingInputs.value = false
  }
}

async function deleteSelectedTask(event?: MouseEvent) {
  if (!selectedTask.value || deletingTask.value) return
  const force = event?.shiftKey === true || shiftPressed.value
  if (selectedTaskBusy.value && !force) return
  const message = force
    ? `确定强制删除任务 #${selectedTask.value.id} 吗？正在执行的任务会被移除，但被其他任务或素材库引用的文件会保留。`
    : `确定删除任务 #${selectedTask.value.id} 及其未被其他任务或素材库使用的文件吗？按住 Shift 点击可强制删除运行中的任务。`
  if (!window.confirm(message)) return

  const taskId = selectedTask.value.id
  try {
    deletingTask.value = true
    await appApi.deleteTask(taskId, force)
    tasks.value = tasks.value.filter((task) => task.id !== taskId)
    selectedTaskId.value = tasks.value[0]?.id ?? null
    await syncTaskRoute()
    toast.success(force ? '任务已强制删除' : '任务已删除')
  } catch (deleteError) {
    toast.error(deleteError instanceof Error ? deleteError.message : '删除任务失败')
  } finally {
    deletingTask.value = false
  }
}

async function syncSelectedTaskSnapshot(event?: MouseEvent) {
  if (!selectedTask.value || syncingSnapshot.value) return
  const force = event?.shiftKey === true || shiftPressed.value
  if (selectedTaskBusy.value && !force) return
  try {
    syncingSnapshot.value = true
    const updated = await appApi.syncTaskSnapshot(selectedTask.value.id, force)
    upsertTask(updated, { select: true })
    toast.success('任务快照已同步，可重试变更节点')
  } catch (syncError) {
    toast.error(syncError instanceof Error ? syncError.message : '同步任务快照失败')
  } finally {
    syncingSnapshot.value = false
  }
}

async function repairSelectedTaskLogic() {
  if (!selectedTask.value || repairingLogic.value || selectedTaskBusy.value) return
  try {
    repairingLogic.value = true
    const updated = await appApi.repairTaskLogic(selectedTask.value.id)
    upsertTask(updated, { select: true })
    toast.success('任务逻辑已重新推进')
    startRealtime()
  } catch (repairError) {
    toast.error(repairError instanceof Error ? repairError.message : '修复任务逻辑失败')
  } finally {
    repairingLogic.value = false
  }
}

function handleGlobalKeydown(event: KeyboardEvent) {
  updateShiftPressed(event)
  handleTaskNavigationKeydown(event)
}

function updateShiftPressed(event: KeyboardEvent) {
  shiftPressed.value = event.shiftKey
}

function handleTaskNavigationKeydown(event: KeyboardEvent) {
  if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return
  if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
  if (shouldIgnoreTaskShortcut(event)) return
  const moved = selectAdjacentTask(event.key === 'ArrowUp' ? -1 : 1)
  if (moved) event.preventDefault()
}

function shouldIgnoreTaskShortcut(event: KeyboardEvent) {
  if (editingInputs.value) return true
  const target = event.target
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return true
  return Boolean(target.closest('[role="textbox"], [role="combobox"], [role="listbox"], [role="menu"], [role="menuitem"]'))
}

function clearShiftPressed() {
  shiftPressed.value = false
}

async function resumeNode(nodeId: string) {
  if (!selectedTask.value || resumingNodeId.value) return
  try {
    resumingNodeId.value = nodeId
    const updated = await appApi.resumeAppTask(selectedTask.value.appId, selectedTask.value.id)
    upsertTask(updated, { select: true })
    toast.success('任务已继续')
    startRealtime()
  } catch (resumeError) {
    toast.error(resumeError instanceof Error ? resumeError.message : '继续任务失败')
  } finally {
    resumingNodeId.value = null
  }
}

function startRealtime() {
  if (showingGroupPicker.value || !selectedGroupId.value) {
    stopRealtime()
    return
  }
  taskRealtime.connect()
}

function stopRealtime() {
  taskRealtime.close()
}

function upsertTask(task: AppTaskRecord, options: { select?: boolean } = {}) {
  if (selectedGroupId.value && task.taskGroupId !== selectedGroupId.value) return
  const index = tasks.value.findIndex((item) => item.id === task.id)
  if (index >= 0) tasks.value[index] = task
  else tasks.value = [task, ...tasks.value]
  if (options.select || !selectedTaskId.value) selectedTaskId.value = task.id
}

function removeTask(taskId: number, taskGroupId: number | null) {
  if (selectedGroupId.value && taskGroupId !== selectedGroupId.value) return
  tasks.value = tasks.value.filter((task) => task.id !== taskId)
  if (selectedTaskId.value === taskId) selectedTaskId.value = tasks.value[0]?.id ?? null
  void syncTaskRoute()
}

function taskThumbnail(task: AppTaskRecord) {
  const thumbnailImage = findTaskImage(task, hasStoredThumbnailImageUrl)
  if (thumbnailImage) return imageUrl(thumbnailImage)

  const proxiedImage = findTaskImage(task, hasProxyImageUrl)
  if (proxiedImage) return imageUrl(proxiedImage)

  const storedProxyImage = findTaskImage(task, hasStoredProxyImageUrl)
  if (storedProxyImage) return imageUrl(storedProxyImage)

  const imageInput = task.appSnapshot.variables.find((variable) => variable.source === 'user_input' && variable.type === 'IMAGE')
  if (imageInput) return imageUrl(task.variables[imageInput.key] ?? task.inputs[imageInput.key])

  const firstImage = findTaskImage(task)
  return firstImage ? imageUrl(firstImage) : ''
}

function findTaskImage(task: AppTaskRecord, predicate: (value: unknown) => boolean = isImageValue) {
  const imageVariables = task.appSnapshot.variables.filter((variable) => variable.type === 'IMAGE')
  for (const variable of imageVariables) {
    const value = task.outputs[variable.key] ?? task.variables[variable.key] ?? task.inputs[variable.key]
    const image = findImageValue(value, predicate)
    if (image) return image
  }
  return null
}

function findImageValue(value: unknown, predicate: (value: unknown) => boolean): unknown {
  if (Array.isArray(value)) {
    for (const item of value) {
      const image = findImageValue(item, predicate)
      if (image) return image
    }
    return null
  }

  return predicate(value) ? value : null
}

function isImageValue(value: unknown) {
  return Boolean(imageUrl(value))
}

function hasProxyImageUrl(value: unknown) {
  if (!value || typeof value !== 'object') return false
  const image = value as Record<string, unknown>
  if (!image.proxy || typeof image.proxy !== 'object') return false
  const proxy = image.proxy as Record<string, unknown>
  return typeof proxy.localUrl === 'string' || typeof proxy.url === 'string'
}

function hasStoredThumbnailImageUrl(value: unknown) {
  const hash = imageHash(value)
  if (!hash) return false
  const thumbnail = thumbnailImages.value[hash]
  return Boolean(thumbnail?.localUrl ?? thumbnail?.url)
}

function hasStoredProxyImageUrl(value: unknown) {
  const hash = imageHash(value)
  if (!hash) return false
  const proxy = proxyImages.value[hash]
  return Boolean(proxy?.localUrl ?? proxy?.url)
}

function imageUrl(value: unknown) {
  if (typeof value === 'string' && /^https?:\/\//.test(value)) return value
  if (!value || typeof value !== 'object') return ''
  const image = value as Record<string, unknown>
  const storedThumbnailUrl = storedThumbnailImageUrl(value)
  if (storedThumbnailUrl) return storedThumbnailUrl
  if (image.proxy && typeof image.proxy === 'object') {
    const proxy = image.proxy as Record<string, unknown>
    if (typeof proxy.localUrl === 'string') return proxy.localUrl
    if (typeof proxy.url === 'string') return proxy.url
  }
  const storedProxyUrl = storedProxyImageUrl(value)
  if (storedProxyUrl) return storedProxyUrl
  if (typeof image.localUrl === 'string') return image.localUrl
  return typeof image.url === 'string' ? image.url : ''
}

function storedThumbnailImageUrl(value: unknown) {
  const hash = imageHash(value)
  if (!hash) return ''
  const thumbnail = thumbnailImages.value[hash]
  return thumbnail?.localUrl ?? thumbnail?.url ?? ''
}

function storedProxyImageUrl(value: unknown) {
  const hash = imageHash(value)
  if (!hash) return ''
  const proxy = proxyImages.value[hash]
  return proxy?.localUrl ?? proxy?.url ?? ''
}

function imageHash(value: unknown) {
  if (!value || typeof value !== 'object') return null
  const image = value as Record<string, unknown>
  return typeof image.hash === 'string' ? image.hash : null
}

function collectTaskImageHashes(task: AppTaskRecord, hashes: Set<string>) {
  const imageVariables = task.appSnapshot.variables.filter((variable) => variable.type === 'IMAGE')
  for (const variable of imageVariables) {
    collectImageHashes(task.outputs[variable.key], hashes)
    collectImageHashes(task.variables[variable.key], hashes)
    collectImageHashes(task.inputs[variable.key], hashes)
  }
}

function collectImageHashes(value: unknown, hashes: Set<string>) {
  if (Array.isArray(value)) {
    for (const item of value) collectImageHashes(item, hashes)
    return
  }

  const hash = imageHash(value)
  if (hash) hashes.add(hash)
}

function setEditFile(variable: AppVariable, event: Event) {
  const input = event.target as HTMLInputElement
  editFileValues.value[variable.key] = input.files?.[0] ?? null
  if (input.files?.[0]) editPreviousImageValues.value[variable.key] = null
}

function clearEditImage(variableKey: string) {
  editFileValues.value[variableKey] = null
  editPreviousImageValues.value[variableKey] = null
}

function validateEditedInputs() {
  for (const variable of userInputVariables.value) {
    if (!variable.required) continue
    if (variable.type === 'IMAGE') {
      if (!editFileValues.value[variable.key] && !editPreviousImageValues.value[variable.key] && isEmptyValue(variable.default)) {
        return `应用输入 $${variable.key} 不能为空`
      }
      continue
    }
    if (isEmptyValue(editTextValues.value[variable.key])) return `应用输入 $${variable.key} 不能为空`
  }
  return ''
}

async function buildEditedInputs() {
  const inputs: Record<string, unknown> = {}
  for (const variable of userInputVariables.value) {
    if (variable.type === 'IMAGE') {
      const file = editFileValues.value[variable.key]
      const previousImage = editPreviousImageValues.value[variable.key]
      inputs[variable.key] = file ? await appApi.uploadComfyImage(file) : (previousImage ?? variable.default)
      continue
    }

    inputs[variable.key] = parseInputValue(editTextValues.value[variable.key] ?? '', variable.type)
  }
  return inputs
}

function stringifyInputValue(value: unknown, pretty = false) {
  if (value === undefined || value === null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value, null, pretty ? 2 : 0)
}

function parseInputValue(value: string, type: string) {
  if (type === 'INT') return Number.parseInt(value, 10)
  if (type === 'FLOAT') return Number.parseFloat(value)
  if (type === 'BOOL') return value === 'true'
  if (type === 'LORA_LIST') return value.trim() ? JSON.parse(value) : []
  return value
}

function isEmptyValue(value: unknown) {
  return value === undefined || value === null || value === ''
}

function taskFallbackClass(task: AppTaskRecord) {
  const classes = ['bg-slate-200', 'bg-blue-200', 'bg-violet-200', 'bg-emerald-200', 'bg-amber-200', 'bg-rose-200']
  return classes[task.id % classes.length]
}

function taskButtonClass(task: AppTaskRecord) {
  if (task.requiresManualAction) {
    return selectedTaskId.value === task.id
      ? 'border-yellow-400 ring-2 ring-slate-950'
      : 'border-yellow-400 hover:border-yellow-500'
  }

  return selectedTaskId.value === task.id ? 'border-slate-950' : 'border-slate-200 hover:border-slate-400'
}

function statusLabel(status: AppTaskRecord['status']) {
  const labels = {
    queued: '排队',
    running: '执行',
    waiting: '等待',
    completed: '完成',
    failed: '失败',
  }
  return labels[status]
}

async function moveTaskToGroupAction(targetGroupId: number) {
  if (!selectedTask.value || movingTaskToGroup.value || targetGroupId === selectedGroupId.value) return
  try {
    movingTaskToGroup.value = true
    await appApi.moveTaskToGroup(selectedTask.value.id, targetGroupId)
    tasks.value = tasks.value.filter((task) => task.id !== selectedTask.value!.id)
    selectedTaskId.value = tasks.value[0]?.id ?? null
    await syncTaskRoute()
    const targetGroup = taskGroups.value.find((group) => group.id === targetGroupId)
    toast.success(`任务已移动到 ${targetGroup?.name ?? '目标分组'}`)
  } catch (moveError) {
    toast.error(moveError instanceof Error ? moveError.message : '移动任务失败')
  } finally {
    movingTaskToGroup.value = false
  }
}
</script>

<template>
  <main class="h-svh overflow-hidden bg-white text-slate-950">
    <div class="flex h-full">
      <div class="relative min-w-0 flex-1">
      <!-- 悬浮导航/左上角 -->
      <div class="absolute left-4 top-4 z-30 flex items-center gap-2">
        <LayoutAppNavigationMenu />
        <Button v-if="!showingGroupPicker" type="button" variant="outline" class="shadow-sm bg-white" @click="openGroupPicker">
          <ArrowLeft class="size-4" />
          返回分组
        </Button>
        <div v-if="showingGroupPicker" class="flex h-9 items-center rounded-md border bg-white px-3 text-sm font-medium shadow-sm">
          <FolderOpen class="mr-2 size-4 text-slate-500" />
          任务分组
        </div>
        <div v-else-if="selectedTask" class="flex h-9 items-center gap-1.5 rounded-md border bg-white px-3 text-sm shadow-sm">
                    <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <button type="button" class="flex items-center gap-1 font-medium transition hover:text-slate-600 outline-none">
                {{ selectedGroup?.name ?? '未分组' }}
                <ChevronDown class="size-3 text-slate-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" class="w-48">
              <DropdownMenuItem
                v-for="group in taskGroups"
                :key="group.id"
                :class="group.id === selectedGroupId ? 'bg-slate-50 font-medium' : ''"
                @select="selectGroup(group.id)"
              >
                <FolderOpen class="mr-2 size-4 text-slate-500" />
                <span class="truncate">{{ group.name }}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <span class="text-slate-300">/</span>
          <span>{{ selectedTask.appSnapshot.name }}</span>
          <span class="text-slate-300">/</span>
          <span class="text-slate-500">#{{ selectedTask.id }}</span>
          <span class="ml-1 rounded-full px-2 py-0.5 text-[10px] bg-slate-100 text-slate-600">{{ statusLabel(selectedTask.status) }}</span>
        </div>
                <div v-else class="flex h-9 items-center gap-1.5 rounded-md border bg-white px-3 text-sm shadow-sm">
          <DropdownMenu v-if="selectedGroup">
            <DropdownMenuTrigger as-child>
              <button type="button" class="flex items-center gap-1 font-medium transition hover:text-slate-600 outline-none">
                {{ selectedGroup.name }}
                <ChevronDown class="size-3 text-slate-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" class="w-48">
              <DropdownMenuItem
                v-for="group in taskGroups"
                :key="group.id"
                :class="group.id === selectedGroupId ? 'bg-slate-50 font-medium' : ''"
                @select="selectGroup(group.id)"
              >
                <FolderOpen class="mr-2 size-4 text-slate-500" />
                <span class="truncate">{{ group.name }}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <span v-else class="font-medium">未分组</span>
          <span class="text-slate-300">/</span>
          <span class="text-slate-500">任务列表</span>
        </div>
      </div>

      <!-- 右上角按钮 -->
      <div class="absolute right-4 top-4 z-30 flex items-center gap-2">
        <template v-if="selectedTask && !showingGroupPicker">
          <Button
            type="button"
            variant="outline"
            class="shadow-sm bg-white"
            :disabled="retryTaskDisabled"
            @click="retryTask"
          >
            <RotateCw class="size-4" :class="retryingTask ? 'animate-spin' : ''" />
            重试
          </Button>
          <Button
            v-if="shiftPressed"
            type="button"
            variant="outline"
            class="shadow-sm bg-white"
            :disabled="repairLogicDisabled"
            @click="repairSelectedTaskLogic"
          >
            <Wrench class="size-4" :class="repairingLogic ? 'animate-pulse' : ''" />
            修复逻辑
          </Button>
          <Button
            type="button"
            variant="outline"
            class="shadow-sm bg-white"
            :disabled="retryTaskDisabled"
            @click="openInputEditor"
          >
            <Pencil class="size-4" />
            参数
          </Button>
          <DropdownMenu v-if="taskGroups.length > 1">
            <DropdownMenuTrigger as-child>
              <Button type="button" variant="outline" class="shadow-sm bg-white" :disabled="movingTaskToGroup">
                <MoreVertical class="size-4" />
                更多
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>移动到分组</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem :disabled="syncSnapshotDisabled" @click="syncSelectedTaskSnapshot">
                <RefreshCw class="mr-2 size-4" :class="syncingSnapshot ? 'animate-spin' : ''" />
                同步当前应用快照
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                v-for="group in taskGroups.filter((g) => g.id !== selectedGroupId)"
                :key="group.id"
                @click="moveTaskToGroupAction(group.id)"
              >
                <FolderOpen class="mr-2 size-4" />
                {{ group.name }}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            type="button"
            variant="outline"
            class="shadow-sm bg-white text-red-600 hover:text-red-700"
            :disabled="deleteTaskDisabled"
            @click="deleteSelectedTask"
          >
            <Trash2 class="size-4" />
            删除
          </Button>
        </template>
      </div>

      <!-- 左侧悬浮任务列表 -->
      <div v-if="!showingGroupPicker && tasks.length > 0" class="absolute left-4 top-16 z-30 flex flex-col gap-2 max-h-[calc(100vh-5rem)] overflow-y-auto overscroll-contain pb-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <button
          v-for="task in tasks"
          :key="task.id"
          type="button"
          class="relative size-14 shrink-0 overflow-hidden rounded-xl border shadow-sm transition bg-white"
          :class="taskButtonClass(task)"
          @click="selectTask(task.id)"
        >
          <img v-if="taskThumbnail(task)" :src="taskThumbnail(task)" :alt="`任务 #${task.id}`" class="h-full w-full object-cover" />
          <div v-else class="flex h-full w-full items-center justify-center" :class="taskFallbackClass(task)">
            <Image class="size-5 text-slate-600" />
          </div>
          <span class="absolute bottom-0 left-0 right-0 bg-white/85 text-[10px] font-medium text-slate-700">#{{ task.id }}</span>
        </button>
      </div>

      <!-- 内容区 -->
      <div class="h-full w-full">
        <div v-if="showingGroupPicker" class="h-full overflow-auto pt-20 px-6 bg-slate-50">
            <div class="mb-5">
              <h1 class="text-xl font-semibold">选择任务分组</h1>
              <p class="mt-1 text-sm text-slate-500">会自动进入上次选择的分组，也可以从这里切换到其他分组。</p>
            </div>

            <div v-if="taskGroups.length" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              <button
                v-for="group in taskGroups"
                :key="group.id"
                type="button"
                class="rounded-xl border bg-white p-4 text-left transition hover:border-slate-400 hover:bg-slate-50 shadow-sm"
                @click="selectGroup(group.id)"
              >
                <div class="flex items-center gap-3">
                  <div class="rounded-lg border bg-slate-50 p-2 text-slate-600">
                    <FolderOpen class="size-4" />
                  </div>
                  <div class="min-w-0">
                    <div class="truncate text-sm font-semibold">{{ group.name }}</div>
                    <div class="mt-0.5 text-xs text-slate-500">查看该分组任务</div>
                  </div>
                </div>
              </button>
            </div>

            <div v-else class="rounded-lg border border-dashed p-8 text-center text-sm text-slate-500 bg-white">
              {{ error || '暂无任务分组' }}
            </div>
        </div>
        <TaskFlowGraph
          v-else-if="selectedTask"
          :task="selectedTask"
          :retrying-node-id="retryingNodeId"
          :resuming-node-id="resumingNodeId"
          :shift-pressed="shiftPressed"
          @retry="retryNode"
          @resume="resumeNode"
        />
        <div v-else class="flex h-full items-center justify-center p-6 text-center text-sm text-slate-500 bg-slate-50">
          {{ error || '暂无任务' }}
        </div>
      </div>

      </div>

      <TaskOutputImages v-if="!showingGroupPicker" :task="selectedTask" :tasks="tasks" />
    </div>

    <Dialog v-model:open="editingInputs">

      <DialogContent class="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>查看和编辑任务参数</DialogTitle>
          <DialogDescription>可仅保存任务输入参数，也可保存后重置当前任务并再次执行。</DialogDescription>
        </DialogHeader>

        <form class="max-h-[70vh] space-y-4 overflow-y-auto py-2" @submit.prevent="submitEditedInputs('retry')">
          <div v-if="userInputVariables.length === 0" class="rounded-lg border border-dashed p-4 text-sm text-slate-500">
            当前任务没有用户输入参数。
          </div>

          <div v-for="variable in userInputVariables" :key="variable.key" class="space-y-2 rounded-lg border p-3">
            <Label :for="`task-input-${variable.key}`" class="flex items-center justify-between gap-3">
              <span>{{ variable.name || variable.key }}</span>
              <span class="text-xs font-normal text-slate-400">
                {{ APP_VARIABLE_TYPE_LABELS[variable.type] }}{{ variable.required ? ' · 必填' : '' }}
              </span>
            </Label>

            <Input
              v-if="variable.type === 'INT' || variable.type === 'FLOAT'"
              :id="`task-input-${variable.key}`"
              v-model="editTextValues[variable.key]"
              type="number"
              :step="variable.type === 'FLOAT' ? 'any' : '1'"
            />

            <Select v-else-if="variable.type === 'BOOL'" v-model="editTextValues[variable.key]">
              <SelectTrigger :id="`task-input-${variable.key}`">
                <SelectValue placeholder="选择布尔值" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">是</SelectItem>
                <SelectItem value="false">否</SelectItem>
              </SelectContent>
            </Select>

            <div v-else-if="variable.type === 'IMAGE'" class="space-y-2">
              <div v-if="imageUrl(editPreviousImageValues[variable.key])" class="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
                <img :src="imageUrl(editPreviousImageValues[variable.key])" :alt="variable.name" class="size-14 rounded object-cover" />
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-medium">沿用当前图片</p>
                  <p class="text-xs text-slate-500">上传新图片可替换该参数</p>
                </div>
                <Button type="button" variant="ghost" size="icon" @click="clearEditImage(variable.key)">
                  <Trash2 class="size-4" />
                </Button>
              </div>
              <Input :id="`task-input-${variable.key}`" type="file" accept="image/png,image/jpeg,image/webp" @change="setEditFile(variable, $event)" />
              <p v-if="editFileValues[variable.key]" class="text-xs text-slate-500">
                新图片：{{ editFileValues[variable.key]!.name }}
              </p>
            </div>

            <Textarea
              v-else
              :id="`task-input-${variable.key}`"
              v-model="editTextValues[variable.key]"
              class="min-h-24"
              :placeholder="variable.type === 'LORA_LIST' ? '输入 JSON 数组' : '输入参数值'"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" :disabled="retryingTask || savingInputs" @click="editingInputs = false">取消</Button>
            <Button type="button" variant="outline" :disabled="retryingTask || savingInputs || selectedTaskBusy" @click="submitEditedInputs('save')">
              <Pencil class="size-4" :class="savingInputs ? 'animate-pulse' : ''" />
              仅保存参数
            </Button>
            <Button type="submit" :disabled="retryingTask || savingInputs || selectedTaskBusy">
              <RotateCw class="size-4" :class="retryingTask ? 'animate-spin' : ''" />
              保存参数并再次执行
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  
  </main>
</template>
