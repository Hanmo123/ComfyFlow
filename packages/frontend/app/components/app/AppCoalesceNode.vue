<script setup lang="ts">
import { ArrowRight, Plus, Trash2 } from 'lucide-vue-next'
import {
  APP_VARIABLE_TYPE_COLORS,
  APP_VARIABLE_TYPE_LABELS,
  APP_VARIABLE_TYPES,
  isCompatibleVariableType,
  type AppVariable,
  type CoalesceNode,
} from '@/lib/app'

const props = defineProps<{
  node: CoalesceNode
}>()

const store = useAppDesignerStore()

function variableName(varKey?: string | null) {
  if (!varKey) return ''
  return store.variableByKey.value.get(varKey)?.name ?? varKey
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

function updateInputBinding(index: number, varKey: string) {
  const inputs = [...props.node.data.inputs]
  inputs[index] = { varKey: varKey || null }
  store.updateAppNodeData(props.node.id, { ...props.node.data, inputs })
}

function addInput() {
  const inputs = [...props.node.data.inputs, { varKey: null }]
  store.updateAppNodeData(props.node.id, { ...props.node.data, inputs })
}

function removeInput(index: number) {
  if (props.node.data.inputs.length <= 1) return
  const inputs = props.node.data.inputs.filter((_, i) => i !== index)
  store.updateAppNodeData(props.node.id, { ...props.node.data, inputs })
}

function updateOutputValue(varKey: string) {
  store.updateAppNodeData(props.node.id, {
    ...props.node.data,
    outputValue: varKey || null,
  })
}

function updateOutputSourceIndex(varKey: string) {
  store.updateAppNodeData(props.node.id, {
    ...props.node.data,
    outputSourceIndex: varKey || null,
  })
}
</script>

<template>
  <div class="space-y-3">
    <section class="space-y-2">
      <div class="text-slate-500">输入列表（按顺序检查）</div>
      <div class="space-y-2">
        <div
          v-for="(input, index) in props.node.data.inputs"
          :key="index"
          class="flex items-center gap-2"
        >
          <div class="flex-shrink-0 text-xs text-slate-400">{{ index + 1 }}</div>
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <button
                type="button"
                class="min-w-0 flex-1 truncate rounded border px-2 py-1.5 text-left text-sm text-slate-600 hover:border-slate-400 hover:text-slate-950"
              >
                {{ variableName(input.varKey) || '选择变量' }}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" class="w-56">
              <DropdownMenuItem @select="updateInputBinding(index, '')">
                不绑定
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                v-for="variable in store.appVariables.value"
                :key="variable.key"
                @select="updateInputBinding(index, variable.key)"
              >
                {{ variable.name }} · {{ typeLabel(variable.type) }}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="icon"
            type="button"
            class="size-6 flex-shrink-0"
            :disabled="props.node.data.inputs.length <= 1"
            @click="removeInput(index)"
          >
            <Trash2 class="size-3.5" />
          </Button>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        type="button"
        class="w-full"
        @click="addInput"
      >
        <Plus class="size-3.5" />
        添加输入
      </Button>
    </section>

    <section class="space-y-2">
      <div class="text-slate-500">输出赋值</div>
      <div class="space-y-2">
        <div class="flex items-center gap-2">
          <div class="w-16 text-xs text-slate-500">值</div>
          <ArrowRight class="size-3.5 text-slate-400" />
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <button
                type="button"
                class="min-w-0 flex-1 truncate text-left text-sm text-slate-600 hover:text-slate-950"
              >
                {{ variableName(props.node.data.outputValue) || '丢弃' }}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" class="w-56">
              <DropdownMenuItem @select="updateOutputValue('')">
                丢弃该结果
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                v-for="variable in store.computedVariables.value"
                :key="variable.key"
                @select="updateOutputValue(variable.key)"
              >
                {{ variable.name }} · {{ typeLabel(variable.type) }}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div class="flex items-center gap-2">
          <div class="w-16 text-xs text-slate-500">来源索引</div>
          <ArrowRight class="size-3.5 text-slate-400" />
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <button
                type="button"
                class="min-w-0 flex-1 truncate text-left text-sm text-slate-600 hover:text-slate-950"
              >
                {{ variableName(props.node.data.outputSourceIndex) || '丢弃' }}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" class="w-56">
              <DropdownMenuItem @select="updateOutputSourceIndex('')">
                丢弃该结果
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                v-for="variable in store.computedVariables.value.filter(v => v.type === 'INT' || v.type === 'UNKNOWN')"
                :key="variable.key"
                @select="updateOutputSourceIndex(variable.key)"
              >
                {{ variable.name }} · {{ typeLabel(variable.type) }}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </section>
  </div>
</template>
