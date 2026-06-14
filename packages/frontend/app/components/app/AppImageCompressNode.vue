<script setup lang="ts">
import {
  APP_VARIABLE_TYPE_LABELS,
  APP_VARIABLE_TYPES,
  type ImageCompressNode,
} from "@/lib/app";

const props = defineProps<{
  node: ImageCompressNode;
}>();

const store = useAppDesignerStore();

const imageVariables = computed(() => {
  return store.appVariables.value.filter((v) => v.type === "IMAGE");
});

function variableName(varKey?: string | null) {
  if (!varKey) return "";
  return store.variableByKey.value.get(varKey)?.name ?? varKey;
}

function typeLabel(type: string) {
  return isKnownType(type) ? APP_VARIABLE_TYPE_LABELS[type] : type;
}

function isKnownType(
  type: string,
): type is (typeof APP_VARIABLE_TYPES)[number] {
  return APP_VARIABLE_TYPES.includes(
    type as (typeof APP_VARIABLE_TYPES)[number],
  );
}

function updateVarKey(varKey: string) {
  store.updateAppNodeData(props.node.id, {
    ...props.node.data,
    varKey: varKey || null,
  });
}

function updateQuality(value: number[]) {
  store.updateAppNodeData(props.node.id, {
    ...props.node.data,
    quality: value[0] ?? 80,
  });
}

function updateResizeMode(mode: "longest" | "shortest" | "none") {
  store.updateAppNodeData(props.node.id, {
    ...props.node.data,
    resizeMode: mode,
  });
}

function updateMaxSize(value: string) {
  const numValue = parseInt(value, 10);
  store.updateAppNodeData(props.node.id, {
    ...props.node.data,
    maxSize: isNaN(numValue) ? null : numValue,
  });
}

function updateDeleteOriginalFile(checked: boolean) {
  store.updateAppNodeData(props.node.id, {
    ...props.node.data,
    deleteOriginalFile: checked,
  });
}

const selectedVariable = computed(() => {
  if (!props.node.data.varKey) return null;
  return store.variableByKey.value.get(props.node.data.varKey) ?? null;
});

const resizeModeLabels = {
  longest: "长边限制",
  shortest: "短边限制",
  none: "不裁切",
} as const;
</script>

<template>
  <div class="space-y-3">
    <section class="space-y-2">
      <div class="text-slate-500">选择图片变量</div>
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <button
            type="button"
            class="w-full truncate rounded border px-2 py-1.5 text-left text-sm text-slate-600 hover:border-slate-400 hover:text-slate-950"
          >
            {{ variableName(props.node.data.varKey) || "选择 IMAGE 变量" }}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-56">
          <DropdownMenuItem @select="updateVarKey('')">
            不绑定
          </DropdownMenuItem>
          <DropdownMenuSeparator v-if="imageVariables.length > 0" />
          <DropdownMenuItem
            v-for="variable in imageVariables"
            :key="variable.key"
            @select="updateVarKey(variable.key)"
          >
            {{ variable.name }} · {{ typeLabel(variable.type) }}
          </DropdownMenuItem>
          <DropdownMenuItem v-if="imageVariables.length === 0" disabled>
            暂无 IMAGE 类型变量
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <div v-if="selectedVariable" class="rounded border px-2 py-2 text-sm">
        <div class="truncate">{{ selectedVariable.name }}</div>
        <div class="text-xs text-slate-400">
          {{ typeLabel(selectedVariable.type) }}
        </div>
      </div>
    </section>

    <section class="space-y-2">
      <div class="flex items-center justify-between text-slate-500">
        <span>压缩质量</span>
        <span class="font-mono text-xs text-slate-700">{{
          props.node.data.quality ?? 80
        }}</span>
      </div>
      <Slider
        :model-value="[props.node.data.quality ?? 80]"
        :min="1"
        :max="100"
        :step="1"
        @update:model-value="updateQuality"
      />
      <div class="text-xs text-slate-400">1 = 最小文件, 100 = 最高质量</div>
    </section>

    <section class="space-y-2">
      <div class="text-slate-500">裁切模式</div>
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <button
            type="button"
            class="w-full truncate rounded border px-2 py-1.5 text-left text-sm text-slate-600 hover:border-slate-400 hover:text-slate-950"
          >
            {{ resizeModeLabels[props.node.data.resizeMode ?? "longest"] }}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-56">
          <DropdownMenuItem @select="updateResizeMode('longest')">
            长边限制
          </DropdownMenuItem>
          <DropdownMenuItem @select="updateResizeMode('shortest')">
            短边限制
          </DropdownMenuItem>
          <DropdownMenuItem @select="updateResizeMode('none')">
            不裁切
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </section>

    <section v-if="props.node.data.resizeMode !== 'none'" class="space-y-2">
      <div class="text-slate-500">最大尺寸 (像素)</div>
      <Input
        type="number"
        :model-value="props.node.data.maxSize ?? 2048"
        @update:model-value="updateMaxSize"
        placeholder="2048"
        min="1"
      />
      <div class="text-xs text-slate-400">
        {{
          props.node.data.resizeMode === "longest"
            ? "图片长边不超过此值"
            : "图片短边不超过此值"
        }}
      </div>
    </section>

    <section class="space-y-2">
      <div class="flex items-center gap-2">
        <Checkbox
          :id="`delete-original-${props.node.id}`"
          :checked="props.node.data.deleteOriginalFile ?? false"
          @update:checked="updateDeleteOriginalFile"
        />
        <label
          :for="`delete-original-${props.node.id}`"
          class="cursor-pointer text-sm text-slate-700"
        >
          压缩时删除原图
        </label>
      </div>
    </section>
  </div>
</template>
