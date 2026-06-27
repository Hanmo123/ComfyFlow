import type { TaskImageItem } from '@/lib/task_images'

export function useTaskImageViewer() {
  const viewerOpen = ref(false)
  const viewerImages = ref<TaskImageItem[]>([])
  const viewerInitialIndex = ref(0)
  const viewerCurrentIndex = ref(0)
  const viewerAutoPlay = ref(false)
  const viewerKey = ref(0)

  function openViewer(images: TaskImageItem[], index: number, options: { autoPlay?: boolean } = {}) {
    const nextIndex = imageIndexInBounds(index, images.length)
    viewerImages.value = images
    viewerInitialIndex.value = nextIndex
    viewerCurrentIndex.value = nextIndex
    viewerAutoPlay.value = Boolean(options.autoPlay)
    viewerOpen.value = true
  }

  function syncViewer(images: TaskImageItem[]) {
    if (!viewerOpen.value) return
    if (images.length === 0) {
      viewerImages.value = []
      viewerAutoPlay.value = false
      viewerOpen.value = false
      return
    }

    const nextIndex = imageIndexInBounds(viewerCurrentIndex.value, images.length)
    viewerImages.value = images
    viewerInitialIndex.value = nextIndex
    viewerCurrentIndex.value = nextIndex
    viewerKey.value++
  }

  function closeViewer() {
    viewerAutoPlay.value = false
    viewerOpen.value = false
  }

  function updateViewerIndex(index: number) {
    viewerCurrentIndex.value = index
  }

  function imageIndexInBounds(index: number, length: number) {
    if (length <= 0) return 0
    return Math.min(Math.max(index, 0), length - 1)
  }

  return {
    viewerOpen,
    viewerImages,
    viewerInitialIndex,
    viewerCurrentIndex,
    viewerAutoPlay,
    viewerKey,
    openViewer,
    syncViewer,
    closeViewer,
    updateViewerIndex,
  }
}
