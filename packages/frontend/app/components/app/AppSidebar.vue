<script setup lang="ts">
import { Plus, Trash2 } from 'lucide-vue-next'
import { APP_VARIABLE_TYPES, type AppNodeType, type AppRecord, type AppVariable } from '@/lib/app'

defineProps<{
  apps: AppRecord[]
  activeApp: AppRecord | null
  variables: AppVariable[]
  saving?: boolean
}>()

const emit = defineEmits<{
  create: []
  select: [id: number]
  back: []
  save: []
  updateName: [name: string]
  addVariable: [source: AppVariable['source']]
  updateVariable: [key: string, patch: Partial<AppVariable>]
  removeVariable: [key: string]
  addNode: [type: AppNodeType]
}>()
</script>

<template>
  <div v-if="!activeApp" class="flex flex-1 flex-col overflow-hidden">
    <div class="border-b p-3">
      <Button type="button" class="w-full" @click="emit('create')">
        <Plus class="mr-2 size-4" />
        新建应用
      </Button>
    </div>
    <div class="flex-1 overflow-y-auto p-3">
      <div v-if="apps.length === 0" class="rounded-lg border py-6 text-center text-sm text-slate-500">
        暂无应用
      </div>
      <button
        v-for="app in apps"
        :key="app.id"
        type="button"
        class="mb-2 w-full rounded-lg border bg-white px-3 py-2 text-left hover:border-slate-400"
        @click="emit('select', app.id)"
      >
        <div class="truncate text-sm font-medium text-slate-900">{{ app.name }}</div>
        <div class="text-xs text-slate-500">{{ app.variables.length }} 个应用变量</div>
      </button>
    </div>
  </div>

  <div v-else class="flex flex-1 flex-col overflow-hidden">
    <div class="flex gap-2 border-b p-3">
      <Button variant="outline" size="sm" type="button" @click="emit('back')">返回</Button>
      <Button size="sm" type="button" class="flex-1" :disabled="saving" @click="emit('save')">保存</Button>
    </div>

    <div class="flex-1 space-y-5 overflow-y-auto p-3">
      <section class="space-y-2">
        <div class="text-sm font-medium text-slate-800">应用名称</div>
        <input
          class="w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-slate-500"
          :value="activeApp.name"
          @input="emit('updateName', ($event.target as HTMLInputElement).value)"
        />
      </section>

      <section class="space-y-2">
        <div class="flex items-center justify-between">
          <div class="text-sm font-medium text-slate-800">应用变量</div>
          <div class="flex gap-1">
            <Button variant="outline" size="sm" type="button" @click="emit('addVariable', 'user_input')">输入</Button>
            <Button variant="outline" size="sm" type="button" @click="emit('addVariable', 'computed')">变量</Button>
          </div>
        </div>
        <div v-if="variables.length === 0" class="rounded-md border py-4 text-center text-xs text-slate-500">尚未定义应用变量</div>
        <div v-for="variable in variables" :key="variable.key" class="rounded-md border p-2">
          <div class="flex gap-2">
            <input
              class="min-w-0 flex-1 rounded border px-2 py-1 text-sm outline-none"
              :value="variable.name"
              @input="emit('updateVariable', variable.key, { name: ($event.target as HTMLInputElement).value })"
            />
            <select
              class="w-24 rounded border bg-white px-2 py-1 text-xs outline-none"
              :value="variable.type"
              @change="emit('updateVariable', variable.key, { type: ($event.target as HTMLSelectElement).value })"
            >
              <option v-for="type in APP_VARIABLE_TYPES" :key="type" :value="type">{{ type }}</option>
            </select>
            <Button variant="ghost" size="icon" type="button" @click="emit('removeVariable', variable.key)">
              <Trash2 class="size-4" />
            </Button>
          </div>
          <div class="mt-1 text-xs text-slate-500">{{ variable.source === 'user_input' ? '用户输入' : '运行时变量' }}</div>
        </div>
      </section>

      <section class="space-y-2">
        <div class="text-sm font-medium text-slate-800">添加节点</div>
        <div class="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" type="button" @click="emit('addNode', 'workflow_run')">工作流运行</Button>
          <Button variant="outline" size="sm" type="button" @click="emit('addNode', 'manual_gate')">人工卡点</Button>
        </div>
        <div class="text-xs leading-5 text-slate-500">
          点击节点后，在画布右侧配置工作流参数、结果赋值和人工卡点展示变量。
        </div>
      </section>
    </div>
  </div>
</template>
