<script setup lang="ts">
const props = defineProps<{ open: boolean; initialName?: string | null; saving?: boolean }>()
const emit = defineEmits<{ close: []; save: [name: string] }>()

const name = ref('')

watch(
  () => props.open,
  (open) => {
    if (open) name.value = props.initialName || ''
  }
)
</script>

<template>
  <div v-if="open" class="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4">
    <div class="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
      <div class="text-lg font-semibold">保存工作流</div>
      <p class="mt-1 text-sm text-slate-500">输入工作流名称，当前输入/输出变量配置将一起保存。</p>
      <input
        v-model="name"
        class="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-950"
        placeholder="例如：基础文生图"
        @keydown.enter="name.trim() && emit('save', name.trim())"
      />
      <div class="mt-4 flex justify-end gap-2">
        <button class="rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100" type="button" @click="emit('close')">
          取消
        </button>
        <button
          class="rounded-lg bg-slate-950 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
          :disabled="!name.trim() || saving"
          @click="emit('save', name.trim())"
        >
          {{ saving ? '保存中...' : '保存' }}
        </button>
      </div>
    </div>
  </div>
</template>
