<script setup lang="ts">
import { Plus } from 'lucide-vue-next'

const store = useAppDesignerStore()
</script>

<template>
  <div v-if="!store.activeApp.value" class="flex flex-1 flex-col overflow-hidden">
    <div class="border-b p-3">
      <Button type="button" class="w-full" @click="store.createDraftApp">
        <Plus class="mr-2 size-4" />
        新建应用
      </Button>
    </div>
    <div class="flex-1 overflow-y-auto p-3">
      <div v-if="store.apps.value.length === 0" class="rounded-lg border py-6 text-center text-sm text-slate-500">
        暂无应用
      </div>
      <button
        v-for="app in store.apps.value"
        :key="app.id"
        type="button"
        class="mb-2 w-full rounded-lg border bg-white px-3 py-2 text-left hover:border-slate-400"
        @click="store.selectApp(app.id)"
      >
        <div class="truncate text-sm font-medium text-slate-900">{{ app.name }}</div>
        <div class="text-xs text-slate-500">{{ app.variables.length }} 个应用变量</div>
      </button>
    </div>
  </div>

  <div v-else class="flex flex-1 flex-col overflow-hidden">
    <div class="flex gap-2 border-b p-3">
      <Button size="sm" type="button" class="flex-1" :disabled="store.saving.value" @click="store.saveApp">保存</Button>
    </div>

    <div class="flex-1 space-y-5 overflow-y-auto p-3">
      <section class="space-y-2">
        <div class="text-sm font-medium text-slate-800">应用名称</div>
        <input
          class="w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-slate-500"
          :value="store.activeApp.value.name"
          @input="store.updateAppName(($event.target as HTMLInputElement).value)"
        />
      </section>

      <section class="space-y-2">
        <div class="flex items-center justify-between">
          <div class="text-sm font-medium text-slate-800">变量定义</div>
          <Button variant="outline" size="sm" type="button" @click="store.addAppVariable('user_input')">输入</Button>
        </div>
        <div class="text-xs text-slate-500">用户输入变量</div>
        <div v-if="store.userInputVariables.value.length === 0" class="rounded-md border py-4 text-center text-xs text-slate-500">
          尚未定义用户输入变量
        </div>
        <AppVariableRow v-for="variable in store.userInputVariables.value" :key="variable.key" :variable="variable" />

        <div class="pt-2 text-xs text-slate-500">应用变量</div>
        <div v-if="store.computedVariables.value.length === 0" class="rounded-md border py-4 text-center text-xs text-slate-500">
          工作流结果中添加变量后会出现在这里
        </div>
        <AppVariableRow v-for="variable in store.computedVariables.value" :key="variable.key" :variable="variable" />
      </section>

      <section class="space-y-2">
        <div class="text-sm font-medium text-slate-800">添加节点</div>
        <div class="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" type="button" @click="store.addAppNode('workflow_run')">工作流运行</Button>
          <Button variant="outline" size="sm" type="button" @click="store.addAppNode('manual_gate')">人工卡点</Button>
          <Button variant="outline" size="sm" type="button" @click="store.addAppNode('output_text')">输出文本</Button>
          <Button variant="outline" size="sm" type="button" @click="store.addAppNode('output_image')">输出图片</Button>
        </div>
      </section>
    </div>
  </div>
</template>
