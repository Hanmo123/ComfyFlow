<script setup lang="ts">
import { Play, Star } from 'lucide-vue-next'
import type { AppTaskRecord } from '@/lib/app'
import ImageViewer from '@/components/ImageViewer.vue'

interface OutputImageItem {
  url: string
  name: string
  hash: string | null
  isStarred: boolean
}

const props = defineProps<{
  task: AppTaskRecord | null
  tasks?: AppTaskRecord[]
}>()

const libraryApi = useLibraryApi()

const viewerOpen = ref(false)
const viewerImages = ref<OutputImageItem[]>([])
const viewerInitialIndex = ref(0)
const starredImageStates = ref<Record<string, boolean>>({})

function openViewer(images: OutputImageItem[], index: number) {
  viewerImages.value = images
  viewerInitialIndex.value = index
  viewerOpen.value = true
}

async function toggleStar(image: OutputImageItem) {
  if (!image.hash) return
  const nextValue = !isStarred(image)
  starredImageStates.value = { ...starredImageStates.value, [image.hash]: nextValue }

  try {
    await libraryApi.updateMediaAssetStar(image.hash, nextValue)
  } catch (error) {
    starredImageStates.value = { ...starredImageStates.value, [image.hash]: !nextValue }
    console.error(error)
  }
}

function isStarred(image: OutputImageItem) {
  if (!image.hash) return image.isStarred
  return starredImageStates.value[image.hash] ?? image.isStarred
}

function starredImages(images: OutputImageItem[]) {
  return images.filter((image) => isStarred(image))
}

function openStarredViewer(images: OutputImageItem[]) {
  const starred = starredImages(images)
  if (starred.length === 0) return
  openViewer(starred, 0)
}

function restoreStarredFlags(images: OutputImageItem[]) {
  return images.map((image) => {
    if (!image.hash) return image
    return {
      ...image,
      isStarred: starredImageStates.value[image.hash] ?? image.isStarred,
    }
  })
}

const imageGroups = computed(() => {
  return props.task ? buildImageGroups(props.task) : []
})

const groupImages = computed(() => {
  const seenKeys = new Set<string>()
  const images: OutputImageItem[] = []
  for (const task of props.tasks ?? []) {
    for (const group of buildImageGroups(task)) {
      for (const image of group.images) {
        const key = image.hash ?? image.url
        if (seenKeys.has(key)) continue
        seenKeys.add(key)
        images.push({ ...image, name: `#${task.id} · ${image.name}` })
      }
    }
  }
  return images
})

const allImages = computed(() => [...imageGroups.value.flatMap((group) => group.images), ...groupImages.value])

function buildImageGroups(task: AppTaskRecord) {
  const imageVariableKeys = new Set(
    task.appSnapshot.variables.filter((variable) => variable.type === 'IMAGE').map((variable) => variable.key),
  )
  const displayedVarKeys = new Set<string>()
  const groups: Array<{ nodeId: string; varKey: string; images: OutputImageItem[] }> = []

  for (const node of task.appSnapshot.graph.nodes) {
    if (node.type !== 'output_image' || !node.data.varKey) continue
    addImageGroup(task, groups, displayedVarKeys, node.id, node.data.varKey)
  }

  for (const node of task.appSnapshot.graph.nodes) {
    if (node.type !== 'manual_gate') continue
    for (const varKey of node.data.displayVars) {
      if (!imageVariableKeys.has(varKey)) continue
      addImageGroup(task, groups, displayedVarKeys, node.id, varKey)
    }
  }

  return groups
}

watch(
  () => props.task?.id,
  () => {
    starredImageStates.value = {}
  },
)

watch(
  allImages,
  async (images) => {
    const hashes = images.map((image) => image.hash).filter((hash): hash is string => Boolean(hash))
    if (hashes.length === 0) return
    try {
      const states = await libraryApi.getMediaAssetStarStates(hashes)
      starredImageStates.value = states
      viewerImages.value = restoreStarredFlags(viewerImages.value)
    } catch (error) {
      console.error(error)
    }
  },
  { immediate: true },
)

function addImageGroup(
  task: AppTaskRecord,
  groups: Array<{ nodeId: string; varKey: string; images: OutputImageItem[] }>,
  displayedVarKeys: Set<string>,
  nodeId: string,
  varKey: string,
) {
  if (displayedVarKeys.has(varKey)) return
  const images = normalizeImages(task.outputs[varKey] ?? task.variables[varKey])
  if (images.length === 0) return
  groups.push({ nodeId, varKey, images })
  displayedVarKeys.add(varKey)
}

function normalizeImages(value: unknown): OutputImageItem[] {
  const items = Array.isArray(value) ? value : value ? [value] : []
  return items.flatMap((item, index) => {
    if (Array.isArray(item)) return normalizeImages(item)
    const url = imageUrl(item)
    return url ? [{ url, name: imageName(item, index), hash: imageHash(item), isStarred: imageIsStarred(item) }] : []
  })
}

function imageUrl(value: unknown) {
  if (typeof value === 'string') return value
  if (!value || typeof value !== 'object') return ''
  const image = value as Record<string, unknown>
  
  // 优先使用代理图片
  if (image.proxy && typeof image.proxy === 'object') {
    const proxy = image.proxy as Record<string, unknown>
    if (typeof proxy.localUrl === 'string') return proxy.localUrl
    if (typeof proxy.url === 'string') return proxy.url
  }
  
  // 降级到原图
  if (typeof image.localUrl === 'string') return image.localUrl
  return typeof image.url === 'string' ? image.url : ''
}

function imageName(value: unknown, index: number) {
  if (!value || typeof value !== 'object') return `图片 ${index + 1}`
  const image = value as Record<string, unknown>
  return String(image.filename ?? image.name ?? `图片 ${index + 1}`)
}

function imageHash(value: unknown) {
  if (!value || typeof value !== 'object') return null
  const image = value as Record<string, unknown>
  return typeof image.hash === 'string' ? image.hash : null
}

function imageIsStarred(value: unknown) {
  if (!value || typeof value !== 'object') return false
  const image = value as Record<string, unknown>
  return image.isStarred === true
}
</script>

<template>
  <aside class="flex h-full w-[360px] shrink-0 flex-col border-l bg-white">
    <div class="border-b px-4 py-3">
      <div class="flex items-center justify-between gap-3">
        <div>
          <div class="text-sm font-semibold">输出图片</div>
          <div class="mt-1 text-xs text-slate-500">所有输出图片默认保留。</div>
        </div>
        <Button
          v-if="starredImages(groupImages).length"
          variant="outline"
          size="sm"
          type="button"
          class="h-8 gap-1.5 px-2 text-xs"
          @click="openStarredViewer(groupImages)"
        >
          <Play class="size-3.5" />
          放映星标
        </Button>
      </div>
    </div>
    <div class="flex-1 overflow-y-auto p-4">
      <div v-if="imageGroups.length === 0" class="rounded-xl border border-dashed p-6 text-center text-sm text-slate-500">
        暂无输出图片
      </div>

      <div v-else class="space-y-6">
        <section v-for="group in imageGroups" :key="group.nodeId" class="space-y-3">
          <div class="text-xs font-medium text-slate-500">{{ group.nodeId }} · ${{ group.varKey }}</div>
          <div class="grid grid-cols-2 gap-3">
            <div
              v-for="(image, index) in group.images"
              :key="`${group.nodeId}-${image.url}`"
              class="group relative overflow-hidden rounded-lg border bg-slate-50 transition hover:border-slate-300"
            >
              <button class="block w-full" type="button" @click="openViewer(group.images, index)">
                <img :src="image.url" :alt="image.name" class="aspect-square w-full object-cover transition group-hover:scale-[1.02]" />
              </button>
              <button
                type="button"
                class="absolute right-2 top-2 rounded-full bg-black/55 p-1.5 text-white transition hover:bg-black/75"
                :class="isStarred(image) ? 'text-amber-300' : 'text-white/80'"
                :disabled="!image.hash"
                @click.stop="toggleStar(image)"
                :aria-label="isStarred(image) ? '取消星标' : '星标图片'"
              >
                <Star class="size-4" :fill="isStarred(image) ? 'currentColor' : 'none'" />
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>

    <ImageViewer v-if="viewerOpen" :images="viewerImages" :initial-index="viewerInitialIndex" @close="viewerOpen = false" />
  </aside>
</template>
