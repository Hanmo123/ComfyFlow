<script setup lang="ts">
import { isCompatibleVariableType, type OutputImageNode, type OutputTextNode } from '@/lib/app'

const props = defineProps<{
  node: OutputTextNode | OutputImageNode
}>()

const store = useAppDesignerStore()
const EMPTY_OUTPUT_VAR_VALUE = '__empty_output_var__'

function updateOutputSelection(value: unknown) {
  const nextValue = String(value ?? '')
  store.updateOutputVar(props.node, nextValue === EMPTY_OUTPUT_VAR_VALUE ? '' : nextValue)
}
</script>

<template>
  <div class="space-y-2">
    <div class="text-slate-500">收集变量</div>
    <Select :model-value="props.node.data.varKey || undefined" @update:model-value="updateOutputSelection">
      <SelectTrigger>
        <SelectValue placeholder="选择应用变量" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem :value="EMPTY_OUTPUT_VAR_VALUE">不收集变量</SelectItem>
        <SelectItem v-if="store.appVariables.value.length === 0" value="__no_app_variables__" disabled>
          暂无应用变量
        </SelectItem>
        <SelectItem v-for="variable in store.appVariables.value" :key="variable.key" :value="variable.key">
          {{ variable.name }} · {{ variable.type }}{{ isCompatibleVariableType(variable.type, store.outputType(props.node)) ? '' : '（类型不同）' }}
        </SelectItem>
      </SelectContent>
    </Select>
    <div v-if="props.node.data.varKey" class="rounded border px-2 py-2 text-sm">
      <div class="truncate">{{ store.variableByKey.value.get(props.node.data.varKey)?.name }}</div>
      <div class="text-xs text-slate-400">{{ store.variableByKey.value.get(props.node.data.varKey)?.type }}</div>
    </div>
  </div>
</template>
