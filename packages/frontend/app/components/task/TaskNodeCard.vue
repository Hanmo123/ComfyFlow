<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import { Check, CirclePause, FileInput, GitBranch, GitMerge, GitPullRequest, Image, ImageDown, Images, RotateCw, Type, Workflow } from 'lucide-vue-next'
import ImageViewer from '@/components/ImageViewer.vue'
import {
  APP_VARIABLE_TYPE_LABELS,
  nodeTypeLabel,
  type AppGraphNode,
  type AppTaskNodeRun,
  type AppVariable,
} from '@/lib/app'

const props = defineProps<{
  data: {
    node: AppGraphNode
    nodeRun?: AppTaskNodeRun
    taskVariables: Record<string, unknown>
    appVariables: AppVariable[]
    canRetry: boolean
    retrying: boolean
    canResume: boolean
    resuming: boolean
    onRetry: (nodeId: string, event?: MouseEvent) => void
    onResume: (nodeId: string) => void
  }
}>()

const viewerOpen = ref(false)
const viewerImages = ref<Array<{ url: string; name: string }>>([])
const viewerInitialIndex = ref(0)

function openViewer(images: Array<{ url: string; name: string }>, index: number) {
  viewerImages.value = images
  viewerInitialIndex.value = index
  viewerOpen.value = true
}

const nodeIcons = {
  input_collect: FileInput,
  output_text: Type,
  output_image: Image,
  manual_gate: CirclePause,
  workflow_run: Workflow,
  coalesce: GitMerge,
  conditional: GitBranch,
  image_compress: ImageDown,
  image_concat: Images,
  wait_for_previous: GitPullRequest,
} as const

const statusLabel = computed(() => {
  const labels = {
    queued: '排队',
    running: '执行中',
    waiting: '等待确认',
    completed: '完成',
    failed: '失败',
    skipped: '跳过',
  }
  return props.data.nodeRun ? labels[props.data.nodeRun.status] : '未执行'
})

const cardClass = computed(() => {
  const status = props.data.nodeRun?.status
  if (status === 'completed') return 'border-green-300 bg-green-50'
  if (status === 'failed') return 'border-red-300 bg-red-50'
  if (status === 'running') return 'border-blue-300 bg-blue-50'
  if (status === 'waiting') return 'border-amber-300 bg-amber-50'
  return 'border-slate-300 bg-white'
})

const showResumeButton = computed(
  () => props.data.node.type === 'manual_gate' && props.data.nodeRun?.status === 'waiting',
)

const variableByKey = computed(() => new Map(props.data.appVariables.map((variable) => [variable.key, variable])))
const manualGateDisplayItems = computed(() => {
  if (props.data.node.type !== 'manual_gate') return []
  return props.data.node.data.displayVars.map((varKey) => {
    const variable = variableByKey.value.get(varKey)
    const value = props.data.taskVariables[varKey]
    return {
      varKey,
      variable,
      images: variable?.type === 'IMAGE' ? normalizeImages(value) : [],
      text: variable?.type === 'IMAGE' ? '' : formatValue(value),
    }
  })
})

function normalizeImages(value: unknown): Array<{ url: string; name: string }> {
  const items = Array.isArray(value) ? value : value ? [value] : []
  return items.flatMap((item, index) => {
    if (Array.isArray(item)) return normalizeImages(item)
    const url = imageUrl(item)
    return url ? [{ url, name: imageName(item, index) }] : []
  })
}

function imageUrl(value: unknown) {
  if (typeof value === 'string') return value
  if (!value || typeof value !== 'object') return ''
  const image = value as Record<string, unknown>
  if (image.proxy && typeof image.proxy === 'object') {
    const proxy = image.proxy as Record<string, unknown>
    if (typeof proxy.localUrl === 'string') return proxy.localUrl
    if (typeof proxy.url === 'string') return proxy.url
  }
  if (typeof image.localUrl === 'string') return image.localUrl
  return typeof image.url === 'string' ? image.url : ''
}

function imageName(value: unknown, index: number) {
  if (!value || typeof value !== 'object') return `图片 ${index + 1}`
  const image = value as Record<string, unknown>
  return String(image.filename ?? image.name ?? `图片 ${index + 1}`)
}

function formatValue(value: unknown) {
  if (value === undefined || value === null || value === '') return '空'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}
</script>

<template>
  <div
    class="w-[300px] rounded-xl border bg-white p-1 text-left transition-colors"
    :class="showResumeButton ? 'border-amber-300 bg-amber-50' : 'border-transparent'"
  >
    <Handle type="target" :position="Position.Left" class="!bg-slate-500" />

    <div class="rounded-lg border transition-colors" :class="cardClass">
      <div class="flex items-start gap-3 px-3 py-3">
        <div class="rounded-lg border bg-white p-2 text-slate-700">
          <component :is="nodeIcons[props.data.node.type]" class="size-4" />
        </div>
        <div class="min-w-0 flex-1">
          <div class="truncate text-sm font-semibold text-slate-950">
            {{ nodeTypeLabel(props.data.node.type) }}
          </div>
          <div class="mt-0.5 truncate text-xs text-slate-500">{{ props.data.node.id }}</div>
          <div class="mt-2 inline-flex rounded-full border bg-white px-2 py-0.5 text-xs text-slate-600">
            {{ statusLabel }}
          </div>
        </div>
        <Button
          v-if="props.data.node.type === 'workflow_run'"
          variant="outline"
          size="icon"
          type="button"
          class="size-8 bg-white"
          :disabled="!props.data.canRetry || props.data.retrying"
          aria-label="重试节点"
          @click.stop="props.data.onRetry(props.data.node.id, $event)"
        >
          <RotateCw class="size-4" :class="props.data.retrying ? 'animate-spin' : ''" />
        </Button>
      </div>

      <div v-if="props.data.nodeRun?.error" class="border-t border-red-200 px-3 py-2 text-xs text-red-700">
        {{ props.data.nodeRun.error }}
      </div>

      <div
        v-if="props.data.node.type === 'manual_gate' && (props.data.node.data.title || props.data.node.data.description || manualGateDisplayItems.length)"
        class="space-y-3 border-t px-3 py-3"
      >
        <div v-if="props.data.node.data.title || props.data.node.data.description" class="space-y-1">
          <div v-if="props.data.node.data.title" class="text-sm font-medium text-slate-900">
            {{ props.data.node.data.title }}
          </div>
          <div v-if="props.data.node.data.description" class="whitespace-pre-wrap text-xs text-slate-600">
            {{ props.data.node.data.description }}
          </div>
        </div>

        <div v-if="manualGateDisplayItems.length" class="space-y-2">
          <div v-for="item in manualGateDisplayItems" :key="item.varKey" class="space-y-1.5 rounded-lg border bg-white p-2">
            <div class="flex items-center justify-between gap-2 text-xs">
              <span class="min-w-0 truncate font-medium text-slate-700">{{ item.variable?.name ?? item.varKey }}</span>
              <span class="shrink-0 text-slate-400">{{ item.variable ? APP_VARIABLE_TYPE_LABELS[item.variable.type] : '未知' }}</span>
            </div>

            <div v-if="item.images.length" class="grid grid-cols-2 gap-2">
              <button
                v-for="(image, index) in item.images"
                :key="`${item.varKey}-${image.url}`"
                class="overflow-hidden rounded-md border bg-slate-50 transition hover:border-slate-300"
                @click.stop="openViewer(item.images, index)"
              >
                <img :src="image.url" :alt="image.name" class="aspect-square w-full object-cover" />
              </button>
            </div>
            <div v-else class="max-h-24 overflow-auto whitespace-pre-wrap break-words text-xs text-slate-600">
              {{ item.text }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showResumeButton" class="px-1 pb-1 pt-2">
      <Button
        type="button"
        class="h-11 w-full bg-amber-600 text-sm font-semibold text-white hover:bg-amber-700"
        :disabled="!props.data.canResume || props.data.resuming"
        @click.stop="props.data.onResume(props.data.node.id)"
      >
        <Check class="size-4" />
        确认继续
      </Button>
    </div>

    <Handle type="source" :position="Position.Right" class="!bg-slate-500" />

    <ImageViewer v-if="viewerOpen" :images="viewerImages" :initial-index="viewerInitialIndex" @close="viewerOpen = false" />
  </div>
</template>
