<script setup lang="ts">
import { ChevronLeft, ChevronRight, Star, X } from 'lucide-vue-next'
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { toast } from 'vue-sonner'

interface ImageItem {
  url: string
  name?: string
  hash?: string | null
  isStarred?: boolean
}

const props = defineProps<{
  images: ImageItem[]
  initialIndex?: number
  autoPlay?: boolean
}>()

const emit = defineEmits<{
  close: []
  indexChange: [index: number]
  starChange: [image: ImageItem, isStarred: boolean]
}>()

const libraryApi = useLibraryApi()
const currentIndex = ref(props.initialIndex ?? 0)
const autoPlayEnabled = ref(Boolean(props.autoPlay))
const autoPlaySeconds = ref(4)
const starring = ref(false)
const starredImageStates = ref<Record<string, boolean>>({})
let autoPlayTimer: ReturnType<typeof window.setTimeout> | null = null

const currentImage = computed(() => props.images[currentIndex.value])
const currentImageStarred = computed(() => {
  const image = currentImage.value
  if (!image?.hash) return image?.isStarred === true
  return starredImageStates.value[image.hash] ?? image.isStarred === true
})
const hasPrev = computed(() => currentIndex.value > 0)
const hasNext = computed(() => currentIndex.value < props.images.length - 1)
const showAutoPlayControls = computed(() => Boolean(props.autoPlay) && props.images.length > 1)
const normalizedAutoPlaySeconds = computed(() => {
  const seconds = Number(autoPlaySeconds.value)
  if (!Number.isFinite(seconds)) return 4
  return Math.min(Math.max(seconds, 1), 60)
})

function setCurrentIndex(index: number) {
  const lastIndex = props.images.length - 1
  currentIndex.value = lastIndex < 0 ? 0 : Math.min(Math.max(index, 0), lastIndex)
}

function prev() {
  if (hasPrev.value) {
    setCurrentIndex(currentIndex.value - 1)
  }
}

function next() {
  if (hasNext.value) {
    setCurrentIndex(currentIndex.value + 1)
  }
}

function clearAutoPlayTimer() {
  if (autoPlayTimer === null) return
  window.clearTimeout(autoPlayTimer)
  autoPlayTimer = null
}

function scheduleAutoPlay() {
  clearAutoPlayTimer()
  if (!autoPlayEnabled.value || !hasNext.value || props.images.length <= 1) return

  autoPlayTimer = window.setTimeout(() => {
    autoPlayTimer = null
    if (!autoPlayEnabled.value || !hasNext.value) return
    next()
    scheduleAutoPlay()
  }, normalizedAutoPlaySeconds.value * 1000)
}

function updateAutoPlaySeconds(value: string | number) {
  const seconds = Number(value)
  if (!Number.isFinite(seconds)) return
  autoPlaySeconds.value = Math.min(Math.max(seconds, 1), 60)
}

async function toggleCurrentImageStar() {
  const image = currentImage.value
  if (!image?.hash) {
    toast.error('当前图片无法收藏')
    return
  }
  if (starring.value) return

  const previousValue = currentImageStarred.value
  const nextValue = !previousValue
  starring.value = true
  starredImageStates.value = { ...starredImageStates.value, [image.hash]: nextValue }

  try {
    await libraryApi.updateMediaAssetStar(image.hash, nextValue)
    emit('starChange', { ...image, isStarred: nextValue }, nextValue)
    toast.success(nextValue ? '图片已收藏' : '已取消收藏')
  } catch (error) {
    starredImageStates.value = { ...starredImageStates.value, [image.hash]: previousValue }
    toast.error(error instanceof Error ? error.message : '更新收藏失败')
  } finally {
    starring.value = false
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    emit('close')
  } else if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') {
    prev()
  } else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') {
    next()
  } else if (e.key.toLowerCase() === 'm' && !shouldIgnoreShortcut(e)) {
    e.preventDefault()
    void toggleCurrentImageStar()
  }
}

function shouldIgnoreShortcut(e: KeyboardEvent) {
  const target = e.target
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

function handleBackdropClick(e: MouseEvent) {
  if (e.target === e.currentTarget) {
    emit('close')
  }
}

onMounted(() => {
  document.body.style.overflow = 'hidden'
  window.addEventListener('keydown', handleKeydown)
  scheduleAutoPlay()
})

onUnmounted(() => {
  clearAutoPlayTimer()
  document.body.style.overflow = ''
  window.removeEventListener('keydown', handleKeydown)
})

watch(currentIndex, (index) => {
  emit('indexChange', index)
  scheduleAutoPlay()
})

watch([autoPlayEnabled, normalizedAutoPlaySeconds], () => {
  scheduleAutoPlay()
})

watch(
  () => props.autoPlay,
  (autoPlay) => {
    autoPlayEnabled.value = Boolean(autoPlay)
    scheduleAutoPlay()
  },
)

watch(
  () => props.initialIndex,
  (index) => setCurrentIndex(index ?? 0),
)

watch(
  () => props.images.length,
  () => {
    setCurrentIndex(currentIndex.value)
    scheduleAutoPlay()
  },
)
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
    @click="handleBackdropClick"
  >
    <div class="absolute right-4 top-4 z-10 flex items-center gap-2">
      <button
        v-if="currentImage?.hash"
        type="button"
        class="flex h-10 items-center gap-2 rounded-lg bg-white/10 px-3 text-sm text-white transition hover:bg-white/20"
        :class="currentImageStarred ? 'text-amber-300' : 'text-white'"
        :aria-label="currentImageStarred ? '取消收藏' : '收藏当前图片'"
        @click.stop="toggleCurrentImageStar"
      >
        <Star class="size-4" :fill="currentImageStarred ? 'currentColor' : 'none'" />
        <span>{{ currentImageStarred ? '取消收藏' : '收藏' }}</span>
        <kbd class="rounded border border-white/20 bg-white/10 px-1.5 py-0.5 text-[10px] font-medium leading-none text-white/80">
          M
        </kbd>
      </button>
      <button
        type="button"
        class="rounded-lg bg-white/10 p-2 text-white transition hover:bg-white/20"
        @click="emit('close')"
      >
        <X class="h-6 w-6" />
      </button>
    </div>

    <button
      v-if="images.length > 1 && hasPrev"
      class="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-lg bg-white/10 p-3 text-white transition hover:bg-white/20"
      @click="prev"
    >
      <ChevronLeft class="h-8 w-8" />
    </button>

    <button
      v-if="images.length > 1 && hasNext"
      class="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-lg bg-white/10 p-3 text-white transition hover:bg-white/20"
      @click="next"
    >
      <ChevronRight class="h-8 w-8" />
    </button>

    <div
      v-if="showAutoPlayControls"
      class="absolute bottom-4 left-4 z-10 flex items-center gap-3 rounded-lg bg-black/45 px-3 py-2 text-sm text-white backdrop-blur-sm"
    >
      <label class="flex items-center gap-2 whitespace-nowrap">
        <Switch
          :model-value="autoPlayEnabled"
          @update:model-value="autoPlayEnabled = Boolean($event)"
        />
        自动播放
      </label>
      <label class="flex items-center gap-1.5 whitespace-nowrap text-white/80">
        <Input
          type="number"
          min="1"
          max="60"
          step="0.5"
          :model-value="autoPlaySeconds"
          class="h-7 w-16 border-white/20 bg-white/10 px-2 text-sm text-white focus-visible:ring-white/30"
          @update:model-value="updateAutoPlaySeconds"
        />
        秒/张
      </label>
    </div>

    <div class="relative flex h-dvh w-dvw items-center justify-center overflow-hidden">
      <div class="relative h-dvh">
        <div
          v-if="images.length > 1"
          class="absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-lg bg-black/45 px-4 py-2 text-sm text-white backdrop-blur-sm"
        >
          {{ currentIndex + 1 }} / {{ images.length }}
        </div>

        <img
          v-if="currentImage"
          :src="currentImage.url"
          :alt="currentImage.name || `Image ${currentIndex + 1}`"
          class="h-dvh w-auto max-w-none object-contain"
        />
      </div>
    </div>
  </div>
</template>
