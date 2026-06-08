<script setup lang="ts">
import { Plus } from "lucide-vue-next";

const store = useAppDesignerStore();
</script>

<template>
  <div class="space-y-2">
    <div class="flex items-center justify-between gap-3">
      <div class="text-slate-500">用户输入变量</div>
      <Button
        variant="outline"
        class="shadow-none leading-4 text-xs h-6 px-1.5! font-normal gap-0.75"
        size="sm"
        type="button"
        @click="store.addAppVariable('user_input')"
      >
        <Plus class="stroke-[1.5px] size-3.5" />
        添加
      </Button>
    </div>
    <div
      v-if="store.userInputVariables.value.length === 0"
      class="rounded border border-dashed px-2 py-2 text-slate-400"
    >
      暂无用户输入变量
    </div>
    <AppVariableRows v-else :variables="store.userInputVariables.value" />

    <div class="border-t pt-3">
      <div class="mb-2 text-slate-500">应用变量</div>
      <div
        v-if="store.computedVariables.value.length === 0"
        class="rounded border border-dashed px-2 py-2 text-slate-400"
      >
        暂无应用变量
      </div>
      <AppVariableRows v-else :variables="store.computedVariables.value" />
    </div>
  </div>
</template>
