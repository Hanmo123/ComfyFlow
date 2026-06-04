<script setup lang="ts">
withDefaults(defineProps<{ workflowMode?: boolean }>(), {
  workflowMode: true,
});
</script>

<template>
  <main class="flex h-svh gap-1 p-1 text-slate-950">
    <div class="z-10 flex overflow-hidden rounded-xl border bg-white shadow-sm">
      <slot name="rail" />
      <slot name="panel" />
    </div>

    <section
      class="relative z-0 min-w-0 grow overflow-hidden rounded-xl"
      :class="workflowMode ? '' : 'border bg-white'"
    >
      <slot />
    </section>
  </main>
</template>
