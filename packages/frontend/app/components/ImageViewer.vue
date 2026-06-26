<script setup lang="ts">
import { X, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { onMounted, onUnmounted, computed, watch } from 'vue'

interface ImageItem {
  url: string
  name?: string
  isStarred?: boolean
}

const props = defineProps<{
  images: ImageItem[]
  initialIndex?: number
}>()

const emit = defineEmits<{
  close: []
  indexChange: [index: number]
}>()

const currentIndex = ref(props.initialIndex ?? 0)

const currentImage = computed(() => props.images[currentIndex.value])
const hasPrev = computed(() => currentIndex.value > 0)
const hasNext = computed(() => currentIndex.value < props.images.length - 1)

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

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    emit('close')
  } else if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') {
    prev()
  } else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') {
    next()
  }
}

function handleBackdropClick(e: MouseEvent) {
  if (e.target === e.currentTarget) {
    emit('close')
  }
}

onMounted(() => {
  document.body.style.overflow = 'hidden'
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.body.style.overflow = ''
  window.removeEventListener('keydown', handleKeydown)
})

watch(currentIndex, (index) => {
  emit('indexChange', index)
})

watch(
  () => props.initialIndex,
  (index) => setCurrentIndex(index ?? 0),
)

watch(
  () => props.images.length,
  () => setCurrentIndex(currentIndex.value),
)
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
    @click="handleBackdropClick"
  >
    <button
      class="absolute right-4 top-4 z-10 rounded-lg bg-white/10 p-2 text-white transition hover:bg-white/20"
      @click="emit('close')"
    >
      <X class="h-6 w-6" />
    </button>

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
