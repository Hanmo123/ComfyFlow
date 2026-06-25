<script setup lang="ts">
import { MoreVertical, Pencil, Plus, Trash2, Workflow } from 'lucide-vue-next'
import type { WorkflowRecord } from '@/lib/workflow'

const workflowApi = useWorkflowApi()

const fileInput = ref<HTMLInputElement | null>(null)
const workflows = ref<WorkflowRecord[]>([])
const uploading = ref(false)
const renaming = ref(false)
const renameDialogOpen = ref(false)
const renamingWorkflow = ref<WorkflowRecord | null>(null)
const deletingId = ref<number | null>(null)
const error = ref('')

onMounted(() => {
  refreshWorkflows()
})

async function refreshWorkflows() {
  try {
    error.value = ''
    workflows.value = await workflowApi.listWorkflows()
  } catch (loadError) {
    error.value = loadError instanceof Error ? loadError.message : '加载工作流失败'
  }
}

async function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  try {
    uploading.value = true
    error.value = ''
    const parsed = JSON.parse(await file.text())
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('文件内容必须是 ComfyUI API JSON 对象')
    }

    const detail = await workflowApi.uploadWorkflow(parsed)
    await navigateTo(`/workflows/${detail.workflow.id}`)
  } catch (uploadError) {
    error.value = uploadError instanceof Error ? uploadError.message : '上传工作流失败'
  } finally {
    uploading.value = false
    input.value = ''
  }
}

function workflowTitle(workflow: WorkflowRecord) {
  return workflow.name || `未命名工作流 #${workflow.id}`
}

function openRenameDialog(workflow: WorkflowRecord) {
  renamingWorkflow.value = workflow
  renameDialogOpen.value = true
}

async function renameWorkflow(name: string) {
  if (!renamingWorkflow.value || renaming.value) return

  try {
    renaming.value = true
    error.value = ''
    const detail = await workflowApi.renameWorkflow(renamingWorkflow.value.id, name)
    workflows.value = workflows.value.map((item) => (item.id === detail.workflow.id ? detail.workflow : item))
    renameDialogOpen.value = false
    renamingWorkflow.value = null
  } catch (renameError) {
    error.value = renameError instanceof Error ? renameError.message : '重命名工作流失败'
  } finally {
    renaming.value = false
  }
}

async function deleteWorkflow(workflow: WorkflowRecord) {
  const confirmed = window.confirm(`确定删除 ${workflowTitle(workflow)}？`)
  if (!confirmed) return

  try {
    deletingId.value = workflow.id
    error.value = ''
    await workflowApi.deleteWorkflow(workflow.id)
    workflows.value = workflows.value.filter((item) => item.id !== workflow.id)
  } catch (deleteError) {
    error.value = deleteError instanceof Error ? deleteError.message : '删除工作流失败'
  } finally {
    deletingId.value = null
  }
}

function formatDate(value: string | null) {
  if (!value) return '尚未更新'
  return new Date(value).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <main class="h-svh overflow-hidden bg-slate-50 text-slate-950">
    <div class="relative h-full">
      <div class="absolute left-4 top-4 z-30 flex items-center gap-2">
        <LayoutAppNavigationMenu />
        <div class="flex h-9 items-center rounded-md border bg-white px-3 text-sm font-medium shadow-sm">
          工作流管理
        </div>
      </div>

      <div class="absolute right-4 top-4 z-30 flex items-center gap-2">
        <input ref="fileInput" class="hidden" type="file" accept="application/json,.json" @change="onFileChange" />
        <Button type="button" :disabled="uploading" class="shadow-sm" @click="fileInput?.click()">
          <Plus class="size-4" />
          添加工作流
        </Button>
      </div>

      <div class="h-full overflow-auto pt-20 px-4 pb-6 sm:px-6 lg:px-8">
        <div class="mx-auto w-full max-w-7xl">
          <section>
            <div v-if="workflows.length === 0" class="flex min-h-[420px] items-center justify-center rounded-xl border border-dashed bg-white">
              <div class="max-w-sm text-center">
                <div class="mx-auto flex size-12 items-center justify-center rounded-full bg-slate-100">
                  <Workflow class="size-6 text-slate-500" />
                </div>
                <div class="mt-4 text-base font-medium">还没有工作流</div>
                <p class="mt-2 text-sm text-slate-500">先添加一个 ComfyUI API JSON，随后进入详情页配置参数与结果。</p>
                <Button class="mt-4" type="button" :disabled="uploading" @click="fileInput?.click()">
                  <Plus class="size-4" />
                  添加工作流
                </Button>
              </div>
            </div>

            <div v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <article
                v-for="workflow in workflows"
                :key="workflow.id"
                class="group rounded-xl border bg-white p-4 transition hover:border-slate-400 hover:shadow-md"
              >
                <div class="flex items-start justify-between gap-3">
                  <NuxtLink :to="`/workflows/${workflow.id}`" class="min-w-0 flex-1">
                    <div class="truncate text-base font-semibold text-slate-950">{{ workflowTitle(workflow) }}</div>
                    <div class="mt-1 text-xs text-slate-500">#{{ workflow.id }} · {{ workflow.status }}</div>
                  </NuxtLink>
                  <DropdownMenu>
                    <DropdownMenuTrigger as-child>
                      <Button variant="ghost" size="icon" type="button" :disabled="deletingId === workflow.id" aria-label="工作流操作">
                        <MoreVertical class="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" class="w-36">
                      <DropdownMenuItem @select="openRenameDialog(workflow)">
                        <Pencil class="size-4" />
                        重命名
                      </DropdownMenuItem>
                      <DropdownMenuItem class="text-red-600 focus:text-red-600" @select="deleteWorkflow(workflow)">
                        <Trash2 class="size-4" />
                        删除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <NuxtLink :to="`/workflows/${workflow.id}`" class="mt-5 grid grid-cols-2 gap-2 text-sm">
                  <div class="rounded-lg border bg-slate-50 px-3 py-2">
                    <div class="text-lg font-semibold">{{ workflow.parameters.length }}</div>
                    <div class="text-xs text-slate-500">参数</div>
                  </div>
                  <div class="rounded-lg border bg-slate-50 px-3 py-2">
                    <div class="text-lg font-semibold">{{ workflow.results.length }}</div>
                    <div class="text-xs text-slate-500">结果</div>
                  </div>
                </NuxtLink>
                <NuxtLink :to="`/workflows/${workflow.id}`" class="mt-4 block truncate text-xs text-slate-500">更新于 {{ formatDate(workflow.updatedAt ?? workflow.createdAt) }}</NuxtLink>
              </article>
            </div>
          </section>

          <div v-if="error" class="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        {{ error }}
      </div>

      <WorkflowSaveWorkflowDialog
        :open="renameDialogOpen"
        :initial-name="renamingWorkflow?.name || ''"
        :saving="renaming"
        title="重命名工作流"
        description="输入新的工作流名称。"
        submit-label="重命名"
        @close="renameDialogOpen = false"
        @save="renameWorkflow"
      />
        </div>
      </div>
    </div>
  </main>
</template>
