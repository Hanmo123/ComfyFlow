<script setup lang="ts">
import { toast } from 'vue-sonner'
import { ArrowLeft, FolderOpen, Image, LayoutGrid, RotateCw } from 'lucide-vue-next'
import TaskFlowGraph from '@/components/task/TaskFlowGraph.vue'
import TaskOutputImages from '@/components/task/TaskOutputImages.vue'
import type { AppTaskRecord, TaskGroupRecord } from '@/lib/app'

const route = useRoute()
const router = useRouter()
const appApi = useAppApi()

const taskGroups = ref<TaskGroupRecord[]>([])
const tasks = ref<AppTaskRecord[]>([])
const selectedGroupId = ref<number | null>(null)
const selectedTaskId = ref<number | null>(null)
const showingGroupPicker = ref(false)
const error = ref('')
const retryingTask = ref(false)
const retryingNodeId = ref<string | null>(null)
const resumingNodeId = ref<string | null>(null)
let pollTimer: ReturnType<typeof window.setTimeout> | null = null

const selectedGroup = computed(() => taskGroups.value.find((group) => group.id === selectedGroupId.value) ?? null)
const selectedTask = computed(() => tasks.value.find((task) => task.id === selectedTaskId.value) ?? null)
const selectedTaskBusy = computed(() => Boolean(selectedTask.value && ['queued', 'running'].includes(selectedTask.value.status)))

onMounted(async () => {
  await initializePage()
})

onUnmounted(() => {
  stopPolling()
})

watch(selectedTaskId, () => {
  startPolling()
})

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
  return queryGroup?.id ?? taskGroups.value[0]?.id ?? null
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
  stopPolling()
  showingGroupPicker.value = true
  selectedTaskId.value = null
  await router.replace({ path: '/tasks' })
}

async function selectGroup(groupId: number, taskId?: number) {
  selectedGroupId.value = groupId
  selectedTaskId.value = null
  showingGroupPicker.value = false
  await router.replace({ path: '/tasks', query: { groupId, ...(taskId ? { taskId } : {}) } })
  await refreshTasks()
  startPolling()
}

async function selectTask(taskId: number) {
  selectedTaskId.value = taskId
  await syncTaskRoute()
}

async function syncTaskRoute() {
  if (showingGroupPicker.value || !selectedGroupId.value) return
  await router.replace({
    path: '/tasks',
    query: { groupId: selectedGroupId.value, ...(selectedTaskId.value ? { taskId: selectedTaskId.value } : {}) },
  })
}

async function retryNode(nodeId: string) {
  if (!selectedTask.value || retryingNodeId.value) return
  try {
    retryingNodeId.value = nodeId
    const updated = await appApi.retryTaskNode(selectedTask.value.id, nodeId)
    upsertTask(updated)
    toast.success('节点已重新提交')
    startPolling()
  } catch (retryError) {
    toast.error(retryError instanceof Error ? retryError.message : '重试节点失败')
  } finally {
    retryingNodeId.value = null
  }
}

async function retryTask() {
  if (!selectedTask.value || retryingTask.value || selectedTaskBusy.value) return
  try {
    retryingTask.value = true
    const updated = await appApi.retryTask(selectedTask.value.id)
    upsertTask(updated)
    toast.success('任务已重新提交')
    startPolling()
  } catch (retryError) {
    toast.error(retryError instanceof Error ? retryError.message : '重试任务失败')
  } finally {
    retryingTask.value = false
  }
}

async function resumeNode(nodeId: string) {
  if (!selectedTask.value || resumingNodeId.value) return
  try {
    resumingNodeId.value = nodeId
    const updated = await appApi.resumeAppTask(selectedTask.value.appId, selectedTask.value.id)
    upsertTask(updated)
    toast.success('任务已继续')
    startPolling()
  } catch (resumeError) {
    toast.error(resumeError instanceof Error ? resumeError.message : '继续任务失败')
  } finally {
    resumingNodeId.value = null
  }
}

function startPolling() {
  stopPolling()
  if (showingGroupPicker.value || !selectedTask.value || !['queued', 'running'].includes(selectedTask.value.status)) return
  pollTimer = window.setTimeout(pollSelectedTask, 1200)
}

function stopPolling() {
  if (pollTimer) window.clearTimeout(pollTimer)
  pollTimer = null
}

async function pollSelectedTask() {
  if (!selectedTaskId.value) return
  try {
    upsertTask(await appApi.getTask(selectedTaskId.value))
  } catch {
    await refreshTasks()
  } finally {
    startPolling()
  }
}

function upsertTask(task: AppTaskRecord) {
  if (selectedGroupId.value && task.taskGroupId !== selectedGroupId.value) return
  const index = tasks.value.findIndex((item) => item.id === task.id)
  if (index >= 0) tasks.value[index] = task
  else tasks.value = [task, ...tasks.value]
  selectedTaskId.value = task.id
}

function taskThumbnail(task: AppTaskRecord) {
  const imageInput = task.appSnapshot.variables.find((variable) => variable.source === 'user_input' && variable.type === 'IMAGE')
  return imageInput ? imageUrl(task.inputs[imageInput.key]) : ''
}

function imageUrl(value: unknown) {
  if (typeof value === 'string' && /^https?:\/\//.test(value)) return value
  if (!value || typeof value !== 'object') return ''
  const image = value as Record<string, unknown>
  if (typeof image.localUrl === 'string') return image.localUrl
  return typeof image.url === 'string' ? image.url : ''
}

function taskFallbackClass(task: AppTaskRecord) {
  const classes = ['bg-slate-200', 'bg-blue-200', 'bg-violet-200', 'bg-emerald-200', 'bg-amber-200', 'bg-rose-200']
  return classes[task.id % classes.length]
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
</script>

<template>
  <main class="h-svh overflow-hidden bg-white text-slate-950">
    <div class="flex h-full">
      <aside class="flex w-20 shrink-0 flex-col items-center gap-3 border-r bg-slate-50 px-2 py-4">
        <LayoutAppNavigationMenu />
        <div class="h-px w-full bg-slate-200" />
        <button
          v-if="!showingGroupPicker"
          type="button"
          class="flex size-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-slate-400 hover:text-slate-950"
          title="返回分组"
          @click="openGroupPicker"
        >
          <ArrowLeft class="size-4" />
        </button>
        <template v-if="!showingGroupPicker">
          <button
            v-for="task in tasks"
            :key="task.id"
            type="button"
            class="relative size-14 overflow-hidden rounded-xl border transition"
            :class="selectedTaskId === task.id ? 'border-slate-950' : 'border-slate-200 hover:border-slate-400'"
            @click="selectTask(task.id)"
          >
            <img v-if="taskThumbnail(task)" :src="taskThumbnail(task)" :alt="`任务 #${task.id}`" class="h-full w-full object-cover" />
            <div v-else class="flex h-full w-full items-center justify-center" :class="taskFallbackClass(task)">
              <Image class="size-5 text-slate-600" />
            </div>
            <span class="absolute bottom-0 left-0 right-0 bg-white/85 text-[10px] font-medium text-slate-700">#{{ task.id }}</span>
          </button>
        </template>
      </aside>

      <section class="flex min-w-0 flex-1 flex-col">
        <header class="flex h-16 shrink-0 items-center gap-3 border-b bg-white px-4">
          <div class="rounded-lg border bg-slate-50 p-2 text-slate-600">
            <FolderOpen v-if="showingGroupPicker" class="size-4" />
            <LayoutGrid v-else class="size-4" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="truncate text-sm font-semibold">
              <template v-if="showingGroupPicker">任务分组</template>
              <template v-else-if="selectedTask">
                {{ `${selectedGroup?.name ?? '未分组'} · ${selectedTask.appSnapshot.name} · 任务 #${selectedTask.id}` }}
              </template>
              <template v-else>{{ selectedGroup ? `${selectedGroup.name} · 任务列表` : '任务列表' }}</template>
            </div>
            <div class="mt-0.5 text-xs text-slate-500">
              <template v-if="showingGroupPicker">选择一个分组查看任务</template>
              <template v-else-if="selectedTask">{{ statusLabel(selectedTask.status) }}</template>
              <template v-else>{{ error || '暂无任务' }}</template>
            </div>
          </div>
          <Button
            v-if="selectedTask && !showingGroupPicker"
            type="button"
            variant="outline"
            :disabled="retryingTask || selectedTaskBusy"
            @click="retryTask"
          >
            <RotateCw class="size-4" :class="retryingTask ? 'animate-spin' : ''" />
            重试
          </Button>
          <Button v-if="!showingGroupPicker" type="button" variant="outline" @click="openGroupPicker">
            <ArrowLeft class="size-4" />
            返回分组
          </Button>
        </header>

        <div class="min-h-0 flex-1">
          <div v-if="showingGroupPicker" class="h-full overflow-auto p-6">
            <div class="mx-auto max-w-4xl">
              <div class="mb-5">
                <h1 class="text-xl font-semibold">选择任务分组</h1>
                <p class="mt-1 text-sm text-slate-500">默认进入第一个分组，也可以从这里切换到其他分组。</p>
              </div>

              <div v-if="taskGroups.length" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <button
                  v-for="group in taskGroups"
                  :key="group.id"
                  type="button"
                  class="rounded-xl border bg-white p-4 text-left transition hover:border-slate-400 hover:bg-slate-50"
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

              <div v-else class="rounded-lg border border-dashed p-8 text-center text-sm text-slate-500">
                {{ error || '暂无任务分组' }}
              </div>
            </div>
          </div>
          <TaskFlowGraph
            v-else-if="selectedTask"
            :task="selectedTask"
            :retrying-node-id="retryingNodeId"
            :resuming-node-id="resumingNodeId"
            @retry="retryNode"
            @resume="resumeNode"
          />
          <div v-else class="flex h-full items-center justify-center p-6 text-center text-sm text-slate-500">
            {{ error || '暂无任务' }}
          </div>
        </div>
      </section>

      <TaskOutputImages v-if="!showingGroupPicker" :task="selectedTask" />
    </div>
  </main>
</template>
