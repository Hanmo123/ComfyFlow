<script setup lang="ts">
import type { ManualGateNode } from '@/lib/app'

const props = defineProps<{
  node: ManualGateNode
}>()

const store = useAppDesignerStore()
</script>

<template>
  <div class="space-y-2">
    <input
      class="w-full rounded border px-2 py-2 text-sm outline-none focus:border-slate-500"
      :value="props.node.data.title"
      placeholder="卡点标题"
      @input="store.updateAppNodeData(props.node.id, { ...props.node.data, title: ($event.target as HTMLInputElement).value })"
    />
    <textarea
      class="min-h-20 w-full rounded border px-2 py-2 text-sm outline-none focus:border-slate-500"
      :value="props.node.data.description"
      placeholder="给处理人看的说明"
      @input="store.updateAppNodeData(props.node.id, { ...props.node.data, description: ($event.target as HTMLTextAreaElement).value })"
    />
    <div class="text-slate-500">展示变量</div>
    <div v-if="store.appVariables.value.length === 0" class="rounded border border-dashed px-2 py-2 text-slate-400">
      暂无应用变量
    </div>
    <label v-for="variable in store.appVariables.value" :key="variable.key" class="flex items-center gap-2 rounded border px-2 py-2 text-sm">
      <input
        type="checkbox"
        :checked="props.node.data.displayVars.includes(variable.key)"
        @change="store.toggleDisplayVar(props.node, variable.key)"
      />
      <span class="min-w-0 flex-1 truncate">{{ variable.name }}</span>
      <span class="text-xs text-slate-400">{{ variable.type }}</span>
    </label>
  </div>
</template>
