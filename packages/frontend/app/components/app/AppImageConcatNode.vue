<script setup lang="ts">
import { ArrowRight, Plus, Trash2 } from 'lucide-vue-next'
import {
  APP_VARIABLE_TYPE_LABELS,
  APP_VARIABLE_TYPES,
  type ImageConcatNode,
} from '@/lib/app'

const props = defineProps<{
  node: ImageConcatNode
}>()

const store = useAppDesignerStore()

const imageVariables = computed(() => store.appVariables.value.filter((variable) => variable.type === 'IMAGE'))
const outputVariables = computed(() => store.computedVariables.value.filter((variable) => variable.type === 'IMAGE' || variable.type === 'UNKNOWN'))

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

function updateInputBinding(index: number, varKey: string) {
  const inputs = [...props.node.data.inputs]
  inputs[index] = { varKey: varKey || null }
  store.updateAppNodeData(props.node.id, { ...props.node.data, inputs })
}

function addInput() {
  store.updateAppNodeData(props.node.id, {
    ...props.node.data,
    inputs: [...props.node.data.inputs, { varKey: null }],
  })
}

function removeInput(index: number) {
  if (props.node.data.inputs.length <= 1) return
  store.updateAppNodeData(props.node.id, {
    ...props.node.data,
    inputs: props.node.data.inputs.filter((_, inputIndex) => inputIndex !== index),
  })
}

function updateOutputValue(varKey: string) {
  store.updateAppNodeData(props.node.id, {
    ...props.node.data,
    outputValue: varKey || null,
  })
}
</script>

<template>
  <div class="space-y-3">
    <section class="space-y-2">
      <div class="text-slate-500">输入图片（按顺序拼接）</div>
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
                {{ variableName(input.varKey) || '选择 IMAGE 变量' }}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" class="w-56">
              <DropdownMenuItem @select="updateInputBinding(index, '')">
                不绑定
              </DropdownMenuItem>
              <DropdownMenuSeparator v-if="imageVariables.length > 0" />
              <DropdownMenuItem
                v-for="variable in imageVariables"
                :key="variable.key"
                @select="updateInputBinding(index, variable.key)"
              >
                {{ variable.name }} · {{ typeLabel(variable.type) }}
              </DropdownMenuItem>
              <DropdownMenuItem v-if="imageVariables.length === 0" disabled>
                暂无 IMAGE 类型变量
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
      <Button variant="outline" size="sm" type="button" class="w-full" @click="addInput">
        <Plus class="size-3.5" />
        添加图片输入
      </Button>
      <div class="rounded border border-dashed bg-slate-50 px-2 py-2 text-xs text-slate-500">
        以第一张图片尺寸为基准，横图/方图向右拼接，竖图向下拼接。
        未赋值的输入变量会在执行时自动跳过。
      </div>
    </section>

    <section class="space-y-2">
      <div class="text-slate-500">输出赋值</div>
      <div class="flex items-center gap-2">
        <div class="w-16 text-xs text-slate-500">图片</div>
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
            <DropdownMenuSeparator v-if="outputVariables.length > 0" />
            <DropdownMenuItem
              v-for="variable in outputVariables"
              :key="variable.key"
              @select="updateOutputValue(variable.key)"
            >
              {{ variable.name }} · {{ typeLabel(variable.type) }}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </section>
  </div>
</template>
