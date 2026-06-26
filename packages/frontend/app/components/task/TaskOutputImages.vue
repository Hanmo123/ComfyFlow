<script setup lang="ts">
import { Play, Star } from 'lucide-vue-next'
import ImageViewer from '@/components/ImageViewer.vue'
import type { AppTaskRecord } from '@/lib/app'
import {
  buildTaskInputImageGroups,
  buildTaskImageGroups,
  findTaskImageIndex,
  flattenTaskImageGroups,
  type TaskImageItem,
} from '@/lib/task_images'

const props = defineProps<{
  task: AppTaskRecord | null
  tasks?: AppTaskRecord[]
}>()

const libraryApi = useLibraryApi()

const {
  viewerOpen,
  viewerImages,
  viewerInitialIndex,
  viewerKey,
  openViewer,
  syncViewer,
  closeViewer,
  updateViewerIndex,
} = useTaskImageViewer()
const starredImageStates = ref<Record<string, boolean>>({})
const inputImageProxies = ref<Record<string, { hash: string; url: string; localUrl: string }>>({})

const imageGroups = computed(() => (props.task ? buildTaskImageGroups(props.task) : []))
const inputImageGroups = computed(() => (props.task ? buildTaskInputImageGroups(props.task) : []))
const proxiedInputImageGroups = computed(() =>
  inputImageGroups.value.map((group) => ({
    ...group,
    images: group.images.map((image) => ({ ...image, url: inputProxyUrl(image) ?? image.url })),
  })),
)
const taskViewerImages = computed(() => flattenTaskImageGroups(imageGroups.value))
const inputViewerImages = computed(() => flattenTaskImageGroups(proxiedInputImageGroups.value))
const currentTaskViewerImages = computed(() => [...inputViewerImages.value, ...taskViewerImages.value])
const inputImageHashes = computed(() => {
  const hashes = inputImageGroups.value.map((group) => group.images.map((image) => image.hash)).flat()
  return [...new Set(hashes.filter((hash): hash is string => Boolean(hash)))]
})
const groupImages = computed(() => {
  const seenKeys = new Set<string>()
  const images: TaskImageItem[] = []
  for (const task of props.tasks ?? []) {
    for (const group of buildTaskImageGroups(task)) {
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
const allImages = computed(() => [...taskViewerImages.value, ...groupImages.value])

function syncViewerToCurrentTask() {
  syncViewer(currentTaskViewerImages.value)
}

function openTaskViewer(nodeId: string, varKey: string, imageIndex: number) {
  const index = findTaskImageIndex(currentTaskViewerImages.value, nodeId, varKey, imageIndex)
  if (index < 0) return
  openViewer(currentTaskViewerImages.value, index)
}

function openInputViewer(varKey: string, imageIndex: number) {
  const index = findTaskImageIndex(currentTaskViewerImages.value, 'inputs', varKey, imageIndex)
  if (index < 0) return
  openViewer(currentTaskViewerImages.value, index)
}

function inputProxyUrl(image: TaskImageItem) {
  if (!image.hash) return null
  const proxy = inputImageProxies.value[image.hash]
  return proxy?.localUrl ?? proxy?.url ?? null
}

async function toggleStar(image: TaskImageItem) {
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

function isStarred(image: TaskImageItem) {
  if (!image.hash) return image.isStarred
  return starredImageStates.value[image.hash] ?? image.isStarred
}

function starredImages(images: TaskImageItem[]) {
  return images.filter((image) => isStarred(image))
}

function openStarredViewer(images: TaskImageItem[]) {
  const starred = starredImages(images)
  if (starred.length === 0) return
  openViewer(starred, 0)
}

function restoreStarredFlags(images: TaskImageItem[]) {
  return images.map((image) => {
    if (!image.hash) return image
    return {
      ...image,
      isStarred: starredImageStates.value[image.hash] ?? image.isStarred,
    }
  })
}

watch(
  () => props.task?.id,
  () => {
    starredImageStates.value = {}
    inputImageProxies.value = {}
  },
)

watch(currentTaskViewerImages, () => {
  syncViewerToCurrentTask()
})

watch(
  inputImageHashes,
  async (hashes) => {
    inputImageProxies.value = {}
    if (hashes.length === 0) return
    try {
      inputImageProxies.value = await libraryApi.getMediaAssetProxies(hashes)
    } catch (error) {
      console.error(error)
    }
  },
  { immediate: true },
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
      <div v-if="proxiedInputImageGroups.length" class="mb-5 space-y-3">
        <div class="text-xs font-medium text-slate-500">输入图</div>
        <div class="grid grid-cols-3 gap-2">
          <template v-for="group in proxiedInputImageGroups" :key="group.varKey">
            <button
              v-for="(image, index) in group.images"
              :key="`${group.varKey}-${image.url}`"
              class="group overflow-hidden rounded-lg border bg-slate-50 text-left transition hover:border-slate-300"
              type="button"
              @click="openInputViewer(group.varKey, index)"
            >
              <img :src="image.url" :alt="group.label ?? image.name" class="aspect-square w-full object-cover transition group-hover:scale-[1.02]" />
              <div class="truncate px-2 py-1.5 text-[11px] text-slate-500">{{ group.label ?? group.varKey }}</div>
            </button>
          </template>
        </div>
      </div>

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
              <button class="block w-full" type="button" @click="openTaskViewer(group.nodeId, group.varKey, index)">
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

    <ImageViewer
      v-if="viewerOpen"
      :key="viewerKey"
      :images="viewerImages"
      :initial-index="viewerInitialIndex"
      @index-change="updateViewerIndex"
      @close="closeViewer"
    />
  </aside>
</template>
