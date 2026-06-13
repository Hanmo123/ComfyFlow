<script setup lang="ts">
import { ClipboardList, Images, LayoutGrid, Menu, Workflow } from 'lucide-vue-next'

const route = useRoute()

const items = [
  { label: '应用编排', to: '/', icon: LayoutGrid },
  { label: '工作流管理', to: '/workflows', icon: Workflow },
  { label: '任务列表', to: '/tasks', icon: ClipboardList },
  { label: '素材库', to: '/library', icon: Images },
]

function selectRoute(to: string) {
  if (route.path !== to) navigateTo(to)
}

function isActiveRoute(to: string) {
  if (to === '/') return route.path === '/'
  return route.path === to || route.path.startsWith(`${to}/`)
}
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="outline" size="icon" type="button" aria-label="菜单">
        <Menu class="size-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" class="w-48">
      <DropdownMenuItem
        v-for="item in items"
        :key="item.to"
        :class="isActiveRoute(item.to) ? 'bg-slate-100 text-slate-950' : ''"
        @select="selectRoute(item.to)"
      >
        <component :is="item.icon" class="size-4" />
        {{ item.label }}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
