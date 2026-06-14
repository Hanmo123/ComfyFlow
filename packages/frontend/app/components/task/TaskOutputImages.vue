<script setup lang="ts">
import type { AppTaskRecord } from '@/lib/app'

const props = defineProps<{
  task: AppTaskRecord | null
}>()

const imageGroups = computed(() => {
  if (!props.task) return []
  const imageVariableKeys = new Set(
    props.task.appSnapshot.variables.filter((variable) => variable.type === 'IMAGE').map((variable) => variable.key),
  )
  const displayedVarKeys = new Set<string>()
  const groups: Array<{ nodeId: string; varKey: string; images: Array<{ url: string; name: string }> }> = []

  for (const node of props.task.appSnapshot.graph.nodes) {
    if (node.type !== 'output_image' || !node.data.varKey) continue
    addImageGroup(groups, displayedVarKeys, node.id, node.data.varKey)
  }

  for (const node of props.task.appSnapshot.graph.nodes) {
    if (node.type !== 'manual_gate') continue
    for (const varKey of node.data.displayVars) {
      if (!imageVariableKeys.has(varKey)) continue
      addImageGroup(groups, displayedVarKeys, node.id, varKey)
    }
  }

  return groups
})

function addImageGroup(
  groups: Array<{ nodeId: string; varKey: string; images: Array<{ url: string; name: string }> }>,
  displayedVarKeys: Set<string>,
  nodeId: string,
  varKey: string,
) {
  if (displayedVarKeys.has(varKey)) return
  const images = normalizeImages(props.task?.outputs[varKey] ?? props.task?.variables[varKey])
  if (images.length === 0) return
  groups.push({ nodeId, varKey, images })
  displayedVarKeys.add(varKey)
}

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
</script>

<template>
  <aside class="flex h-full w-[360px] shrink-0 flex-col border-l bg-white">
    <div class="border-b px-4 py-3">
      <div class="text-sm font-semibold">输出图片</div>
      <div class="mt-1 text-xs text-slate-500">所有输出图片默认保留。</div>
    </div>
    <div class="flex-1 overflow-y-auto p-4">
      <div v-if="imageGroups.length === 0" class="rounded-xl border border-dashed p-6 text-center text-sm text-slate-500">
        暂无输出图片
      </div>

      <div v-else class="space-y-6">
        <section v-for="group in imageGroups" :key="group.nodeId" class="space-y-3">
          <div class="text-xs font-medium text-slate-500">{{ group.nodeId }} · ${{ group.varKey }}</div>
          <div class="grid grid-cols-2 gap-3">
            <a
              v-for="image in group.images"
              :key="`${group.nodeId}-${image.url}`"
              :href="image.url"
              target="_blank"
              class="group overflow-hidden rounded-lg border bg-slate-50"
            >
              <img :src="image.url" :alt="image.name" class="aspect-square w-full object-cover transition group-hover:scale-[1.02]" />
            </a>
          </div>
        </section>
      </div>
    </div>
  </aside>
</template>
