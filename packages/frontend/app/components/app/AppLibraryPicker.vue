<script setup lang="ts">
import { Images, Check } from 'lucide-vue-next'
import type { LibraryAsset } from '~/lib/library'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  select: [asset: LibraryAsset]
}>()

const libraryApi = useLibraryApi()
const assets = ref<LibraryAsset[]>([])
const loading = ref(false)
const selectedAssetId = ref<number | null>(null)

watch(() => props.open, (open) => {
  if (open) {
    selectedAssetId.value = null
    loadAssets()
  }
})

async function loadAssets() {
  try {
    loading.value = true
    const response = await libraryApi.listLibraryAssets({ page: 1, limit: 100 })
    assets.value = response.data
  } catch (error) {
    console.error('Failed to load library assets:', error)
  } finally {
    loading.value = false
  }
}

function handleSelect() {
  const selected = assets.value.find(a => a.id === selectedAssetId.value)
  if (selected) {
    emit('select', selected)
    emit('update:open', false)
  }
}
</script>

<template>
  <Dialog :open="props.open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-3xl">
      <DialogHeader>
        <DialogTitle>从素材库选择</DialogTitle>
      </DialogHeader>

      <div class="max-h-96 overflow-y-auto py-4">
        <div v-if="loading" class="flex items-center justify-center py-12 text-slate-500">
          加载中...
        </div>

        <div v-else-if="assets.length === 0" class="flex flex-col items-center justify-center py-12 text-slate-500">
          <Images class="size-12 mb-3" />
          <p>素材库为空</p>
        </div>

        <div v-else class="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
          <button
            v-for="asset in assets"
            :key="asset.id"
            type="button"
            class="group relative aspect-square overflow-hidden rounded-lg border bg-slate-100 transition-all hover:ring-2 hover:ring-blue-500"
            :class="selectedAssetId === asset.id ? 'ring-2 ring-blue-600' : ''"
            @click="selectedAssetId = asset.id"
          >
            <img
              :src="asset.mediaAsset.localUrl"
              :alt="asset.displayName"
              class="h-full w-full object-cover"
            />
            
            <div
              v-if="selectedAssetId === asset.id"
              class="absolute inset-0 flex items-center justify-center bg-blue-600/20"
            >
              <div class="rounded-full bg-blue-600 p-1">
                <Check class="size-4 text-white" />
              </div>
            </div>

            <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
              <p class="truncate text-xs text-white" :title="asset.displayName">
                {{ asset.displayName }}
              </p>
            </div>
          </button>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="emit('update:open', false)">
          取消
        </Button>
        <Button :disabled="!selectedAssetId" @click="handleSelect">
          确定
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
