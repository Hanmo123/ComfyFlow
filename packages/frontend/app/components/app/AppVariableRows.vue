<script setup lang="ts">
import type { AppVariable } from "~/lib/app";

const props = defineProps<{
  variables: AppVariable[];
}>();
</script>

<template>
  <div class="grid grid-cols-[auto_1fr_auto_auto] gap-x-2 gap-y-2 items-center">
    <app-variable-row
      v-for="variable in props.variables"
      :key="variable.key"
      :variable="variable"
    />
  </div>
</template>
