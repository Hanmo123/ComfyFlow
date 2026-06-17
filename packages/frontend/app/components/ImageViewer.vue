<script setup lang="ts">
import { X, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { onMounted, onUnmounted, computed } from 'vue'

interface ImageItem {
  url: string
  name?: string
}

const props = defineProps<{
  images: ImageItem[]
  initialIndex?: number
}>()

const emit = defineEmits<{
  close: []
}>()

const currentIndex = ref(props.initialIndex ?? 0)

const currentImage = computed(() => props.images[currentIndex.value])
const hasPrev = computed(() => currentIndex.value > 0)
const hasNext = computed(() => currentIndex.value < props.images.length - 1)

function prev() {
  if (hasPrev.value) {
    currentIndex.value--
  }
}

function next() {
  if (hasNext.value) {
    currentIndex.value++
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    emit('close')
  } else if (e.key === 'ArrowLeft') {
    prev()
  } else if (e.key === 'ArrowRight') {
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

    <div
      v-if="images.length > 1"
      class="absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-lg bg-white/10 px-4 py-2 text-sm text-white"
    >
      {{ currentIndex + 1 }} / {{ images.length }}
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

    <div class="relative h-full w-full p-16">
      <img
        :src="currentImage.url"
        :alt="currentImage.name || `Image ${currentIndex + 1}`"
        class="h-full w-full object-contain"
      />
    </div>

    <div
      v-if="currentImage.name"
      class="absolute bottom-4 left-1/2 z-10 max-w-2xl -translate-x-1/2 truncate rounded-lg bg-white/10 px-4 py-2 text-sm text-white"
    >
      {{ currentImage.name }}
    </div>
  </div>
</template>
