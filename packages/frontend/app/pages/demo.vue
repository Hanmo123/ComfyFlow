<script setup lang="ts">
import { LayoutGrid, Logs, Workflow } from "lucide-vue-next";

// 当展示的内容为流程图时（例如 ComfyUI 工作流解析页或 App 编排页）启用
const workflowMode = ref(true);
</script>

<template>
  <main class="flex h-svh p-1 gap-1">
    <!-- 侧边导航 -->
    <div class="flex border rounded-xl overflow-hidden bg-white">
      <!-- 主导航 -->
      <div class="bg-gray-50 border-r px-2 py-3">
        <!-- 导航 -->
        <div class="flex flex-col gap-1.5">
          <!-- ComfyUI 流 -->
          <div
            class="w-10 h-10 flex justify-center items-center rounded-md hover:bg-gray-500/5 bg-gray-500/10!"
          >
            <workflow class="size-5.5" />
          </div>

          <!-- 编排 -->
          <div
            class="w-10 h-10 flex justify-center items-center rounded-md hover:bg-gray-500/5"
          >
            <layout-grid class="size-5.5" />
          </div>

          <div
            class="w-10 h-10 flex justify-center items-center rounded-md hover:bg-gray-500/5"
          >
            <logs class="size-5.5" />
          </div>
        </div>
      </div>

      <!-- 二级菜单 -->
      <div class="w-72 flex flex-col">
        <!-- 二级标题 -->
        <div class="px-4 py-3 text-lg border-b">二级标题</div>

        <!-- 二级内容 -->
        <div></div>
      </div>
    </div>

    <div
      :class="workflowMode ? 'fixed inset-0 -z-10' : 'grow border rounded-xl'"
    ></div>
  </main>
</template>
