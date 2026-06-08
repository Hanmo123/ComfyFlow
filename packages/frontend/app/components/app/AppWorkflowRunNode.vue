<script setup lang="ts">
import { ArrowLeft, ArrowRight, Plus } from 'lucide-vue-next'
import {
  APP_VARIABLE_TYPE_COLORS,
  APP_VARIABLE_TYPE_LABELS,
  APP_VARIABLE_TYPES,
  isCompatibleVariableType,
  type AppVariable,
  type WorkflowRunNode,
} from '@/lib/app'

const props = defineProps<{
  node: WorkflowRunNode
}>()

const store = useAppDesignerStore()
const workflow = computed(() => store.workflowOf(props.node))
const EMPTY_WORKFLOW_VALUE = '__empty_workflow__'

function updateWorkflowSelection(value: unknown) {
  const nextValue = String(value ?? '')
  store.updateWorkflowId(props.node, nextValue === EMPTY_WORKFLOW_VALUE ? '' : nextValue)
}

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

function mismatchLabel(variable: AppVariable, expectedType: string) {
  return isCompatibleVariableType(variable.type, expectedType) ? '' : '（类型不同）'
}

function isKnownType(type: string): type is (typeof APP_VARIABLE_TYPES)[number] {
  return APP_VARIABLE_TYPES.includes(type as (typeof APP_VARIABLE_TYPES)[number])
}
</script>

<template>
  <div class="space-y-3">
    <Select
      :model-value="props.node.data.workflowId ? String(props.node.data.workflowId) : undefined"
      @update:model-value="updateWorkflowSelection"
    >
      <SelectTrigger class="h-8">
        <SelectValue placeholder="选择工作流" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem :value="EMPTY_WORKFLOW_VALUE">不选择工作流</SelectItem>
        <SelectItem v-if="store.workflows.value.length === 0" value="__no_workflows__" disabled>
          暂无工作流
        </SelectItem>
        <SelectItem v-for="item in store.workflows.value" :key="item.id" :value="String(item.id)">
          {{ item.name || `未命名工作流 #${item.id}` }}
        </SelectItem>
      </SelectContent>
    </Select>

    <div v-if="!workflow" class="rounded border border-dashed px-2 py-2 text-slate-400">未选择工作流</div>
    <template v-else>
      <section v-if="workflow.parameters.length" class="space-y-2">
        <div class="text-slate-500">参数绑定</div>
        <div class="grid grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-2">
          <template v-for="parameter in workflow.parameters" :key="parameter.key">
            <Badge class="border-0" :class="typeClass(parameter.type)">
              {{ typeLabel(parameter.type) }}
            </Badge>
            <div class="min-w-0 truncate text-sm">{{ parameter.name }}</div>
            <ArrowLeft class="size-3.5 text-slate-400" />
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <button type="button" class="min-w-0 truncate text-left text-sm text-slate-600 hover:text-slate-950">
                  {{ variableName(props.node.data.inputBindings[parameter.key]?.varKey) || '选择变量' }}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" class="w-56">
                <DropdownMenuItem @select="store.updateInputBinding(props.node, parameter.key, '')">
                  不绑定
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  v-for="variable in store.appVariables.value"
                  :key="variable.key"
                  @select="store.updateInputBinding(props.node, parameter.key, variable.key)"
                >
                  {{ variable.name }} · {{ typeLabel(variable.type) }}{{ mismatchLabel(variable, parameter.type) }}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              size="icon"
              type="button"
              class="size-6"
              aria-label="添加为用户输入变量"
              @click="store.addWorkflowInputVariable(props.node.id, parameter.key, { name: parameter.name, type: parameter.type, default: parameter.default })"
            >
              <Plus class="size-3.5" />
            </Button>
          </template>
        </div>
      </section>

      <section v-if="workflow.results.length" class="space-y-2">
        <div class="text-slate-500">结果赋值</div>
        <div class="grid grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-2">
          <template v-for="result in workflow.results" :key="result.key">
            <Badge class="border-0" :class="typeClass(result.type)">
              {{ typeLabel(result.type) }}
            </Badge>
            <div class="min-w-0 truncate text-sm">{{ result.name }}</div>
            <ArrowRight class="size-3.5 text-slate-400" />
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <button type="button" class="min-w-0 truncate text-left text-sm text-slate-600 hover:text-slate-950">
                  {{ variableName(props.node.data.outputAssignments[result.key]) || '丢弃' }}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" class="w-56">
                <DropdownMenuItem @select="store.updateOutputAssignment(props.node, result.key, '')">
                  丢弃该结果
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  v-for="variable in store.computedVariables.value"
                  :key="variable.key"
                  @select="store.updateOutputAssignment(props.node, result.key, variable.key)"
                >
                  {{ variable.name }} · {{ typeLabel(variable.type) }}{{ mismatchLabel(variable, result.type) }}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              size="icon"
              type="button"
              class="size-6"
              @click="store.addWorkflowOutputVariable(props.node.id, result.key, { name: result.name, type: result.type })"
            >
              <Plus class="size-3.5" />
            </Button>
          </template>
        </div>
      </section>
    </template>
  </div>
</template>
