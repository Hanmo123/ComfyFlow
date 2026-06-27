<script setup lang="ts">
import { toast } from 'vue-sonner'
import { FolderOpen, LayoutGrid, Play, Plus, Save } from 'lucide-vue-next'
import type { TaskGroupRecord } from '@/lib/app'
import type { TaskProgressCounts } from '@/composables/useTaskRealtime'

const store = useAppDesignerStore()
const appApi = useAppApi()
const { loadPreferredTaskGroupId, setPreferredTaskGroupId } = useTaskGroupPreference()
const runSheetOpen = ref(false)
const taskGroups = ref<TaskGroupRecord[]>([])
const selectedTaskGroupId = ref<number | null>(null)
const loadingTaskGroups = ref(false)
const creatingTaskGroup = ref(false)
const taskProgress = ref<TaskProgressCounts>({ running: 0, waiting: 0, completed: 0 })
const taskRealtime = useTaskRealtime({
  onTaskProgress(counts) {
    taskProgress.value = counts
  },
})

const selectedTaskGroup = computed(() => taskGroups.value.find((group) => group.id === selectedTaskGroupId.value) ?? null)
const selectedTaskGroupSelectValue = computed(() => selectedTaskGroupId.value === null ? undefined : String(selectedTaskGroupId.value))
const hasTaskProgress = computed(() => taskProgress.value.running + taskProgress.value.waiting + taskProgress.value.completed > 0)

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
  taskRealtime.connect()
  await loadTaskGroups()
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  taskRealtime.close()
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
        v-if="hasTaskProgress"
        class="absolute bottom-4 right-4 z-30 flex rounded-lg border bg-white px-3 py-2 text-sm shadow-sm"
      >
        <div class="min-w-16 border-r pr-3 text-center">
          <div class="text-lg font-semibold leading-5 text-blue-600">{{ taskProgress.running }}</div>
          <div class="mt-1 text-xs text-slate-500">运行中</div>
        </div>
        <div class="min-w-16 border-r px-3 text-center">
          <div class="text-lg font-semibold leading-5 text-amber-600">{{ taskProgress.waiting }}</div>
          <div class="mt-1 text-xs text-slate-500">等待人工</div>
        </div>
        <div class="min-w-16 pl-3 text-center">
          <div class="text-lg font-semibold leading-5 text-emerald-600">{{ taskProgress.completed }}</div>
          <div class="mt-1 text-xs text-slate-500">已完成</div>
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
