<script setup lang="ts">
import type { WorkflowInputVariable } from "@/lib/workflow";

defineProps<{ inputs: WorkflowInputVariable[] }>();
const emit = defineEmits<{
  rename: [key: string, label: string];
  remove: [key: string];
}>();
</script>

<template>
  <div class="rounded-xl">
    <div class="mb-2 text-sm font-medium text-gray-800">输入变量</div>
    <div
      v-if="inputs.length === 0"
      class="border rounded-md text-center py-4 text-xs text-slate-500"
    >
      尚未设置输入变量
    </div>
    <div v-else class="flex flex-col gap-2">
      <div v-for="item in inputs" :key="item.key" class="border rounded-md p-2">
        <div class="flex justify-between">
          <div
            class="bg-indigo-500/10 text-indigo-600 w-fit px-2 py-1 text-sm rounded-sm"
          >
            ${{ item.key }}
          </div>

          <div
            class="bg-gray-500/10 text-gray-500 w-fit px-2 py-1 text-sm rounded-sm"
          >
            图片
          </div>
        </div>

        <div class="mt-2 pl-0.5 text-[13px] text-gray-500">
          节点 #{{ item.nodeId }}
        </div>
      </div>
    </div>
    <!-- <div
      v-for="item in inputs"
      :key="item.key"
      class="mb-2 flex items-center gap-2"
    >
      <input
        class="min-w-0 flex-1 rounded border border-slate-200 px-2 py-1 text-xs"
        :value="item.label"
        @input="
          emit('rename', item.key, ($event.target as HTMLInputElement).value)
        "
      />
      <span
        class="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] text-indigo-700"
        >{{ item.type }}</span
      >
      <Button
        variant="ghost"
        size="sm"
        class="h-auto px-1 py-0 text-xs text-slate-400 hover:text-red-600"
        type="button"
        @click="emit('remove', item.key)"
        >删除</Button
      >
    </div> -->
  </div>
</template>
