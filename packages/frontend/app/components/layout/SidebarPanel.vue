<template>
  <aside class="flex w-72 flex-col bg-white">
    <div class="flex min-h-14 items-center gap-2 border-b px-3 py-3">
      <slot name="header-leading" />
      <div class="min-w-0 flex-1 text-lg">
        <slot name="title">
          <span class="block truncate">{{ title }}</span>
        </slot>
      </div>
      <slot name="header-actions" />
    </div>
    <div class="flex flex-1 flex-col overflow-hidden">
      <slot />
    </div>
  </aside>
</template>

<script setup lang="ts">
defineProps<{ title: string }>()
</script>
