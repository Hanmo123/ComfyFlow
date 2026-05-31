<script setup lang="ts">
import type { WorkflowOutputVariable } from '@/lib/workflow'

defineProps<{ outputs: WorkflowOutputVariable[] }>()
const emit = defineEmits<{ rename: [key: string, label: string]; remove: [key: string] }>()
</script>

<template>
  <div class="rounded-xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur">
    <div class="mb-2 text-sm font-semibold">输出变量</div>
    <div v-if="outputs.length === 0" class="text-xs text-slate-500">尚未设置输出变量</div>
    <div v-for="item in outputs" :key="item.key" class="mb-2 flex items-center gap-2">
      <input
        class="min-w-0 flex-1 rounded border border-slate-200 px-2 py-1 text-xs"
        :value="item.label"
        @input="emit('rename', item.key, ($event.target as HTMLInputElement).value)"
      />
      <span class="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-700">{{ item.type }}</span>
      <button class="text-xs text-slate-400 hover:text-red-600" type="button" @click="emit('remove', item.key)">删除</button>
    </div>
  </div>
</template>
