<script setup lang="ts">
import { toast } from 'vue-sonner'
import { Image, LayoutGrid } from 'lucide-vue-next'
import TaskFlowGraph from '@/components/task/TaskFlowGraph.vue'
import TaskOutputImages from '@/components/task/TaskOutputImages.vue'
import type { AppTaskRecord } from '@/lib/app'

const route = useRoute()
const router = useRouter()
const appApi = useAppApi()

const tasks = ref<AppTaskRecord[]>([])
const selectedTaskId = ref<number | null>(null)
const error = ref('')
const retryingNodeId = ref<string | null>(null)
const resumingNodeId = ref<string | null>(null)
let pollTimer: ReturnType<typeof window.setTimeout> | null = null

const selectedTask = computed(() => tasks.value.find((task) => task.id === selectedTaskId.value) ?? null)

onMounted(async () => {
  await refreshTasks()
  startPolling()
})

onUnmounted(() => {
  stopPolling()
})

watch(selectedTaskId, () => {
  startPolling()
})

async function refreshTasks() {
  try {
    error.value = ''
    tasks.value = await appApi.listTasks()
    selectInitialTask()
  } catch (loadError) {
    error.value = loadError instanceof Error ? loadError.message : '加载任务失败'
    toast.error(error.value)
  }
}

function selectInitialTask() {
  if (selectedTaskId.value && tasks.value.some((task) => task.id === selectedTaskId.value)) return
  const queryTaskId = Number(route.query.taskId)
  const task = tasks.value.find((item) => item.id === queryTaskId) ?? tasks.value[0]
  selectedTaskId.value = task?.id ?? null
}

async function selectTask(taskId: number) {
  selectedTaskId.value = taskId
  await router.replace({ path: '/tasks', query: { taskId } })
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
  if (!selectedTask.value || !['queued', 'running'].includes(selectedTask.value.status)) return
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
      </aside>

      <section class="flex min-w-0 flex-1 flex-col">
        <header class="flex h-16 shrink-0 items-center gap-3 border-b bg-white px-4">
          <div class="rounded-lg border bg-slate-50 p-2 text-slate-600">
            <LayoutGrid class="size-4" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="truncate text-sm font-semibold">
              {{ selectedTask ? `${selectedTask.appSnapshot.name} · 任务 #${selectedTask.id}` : '任务列表' }}
            </div>
            <div v-if="selectedTask" class="mt-0.5 text-xs text-slate-500">{{ statusLabel(selectedTask.status) }}</div>
          </div>
        </header>

        <div class="min-h-0 flex-1">
          <TaskFlowGraph
            v-if="selectedTask"
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

      <TaskOutputImages :task="selectedTask" />
    </div>
  </main>
</template>
