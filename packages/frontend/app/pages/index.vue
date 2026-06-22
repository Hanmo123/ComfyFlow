<script setup lang="ts">
import { toast } from 'vue-sonner'
import { Check, FolderOpen, LayoutGrid, Play, Plus, RotateCw, Save, X } from 'lucide-vue-next'
import type { TaskGroupRecord } from '@/lib/app'

const store = useAppDesignerStore()
const appApi = useAppApi()
const { loadPreferredTaskGroupId, setPreferredTaskGroupId } = useTaskGroupPreference()
const runSheetOpen = ref(false)
const taskGroups = ref<TaskGroupRecord[]>([])
const selectedTaskGroupId = ref<number | null>(null)
const loadingTaskGroups = ref(false)
const creatingTaskGroup = ref(false)

const selectedTaskGroup = computed(() => taskGroups.value.find((group) => group.id === selectedTaskGroupId.value) ?? null)
const selectedTaskGroupSelectValue = computed(() => selectedTaskGroupId.value === null ? undefined : String(selectedTaskGroupId.value))

const taskStatusLabel = computed(() => {
  const labels = {
    queued: '排队',
    running: '执行',
    waiting: '等待人工确认',
    completed: '完成',
    failed: '失败',
  }
  return store.latestTask.value ? labels[store.latestTask.value.status] : ''
})

const taskOutputEntries = computed(() => Object.entries(store.latestTask.value?.outputs ?? {}))

function formatTaskValue(value: unknown) {
  if (typeof value === 'string') return value
  return JSON.stringify(value, null, 2)
}

async function loadTaskGroups() {
  try {
    loadingTaskGroups.value = true
    taskGroups.value = await appApi.listTaskGroups()
    const preferredGroupId = loadPreferredTaskGroupId()
    const nextGroupId = selectedTaskGroupId.value ?? preferredGroupId
    if (nextGroupId && taskGroups.value.some((group) => group.id === nextGroupId)) {
      selectedTaskGroupId.value = nextGroupId
    } else {
      selectedTaskGroupId.value = taskGroups.value[0]?.id ?? null
    }
    setPreferredTaskGroupId(selectedTaskGroupId.value)
  } catch (error) {
    selectedTaskGroupId.value = null
    setPreferredTaskGroupId(null)
    toast.error(error instanceof Error ? error.message : '加载任务分组失败')
  } finally {
    loadingTaskGroups.value = false
  }
}

async function createTaskGroup() {
  if (creatingTaskGroup.value) return
  const name = window.prompt('请输入新任务分组名称')?.trim()
  if (!name) return

  try {
    creatingTaskGroup.value = true
    const group = await appApi.createTaskGroup(name)
    taskGroups.value = [...taskGroups.value, group].sort((left, right) => left.sortOrder - right.sortOrder || left.id - right.id)
    selectedTaskGroupId.value = group.id
    setPreferredTaskGroupId(group.id)
    toast.success('任务分组已创建')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '创建任务分组失败')
  } finally {
    creatingTaskGroup.value = false
  }
}

function updateSelectedTaskGroup(value: unknown) {
  const nextId = Number(value)
  selectedTaskGroupId.value = Number.isFinite(nextId) ? nextId : null
  setPreferredTaskGroupId(selectedTaskGroupId.value)
}

function handleKeyDown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key === 's') {
    event.preventDefault()
    if (!store.saving.value) {
      store.saveApp()
    }
  }
}

onMounted(async () => {
  store.initialize()
  await loadTaskGroups()
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <main class="h-svh overflow-hidden bg-white text-slate-950">
    <div class="relative h-full">
      <AppCanvas />

      <div class="absolute left-4 top-4 z-30 flex items-center gap-2">
        <LayoutAppNavigationMenu />

        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="outline" type="button">
              <LayoutGrid class="size-4" />
              应用
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" class="w-40">
            <DropdownMenuItem @select="store.createDraftApp">
              <Plus class="size-4" />
              新建
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <FolderOpen class="size-4" />
                打开
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent class="w-72">
                <DropdownMenuItem v-if="store.sortedApps.value.length === 0" disabled>
                  暂无已保存应用
                </DropdownMenuItem>
                <DropdownMenuItem
                  v-for="app in store.sortedApps.value"
                  :key="app.id"
                  class="flex-col items-start gap-1"
                  @select="store.selectApp(app.id)"
                >
                  <span class="max-w-full truncate text-sm">{{ app.name || `未命名应用 #${app.id}` }}</span>
                  <span class="text-xs text-slate-500">{{ app.variables.length }} 个应用变量</span>
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem :disabled="store.saving.value" @select="store.saveApp">
              <Save class="size-4" />
              保存
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div class="absolute right-4 top-4 z-30 flex items-center gap-2">
        <Select
          :model-value="selectedTaskGroupSelectValue"
          :disabled="loadingTaskGroups || store.running.value"
          @update:model-value="updateSelectedTaskGroup"
        >
          <SelectTrigger class="w-44 bg-white" aria-label="任务分组">
            <SelectValue :placeholder="loadingTaskGroups ? '加载分组中...' : '请选择任务分组'" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-if="taskGroups.length === 0" value="__no_task_groups__" disabled>
              暂无任务分组
            </SelectItem>
            <SelectItem v-for="group in taskGroups" :key="group.id" :value="String(group.id)">
              {{ group.name }}
            </SelectItem>
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="icon"
          :disabled="creatingTaskGroup || store.running.value"
          aria-label="新建任务分组"
          @click="createTaskGroup"
        >
          <Plus class="size-4" />
        </Button>
        <Button
          type="button"
          class="bg-blue-600 text-white hover:bg-blue-700"
          :disabled="store.running.value || store.saving.value || !selectedTaskGroupId"
          @click="runSheetOpen = true"
        >
          <Play class="size-4" />
          运行
        </Button>
      </div>

      <div
        v-if="store.latestTask.value"
        class="absolute bottom-4 right-4 z-30 w-80 rounded-lg border bg-white p-3 text-sm"
      >
        <div class="flex items-center justify-between gap-3">
          <div class="min-w-0">
            <div class="truncate font-medium">任务 #{{ store.latestTask.value.id }}</div>
            <div class="text-xs text-slate-500">{{ taskStatusLabel }}</div>
          </div>
          <Check v-if="store.latestTask.value.status === 'completed'" class="size-4 text-green-600" />
          <X v-else-if="store.latestTask.value.status === 'failed'" class="size-4 text-red-600" />
          <RotateCw v-else class="size-4 text-blue-600" />
        </div>

        <div v-if="store.latestTask.value.error" class="mt-2 rounded border border-red-200 bg-red-50 px-2 py-1 text-red-700">
          {{ store.latestTask.value.error }}
        </div>

        <Button
          v-if="store.latestTask.value.status === 'waiting'"
          class="mt-3 w-full"
          type="button"
          variant="outline"
          :disabled="store.running.value"
          @click="store.resumeLatestTask"
        >
          继续
        </Button>

        <div v-if="taskOutputEntries.length" class="mt-3 space-y-2">
          <div v-for="[key, value] in taskOutputEntries" :key="key" class="rounded border bg-slate-50 px-2 py-1">
            <div class="text-xs text-slate-500">{{ key }}</div>
            <pre class="mt-1 max-h-28 overflow-auto whitespace-pre-wrap break-words text-xs">{{ formatTaskValue(value) }}</pre>
          </div>
        </div>
      </div>

      <div
        v-if="store.error.value"
        class="absolute bottom-4 left-4 z-30 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
      >
        {{ store.error.value }}
      </div>

      <AppRunSheet
        v-model:open="runSheetOpen"
        :task-group-id="selectedTaskGroupId"
        :task-group-name="selectedTaskGroup?.name"
      />
    </div>
  </main>
</template>
