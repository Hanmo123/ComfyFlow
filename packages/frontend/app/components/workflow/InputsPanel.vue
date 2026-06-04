<script setup lang="ts">
import type { WorkflowParameter } from "@/lib/workflow";

withDefaults(
  defineProps<{ parameters: WorkflowParameter[]; duplicateNames?: string[] }>(),
  { duplicateNames: () => [] },
);
const emit = defineEmits<{
  rename: [key: string, name: string];
  remove: [key: string];
}>();
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
      <div v-for="item in parameters" :key="item.key" class="border rounded-md p-2">
        <div class="flex justify-between gap-2">
          <div
            class="flex min-w-0 flex-1 items-center rounded-sm border bg-white text-sm"
            :class="
              duplicateNames.includes(item.name)
                ? 'border-red-300'
                : 'border-indigo-200'
            "
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

          <div
            class="bg-gray-500/10 text-gray-500 w-fit px-2 py-1 text-sm rounded-sm"
          >
            {{ item.type }}
          </div>
        </div>

        <div class="mt-2 pl-0.5 text-[13px] text-gray-500">
          节点 #{{ item.nodeId }}
        </div>
      </div>
    </div>
  </div>
</template>
