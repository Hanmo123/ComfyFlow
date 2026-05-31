<script setup lang="ts">
import { LayoutGrid, Logs, Workflow } from 'lucide-vue-next'

defineProps<{ active: string }>()

const emit = defineEmits<{ select: [value: 'workflow' | 'app' | 'task'] }>()

const items = [
  { value: 'workflow' as const, label: '工作流', icon: Workflow },
  { value: 'app' as const, label: '应用', icon: LayoutGrid },
  { value: 'task' as const, label: '任务', icon: Logs },
]
</script>

<template>
  <nav class="flex flex-col gap-1.5 border-r bg-gray-50 px-2 py-3">
    <button
      v-for="item in items"
      :key="item.value"
      class="flex size-10 items-center justify-center rounded-md transition hover:bg-gray-500/5"
      :class="active === item.value ? 'bg-gray-500/10 text-slate-950' : 'text-slate-500'"
      :title="item.label"
      type="button"
      @click="emit('select', item.value)"
    >
      <component :is="item.icon" class="size-5.5" />
    </button>
  </nav>
</template>
