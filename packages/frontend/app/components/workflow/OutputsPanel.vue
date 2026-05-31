<script setup lang="ts">
import type { WorkflowOutputVariable } from "@/lib/workflow";

defineProps<{ outputs: WorkflowOutputVariable[] }>();
const emit = defineEmits<{
  rename: [key: string, label: string];
  remove: [key: string];
}>();
</script>

<template>
  <div class="rounded-xl">
    <div class="mb-2 text-sm font-medium text-gray-800">输出变量</div>
    <div
      v-if="outputs.length === 0"
      class="border rounded-md text-center py-4 text-xs text-slate-500"
    >
      尚未设置输出变量
    </div>
    <div v-else class="flex flex-col gap-2">
      <div
        v-for="item in outputs"
        :key="item.key"
        class="border rounded-md p-2"
      >
        <div class="flex justify-between">
          <div
            class="bg-emerald-500/10 text-emerald-600 w-fit px-2 py-1 text-sm rounded-sm"
          >
            ${{ item.key }}
          </div>

          <div
            class="bg-gray-500/10 text-gray-500 w-fit px-2 py-1 text-sm rounded-sm"
          >
            {{ item.type }}
          </div>
        </div>

        <div class="mt-2 pl-0.5 text-[13px] text-gray-500">
          节点 #{{ item.nodeId }} · 插槽 {{ item.slotIndex }}
        </div>
      </div>
    </div>
  </div>
</template>
