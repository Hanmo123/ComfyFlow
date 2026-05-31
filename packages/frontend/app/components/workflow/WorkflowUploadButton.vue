<script setup lang="ts">
const emit = defineEmits<{ upload: [rawJson: Record<string, unknown>] }>()

const fileInput = ref<HTMLInputElement | null>(null)
const error = ref('')

async function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  try {
    error.value = ''
    const text = await file.text()
    const parsed = JSON.parse(text)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('文件内容必须是 ComfyUI API JSON 对象')
    }
    emit('upload', parsed)
  } catch (uploadError) {
    error.value = uploadError instanceof Error ? uploadError.message : '解析 JSON 失败'
  } finally {
    input.value = ''
  }
}
</script>

<template>
  <div class="space-y-2 p-3">
    <input ref="fileInput" class="hidden" type="file" accept="application/json,.json" @change="onFileChange" />
    <button
      class="w-full rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
      type="button"
      @click="fileInput?.click()"
    >
      上传 ComfyUI API JSON
    </button>
    <p v-if="error" class="text-xs text-red-600">{{ error }}</p>
  </div>
</template>
