<script setup lang="ts">
import { APP_VARIABLE_TYPE_COLORS, APP_VARIABLE_TYPE_LABELS, type ManualGateNode } from '@/lib/app'

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
    <section class="space-y-2">
      <div class="text-slate-500">展示变量</div>
      <div v-if="store.appVariables.value.length === 0" class="rounded border border-dashed px-2 py-2 text-slate-400">
        暂无应用变量
      </div>
      <div v-else class="grid grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-x-2 gap-y-2">
        <label v-for="variable in store.appVariables.value" :key="variable.key" class="contents">
          <input
            type="checkbox"
            class="size-4 accent-slate-950"
            :checked="props.node.data.displayVars.includes(variable.key)"
            @change="store.toggleDisplayVar(props.node, variable.key)"
          />
          <Badge class="border-0" :class="APP_VARIABLE_TYPE_COLORS[variable.type]">
            {{ APP_VARIABLE_TYPE_LABELS[variable.type] }}
          </Badge>
          <span class="min-w-0 truncate text-sm">{{ variable.name }}</span>
        </label>
      </div>
    </section>
  </div>
</template>
