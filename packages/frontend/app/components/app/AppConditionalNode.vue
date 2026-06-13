<script setup lang="ts">
import {
  APP_VARIABLE_TYPE_LABELS,
  APP_VARIABLE_TYPES,
  type ConditionalNode,
} from '@/lib/app'

const props = defineProps<{
  node: ConditionalNode
}>()

const store = useAppDesignerStore()

function variableName(varKey?: string | null) {
  if (!varKey) return ''
  return store.variableByKey.value.get(varKey)?.name ?? varKey
}

function typeLabel(type: string) {
  return isKnownType(type) ? APP_VARIABLE_TYPE_LABELS[type] : type
}

function isKnownType(type: string): type is (typeof APP_VARIABLE_TYPES)[number] {
  return APP_VARIABLE_TYPES.includes(type as (typeof APP_VARIABLE_TYPES)[number])
}

function updateConditionBinding(varKey: string) {
  store.updateAppNodeData(props.node.id, {
    ...props.node.data,
    conditionVarKey: varKey || null,
  })
}
</script>

<template>
  <div class="space-y-2">
    <div class="text-slate-500">条件变量</div>
    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <button
          type="button"
          class="w-full truncate rounded border px-2 py-1.5 text-left text-sm text-slate-600 hover:border-slate-400 hover:text-slate-950"
        >
          {{ variableName(props.node.data.conditionVarKey) || '选择变量' }}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" class="w-56">
        <DropdownMenuItem @select="updateConditionBinding('')">
          不绑定
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          v-for="variable in store.appVariables.value"
          :key="variable.key"
          @select="updateConditionBinding(variable.key)"
        >
          {{ variable.name }} · {{ typeLabel(variable.type) }}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    <div v-if="props.node.data.conditionVarKey" class="rounded border px-2 py-2 text-sm">
      <div class="truncate">{{ store.variableByKey.value.get(props.node.data.conditionVarKey)?.name }}</div>
      <div class="text-xs text-slate-400">
        {{ store.variableByKey.value.get(props.node.data.conditionVarKey)?.type }}
      </div>
    </div>
    
    <div class="rounded border border-dashed bg-slate-50 px-2 py-2 text-xs text-slate-500">
      从绿色出点连出的边：条件为真时执行<br />
      从红色出点连出的边：条件为假时执行
    </div>
  </div>
</template>
