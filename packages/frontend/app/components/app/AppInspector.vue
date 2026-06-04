<script setup lang="ts">
import { X } from 'lucide-vue-next'
import { nodeTypeLabel, type AppGraphNode, type AppVariable } from '@/lib/app'
import type { WorkflowRecord } from '@/lib/workflow'

const props = defineProps<{
  node: AppGraphNode | null
  variables: AppVariable[]
  workflows: WorkflowRecord[]
}>()

const emit = defineEmits<{
  close: []
  removeNode: [nodeId: string]
  updateNodeData: [nodeId: string, data: Record<string, unknown>]
}>()

const workflowById = computed(() => new Map(props.workflows.map((workflow) => [workflow.id, workflow])))

function toggleDisplayVar(node: AppGraphNode, varKey: string) {
  if (node.type !== 'output_collect' && node.type !== 'manual_gate') return
  const current = node.data.displayVars ?? []
  const displayVars = current.includes(varKey)
    ? current.filter((item) => item !== varKey)
    : [...current, varKey]
  emit('updateNodeData', node.id, { ...node.data, displayVars })
}

function updateWorkflowId(node: AppGraphNode, value: string) {
  if (node.type !== 'workflow_run') return
  emit('updateNodeData', node.id, {
    ...node.data,
    workflowId: value ? Number(value) : null,
    inputBindings: {},
    outputAssignments: {},
  })
}

function updateInputBinding(node: AppGraphNode, parameterKey: string, varKey: string) {
  if (node.type !== 'workflow_run') return
  const inputBindings = { ...node.data.inputBindings }
  if (varKey) inputBindings[parameterKey] = { kind: 'variable', varKey }
  else delete inputBindings[parameterKey]
  emit('updateNodeData', node.id, { ...node.data, inputBindings })
}

function updateOutputAssignment(node: AppGraphNode, resultKey: string, varKey: string) {
  if (node.type !== 'workflow_run') return
  emit('updateNodeData', node.id, {
    ...node.data,
    outputAssignments: { ...node.data.outputAssignments, [resultKey]: varKey || null },
  })
}
</script>

<template>
  <aside v-if="node" class="absolute right-4 top-4 z-20 flex max-h-[calc(100%-2rem)] w-96 flex-col rounded-xl border bg-white">
    <div class="flex items-start gap-3 border-b px-4 py-3">
      <div class="min-w-0 flex-1">
        <div class="text-sm font-semibold text-slate-950">{{ nodeTypeLabel(node.type) }}</div>
        <div class="truncate text-xs text-slate-500">{{ node.id }}</div>
      </div>
      <Button variant="ghost" size="icon" type="button" @click="emit('close')">
        <X class="size-4" />
      </Button>
    </div>

    <div class="flex-1 space-y-4 overflow-y-auto p-4">
      <div v-if="node.type === 'input_collect'" class="rounded-lg border bg-slate-50 p-3 text-sm text-slate-600">
        该节点会在应用启动时收集所有「用户输入」变量，不需要额外配置。
      </div>

      <div v-else-if="node.type === 'output_collect'" class="space-y-2">
        <div class="text-xs text-slate-500">选择最终输出的应用变量</div>
        <label v-for="variable in variables" :key="variable.key" class="flex items-center gap-2 rounded border px-2 py-2 text-sm">
          <input type="checkbox" :checked="node.data.displayVars.includes(variable.key)" @change="toggleDisplayVar(node, variable.key)" />
          <span class="min-w-0 flex-1 truncate">{{ variable.name }}</span>
          <span class="text-xs text-slate-400">{{ variable.type }}</span>
        </label>
      </div>

      <div v-else-if="node.type === 'manual_gate'" class="space-y-3">
        <input
          class="w-full rounded border px-2 py-2 text-sm outline-none"
          :value="node.data.title"
          placeholder="卡点标题"
          @input="emit('updateNodeData', node.id, { ...node.data, title: ($event.target as HTMLInputElement).value })"
        />
        <textarea
          class="min-h-24 w-full rounded border px-2 py-2 text-sm outline-none"
          :value="node.data.description"
          placeholder="给处理人看的说明"
          @input="emit('updateNodeData', node.id, { ...node.data, description: ($event.target as HTMLTextAreaElement).value })"
        />
        <div class="text-xs text-slate-500">人工处理时展示的应用变量</div>
        <label v-for="variable in variables" :key="variable.key" class="flex items-center gap-2 rounded border px-2 py-2 text-sm">
          <input type="checkbox" :checked="node.data.displayVars.includes(variable.key)" @change="toggleDisplayVar(node, variable.key)" />
          <span class="min-w-0 flex-1 truncate">{{ variable.name }}</span>
          <span class="text-xs text-slate-400">{{ variable.type }}</span>
        </label>
      </div>

      <div v-else-if="node.type === 'workflow_run'" class="space-y-4">
        <select class="w-full rounded border bg-white px-2 py-2 text-sm outline-none" :value="node.data.workflowId ?? ''" @change="updateWorkflowId(node, ($event.target as HTMLSelectElement).value)">
          <option value="">选择工作流</option>
          <option v-for="workflow in workflows" :key="workflow.id" :value="workflow.id">
            {{ workflow.name || `未命名工作流 #${workflow.id}` }}
          </option>
        </select>

        <template v-if="node.data.workflowId && workflowById.get(node.data.workflowId)">
          <section class="space-y-2">
            <div class="text-xs font-medium text-slate-600">参数绑定</div>
            <div v-for="parameter in workflowById.get(node.data.workflowId)?.parameters" :key="parameter.key" class="rounded border p-2">
              <div class="mb-1 flex justify-between gap-2 text-xs text-slate-500">
                <span class="truncate">{{ parameter.name }}</span>
                <span>{{ parameter.type }}</span>
              </div>
              <select class="w-full rounded border bg-white px-2 py-1 text-sm outline-none" :value="node.data.inputBindings[parameter.key]?.varKey ?? ''" @change="updateInputBinding(node, parameter.key, ($event.target as HTMLSelectElement).value)">
                <option value="">选择应用变量</option>
                <option v-for="variable in variables" :key="variable.key" :value="variable.key">
                  {{ variable.name }} · {{ variable.type }}{{ variable.type !== parameter.type ? '（类型不同）' : '' }}
                </option>
              </select>
            </div>
          </section>

          <section class="space-y-2">
            <div class="text-xs font-medium text-slate-600">结果赋值</div>
            <div v-for="result in workflowById.get(node.data.workflowId)?.results" :key="result.key" class="rounded border p-2">
              <div class="mb-1 flex justify-between gap-2 text-xs text-slate-500">
                <span class="truncate">{{ result.name }}</span>
                <span>{{ result.type }}</span>
              </div>
              <select class="w-full rounded border bg-white px-2 py-1 text-sm outline-none" :value="node.data.outputAssignments[result.key] ?? ''" @change="updateOutputAssignment(node, result.key, ($event.target as HTMLSelectElement).value)">
                <option value="">丢弃该结果</option>
                <option v-for="variable in variables" :key="variable.key" :value="variable.key">
                  {{ variable.name }} · {{ variable.type }}{{ variable.type !== result.type ? '（类型不同）' : '' }}
                </option>
              </select>
            </div>
          </section>
        </template>
      </div>
    </div>

    <div v-if="!['input_collect', 'output_collect'].includes(node.type)" class="border-t p-3">
      <Button variant="outline" type="button" class="w-full" @click="emit('removeNode', node.id)">删除节点</Button>
    </div>
  </aside>
</template>
