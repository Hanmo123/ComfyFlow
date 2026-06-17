<script setup lang="ts">
import { APP_VARIABLE_TYPE_COLORS, APP_VARIABLE_TYPE_LABELS, APP_VARIABLE_TYPES } from '@/lib/app'
import type { WorkflowParameter } from '@/lib/workflow'

withDefaults(
  defineProps<{ parameters: WorkflowParameter[]; duplicateNames?: string[] }>(),
  { duplicateNames: () => [] }
)
const emit = defineEmits<{
  rename: [key: string, name: string]
  remove: [key: string]
  updateDefault: [key: string, value: unknown]
}>()

function defaultValueText(item: WorkflowParameter) {
  if (item.default === undefined || item.default === null) return ''
  if (typeof item.default === 'object') return JSON.stringify(item.default)
  return String(item.default)
}

function updateDefaultValue(item: WorkflowParameter, value: string | number) {
  const text = String(value)
  if (item.type === 'INT') {
    emit('updateDefault', item.key, text.trim() ? Number.parseInt(text, 10) : undefined)
    return
  }
  if (item.type === 'FLOAT') {
    emit('updateDefault', item.key, text.trim() ? Number.parseFloat(text) : undefined)
    return
  }
  emit('updateDefault', item.key, text)
}

function updateBoolDefault(item: WorkflowParameter, value: unknown) {
  emit('updateDefault', item.key, value === 'true')
}

function supportsDefaultEditor(type: string) {
  return ['STRING', 'INT', 'FLOAT', 'BOOL'].includes(type)
}

function typeLabel(type: string) {
  return isKnownType(type) ? APP_VARIABLE_TYPE_LABELS[type] : type
}

function typeClass(type: string) {
  return isKnownType(type) ? APP_VARIABLE_TYPE_COLORS[type] : APP_VARIABLE_TYPE_COLORS.UNKNOWN
}

function isKnownType(type: string): type is (typeof APP_VARIABLE_TYPES)[number] {
  return APP_VARIABLE_TYPES.includes(type as (typeof APP_VARIABLE_TYPES)[number])
}
</script>

<template>
  <div class="rounded-xl">
    <div class="mb-2 text-sm font-medium text-gray-800">工作流参数</div>
    <div
      v-if="parameters.length === 0"
      class="border rounded-md text-center py-4 text-xs text-slate-500"
    >
      尚未设置工作流参数
    </div>
    <div v-else class="flex flex-col gap-2">
      <div
        v-for="item in parameters"
        :key="item.key"
        class="rounded-md border bg-indigo-50 p-2"
        :class="duplicateNames.includes(item.name) ? 'border-red-300' : 'border-indigo-200'"
        :style="{ backgroundColor: duplicateNames.includes(item.name) ? '#fef2f2' : '#eef2ff' }"
      >
        <div class="flex justify-between gap-2">
          <div
            class="flex min-w-0 flex-1 items-center rounded-sm border bg-white text-sm"
            :class="duplicateNames.includes(item.name) ? 'border-red-300' : 'border-indigo-200'"
          >
            <span class="border-r px-2 py-1 text-indigo-600">$</span>
            <input
              class="min-w-0 flex-1 rounded-r px-2 py-1 outline-none"
              :value="item.name"
              @input="
                emit('rename', item.key, ($event.target as HTMLInputElement).value)
              "
            />
          </div>

          <Badge class="border-0" :class="typeClass(item.type)">
            {{ typeLabel(item.type) }}
          </Badge>
        </div>

        <div v-if="supportsDefaultEditor(item.type)" class="mt-2 space-y-1">
          <div class="text-xs text-slate-500">默认值</div>
          <Select v-if="item.type === 'BOOL'" :model-value="String(Boolean(item.default))" @update:model-value="updateBoolDefault(item, $event)">
            <SelectTrigger class="h-8 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">true</SelectItem>
              <SelectItem value="false">false</SelectItem>
            </SelectContent>
          </Select>
          <Textarea
            v-else-if="item.type === 'STRING'"
            class="min-h-20 bg-white text-sm"
            :model-value="defaultValueText(item)"
            @update:model-value="updateDefaultValue(item, $event)"
          />
          <Input
            v-else
            class="h-8 bg-white"
            :type="item.type === 'INT' || item.type === 'FLOAT' ? 'number' : 'text'"
            :step="item.type === 'INT' ? '1' : 'any'"
            :model-value="defaultValueText(item)"
            @update:model-value="updateDefaultValue(item, $event)"
          />
        </div>

        <div class="mt-2 pl-0.5 text-[13px] text-gray-500">
          节点 #{{ item.nodeId }} · {{ item.field }}
        </div>
      </div>
    </div>
  </div>
</template>
