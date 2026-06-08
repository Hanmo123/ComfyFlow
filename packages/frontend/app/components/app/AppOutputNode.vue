<script setup lang="ts">
import { isCompatibleVariableType, type OutputImageNode, type OutputTextNode } from '@/lib/app'

const props = defineProps<{
  node: OutputTextNode | OutputImageNode
}>()

const store = useAppDesignerStore()
</script>

<template>
  <div class="space-y-2">
    <div class="text-slate-500">收集变量</div>
    <select
      class="w-full rounded border bg-white px-2 py-2 text-sm outline-none focus:border-slate-500"
      :value="props.node.data.varKey ?? ''"
      @change="store.updateOutputVar(props.node, ($event.target as HTMLSelectElement).value)"
    >
      <option value="">选择应用变量</option>
      <option v-for="variable in store.appVariables.value" :key="variable.key" :value="variable.key">
        {{ variable.name }} · {{ variable.type }}{{ isCompatibleVariableType(variable.type, store.outputType(props.node)) ? '' : '（类型不同）' }}
      </option>
    </select>
    <div v-if="props.node.data.varKey" class="rounded border px-2 py-2 text-sm">
      <div class="truncate">{{ store.variableByKey.value.get(props.node.data.varKey)?.name }}</div>
      <div class="text-xs text-slate-400">{{ store.variableByKey.value.get(props.node.data.varKey)?.type }}</div>
    </div>
  </div>
</template>
