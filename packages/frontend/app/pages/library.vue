<script setup lang="ts">
import { toast } from 'vue-sonner'
import { Images, Plus, Search, Trash2, Upload } from 'lucide-vue-next'
import ImageViewer from '@/components/ImageViewer.vue'
import type { LibraryAsset } from '~/lib/library'

const libraryApi = useLibraryApi()

const assets = ref<LibraryAsset[]>([])
const loading = ref(false)
const currentPage = ref(1)
const totalPages = ref(1)
const keyword = ref('')
const uploadDialogOpen = ref(false)
const uploadFile = ref<File | null>(null)
const uploadDisplayName = ref('')
const uploadDescription = ref('')
const uploadTags = ref('')
const uploading = ref(false)

const viewerOpen = ref(false)
const viewerImages = ref<Array<{ url: string; name: string }>>([])
const viewerInitialIndex = ref(0)

function openViewer(index: number) {
  viewerImages.value = assets.value.map((asset) => ({
    url: asset.mediaAsset.localUrl,
    name: asset.displayName,
  }))
  viewerInitialIndex.value = index
  viewerOpen.value = true
}

async function loadAssets() {
  try {
    loading.value = true
    const params = { page: currentPage.value, limit: 20 }
    const response = keyword.value
      ? await libraryApi.listLibraryAssets({ ...params, keyword: keyword.value })
      : await libraryApi.listLibraryAssets(params)
    
    assets.value = response.data
    totalPages.value = response.meta.lastPage
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '加载素材库失败')
  } finally {
    loading.value = false
  }
}

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    uploadFile.value = target.files[0]
    if (!uploadDisplayName.value) {
      uploadDisplayName.value = target.files[0].name
    }
  }
}

async function handleUpload() {
  if (!uploadFile.value) {
    toast.error('请选择图片文件')
    return
  }

  try {
    uploading.value = true
    await libraryApi.createLibraryAsset({
      file: uploadFile.value,
      displayName: uploadDisplayName.value || undefined,
      description: uploadDescription.value || undefined,
      tags: uploadTags.value || undefined,
    })
    
    toast.success('素材已上传')
    uploadDialogOpen.value = false
    resetUploadForm()
    await loadAssets()
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '上传失败')
  } finally {
    uploading.value = false
  }
}

function resetUploadForm() {
  uploadFile.value = null
  uploadDisplayName.value = ''
  uploadDescription.value = ''
  uploadTags.value = ''
}

async function handleDelete(asset: LibraryAsset) {
  if (!confirm(`确定要删除素材"${asset.displayName}"吗？`)) return

  try {
    await libraryApi.deleteLibraryAsset(asset.id)
    toast.success('素材已删除')
    await loadAssets()
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '删除失败')
  }
}

function handleSearch() {
  currentPage.value = 1
  loadAssets()
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

onMounted(() => {
  loadAssets()
})
</script>

<template>
  <div class="flex h-screen flex-col bg-slate-50">
    <header class="flex items-center justify-between border-b bg-white px-6 py-4">
      <div class="flex items-center gap-3">
        <LayoutAppNavigationMenu />
        <Images class="size-6 text-slate-700" />
        <h1 class="text-xl font-semibold text-slate-950">素材库</h1>
      </div>
      
      <Button @click="uploadDialogOpen = true">
        <Plus class="size-4" />
        上传素材
      </Button>
    </header>

    <div class="flex items-center gap-3 border-b bg-white px-6 py-3">
      <div class="relative flex-1">
        <Search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <Input
          v-model="keyword"
          placeholder="搜索素材名称、描述或标签..."
          class="pl-9"
          @keydown.enter="handleSearch"
        />
      </div>
      <Button variant="outline" @click="handleSearch" :disabled="loading">
        搜索
      </Button>
    </div>

    <main class="flex-1 overflow-auto p-6">
      <div v-if="loading" class="flex items-center justify-center py-12 text-slate-500">
        加载中...
      </div>

      <div v-else-if="assets.length === 0" class="flex flex-col items-center justify-center py-12 text-slate-500">
        <Images class="size-12 mb-3" />
        <p>{{ keyword ? '未找到匹配的素材' : '素材库为空' }}</p>
      </div>

      <div v-else class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        <div
          v-for="(asset, index) in assets"
          :key="asset.id"
          class="group relative overflow-hidden rounded-lg border bg-white transition-shadow hover:shadow-md"
        >
          <button class="aspect-square overflow-hidden bg-slate-100 w-full" @click="openViewer(index)">
            <img
              :src="asset.mediaAsset.localUrl"
              :alt="asset.displayName"
              class="h-full w-full object-cover transition group-hover:scale-105"
            />
          </button>

          <div class="p-3">
            <h3 class="truncate text-sm font-medium text-slate-950" :title="asset.displayName">
              {{ asset.displayName }}
            </h3>
            <p class="mt-1 text-xs text-slate-500">
              {{ formatFileSize(asset.mediaAsset.size) }}
            </p>
          </div>

          <Button
            variant="destructive"
            size="icon"
            class="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100"
            @click.stop="handleDelete(asset)"
          >
            <Trash2 class="size-4" />
          </Button>
        </div>
      </div>

      <div v-if="totalPages > 1" class="mt-6 flex items-center justify-center gap-2">
        <Button
          variant="outline"
          :disabled="currentPage === 1 || loading"
          @click="currentPage--; loadAssets()"
        >
          上一页
        </Button>
        <span class="text-sm text-slate-600">
          第 {{ currentPage }} / {{ totalPages }} 页
        </span>
        <Button
          variant="outline"
          :disabled="currentPage === totalPages || loading"
          @click="currentPage++; loadAssets()"
        >
          下一页
        </Button>
      </div>
    </main>

    <Dialog v-model:open="uploadDialogOpen">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>上传素材</DialogTitle>
        </DialogHeader>

        <div class="space-y-4 py-4">
          <div class="space-y-2">
            <Label for="file">图片文件</Label>
            <Input
              id="file"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              @change="handleFileSelect"
            />
          </div>

          <div class="space-y-2">
            <Label for="displayName">显示名称</Label>
            <Input
              id="displayName"
              v-model="uploadDisplayName"
              placeholder="留空则使用文件名"
            />
          </div>

          <div class="space-y-2">
            <Label for="description">描述</Label>
            <Textarea
              id="description"
              v-model="uploadDescription"
              placeholder="可选"
              rows="3"
            />
          </div>

          <div class="space-y-2">
            <Label for="tags">标签</Label>
            <Input
              id="tags"
              v-model="uploadTags"
              placeholder="多个标签用逗号分隔"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" @click="uploadDialogOpen = false" :disabled="uploading">
            取消
          </Button>
          <Button @click="handleUpload" :disabled="!uploadFile || uploading">
            <Upload class="size-4" />
            {{ uploading ? '上传中...' : '上传' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <ImageViewer v-if="viewerOpen" :images="viewerImages" :initial-index="viewerInitialIndex" @close="viewerOpen = false" />
  </div>
</template>
