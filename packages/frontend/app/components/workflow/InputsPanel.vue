<script setup lang="ts">
import type { WorkflowInputVariable } from '@/lib/workflow'

defineProps<{ inputs: WorkflowInputVariable[] }>()
const emit = defineEmits<{ rename: [key: string, label: string]; remove: [key: string] }>()
</script>

<template>
  <div class="rounded-xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur">
    <div class="mb-2 text-sm font-semibold">输入变量</div>
    <div v-if="inputs.length === 0" class="text-xs text-slate-500">尚未设置输入变量</div>
    <div v-for="item in inputs" :key="item.key" class="mb-2 flex items-center gap-2">
      <input
        class="min-w-0 flex-1 rounded border border-slate-200 px-2 py-1 text-xs"
        :value="item.label"
        @input="emit('rename', item.key, ($event.target as HTMLInputElement).value)"
      />
      <span class="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] text-indigo-700">{{ item.type }}</span>
      <button class="text-xs text-slate-400 hover:text-red-600" type="button" @click="emit('remove', item.key)">删除</button>
    </div>
  </div>
</template>
