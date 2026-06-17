<script setup lang="ts">
import { RefreshCw, Save, Loader2, Trash2, Images } from "lucide-vue-next";
import { toast } from "vue-sonner";
import type { AppVariable, LoraItem, AppInputPreset } from "@/lib/app";
import type { LibraryAsset } from "~/lib/library";

const props = defineProps<{
  open: boolean;
  taskGroupId: number | null;
  taskGroupName?: string;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
}>();

const store = useAppDesignerStore();
const appApi = useAppApi();

interface RunFormState {
  textValues: Record<string, string>;
  fileValues: Record<string, File | null>;
  libraryAssetValues: Record<string, LibraryAsset | null>;
  previousImageValues: Record<string, unknown | null>;
  loraListValues: Record<string, LoraItem[]>;
}

interface BatchImageItem extends RunFormState {
  id: string;
  file: File;
  previewUrl: string;
  status: "draft" | "submitting" | "submitted" | "failed";
  taskId?: number;
  error?: string;
}

const textValues = ref<Record<string, string>>({});
const fileValues = ref<Record<string, File | null>>({});
const libraryAssetValues = ref<Record<string, LibraryAsset | null>>({});
const previousImageValues = ref<Record<string, unknown | null>>({});
const loraListValues = ref<Record<string, LoraItem[]>>({});
const loraOptions = ref<string[]>([]);
const loraCacheExpiresAt = ref(0);
const lorasLoading = ref(false);
const submitting = ref(false);
const stringPresets = ref<AppInputPreset[]>([]);
const loadingStringPresets = ref(false);
const savingStringPreset = ref(false);
const newStringPresetName = ref("");
const showSaveStringPresetDialog = ref(false);
const currentStringPresetKey = ref<string>("");
const hasLoraInputs = computed(() =>
  store.userInputVariables.value.some(
    (variable) =>
      variable.type === "LORA_NAME" || variable.type === "LORA_LIST",
  ),
);
const EMPTY_LORA_VALUE = "__empty_lora__";
const libraryPickerOpen = ref(false);
const currentImageVariableKey = ref<string>("");
const batchFileInput = ref<HTMLInputElement | null>(null);
const batchItems = ref<BatchImageItem[]>([]);
const activeBatchItemId = ref("");
const batchImageVariable = computed(
  () =>
    store.userInputVariables.value.find(
      (variable) => variable.type === "IMAGE" && variable.batch,
    ) ?? null,
);
const batchMode = computed(
  () => Boolean(batchImageVariable.value) && batchItems.value.length > 0,
);
const activeBatchItem = computed(
  () => batchItems.value.find((item) => item.id === activeBatchItemId.value) ?? null,
);

watch(
  () => props.open,
  (open) => {
    if (!open) {
      resetBatchMode();
      return;
    }
    void resetForm();
    if (hasLoraInputs.value) void loadLoras();
    void loadStringPresets();
  },
);

watch(hasLoraInputs, (hasInputs) => {
  if (props.open && hasInputs) void loadLoras();
});

function resetForm() {
  resetBatchMode();
  applyInputValues(null);
  void loadLatestInputs();
}

async function loadLatestInputs() {
  const appId = store.activeApp.value?.id;
  if (!appId) return;

  try {
    const latestTask = await appApi.getLatestAppTask(appId);
    if (!props.open || store.activeApp.value?.id !== appId) return;
    applyInputValues(latestTask?.inputs ?? null);
  } catch (error) {
    // 忽略错误，保留默认值。
  }
}

function applyInputValues(lastInputs: Record<string, unknown> | null) {
  const nextTextValues: Record<string, string> = {};
  const nextFileValues: Record<string, File | null> = {};
  const nextLibraryAssetValues: Record<string, LibraryAsset | null> = {};
  const nextPreviousImageValues: Record<string, unknown | null> = {};
  const nextLoraListValues: Record<string, LoraItem[]> = {};

  for (const variable of store.userInputVariables.value) {
    const lastValue = lastInputs?.[variable.key];
    if (variable.type === "IMAGE") {
      nextFileValues[variable.key] = null;
      nextLibraryAssetValues[variable.key] = null;
      nextPreviousImageValues[variable.key] = lastValue ?? null;
    } else if (variable.type === "LORA_LIST") {
      if (lastValue && Array.isArray(lastValue)) {
        nextLoraListValues[variable.key] = lastValue as LoraItem[];
      } else {
        nextLoraListValues[variable.key] = Array.isArray(variable.default)
          ? (variable.default as LoraItem[])
          : [];
      }
    } else {
      // 优先使用上次的值，否则使用默认值
      const valueToUse = lastValue !== undefined ? lastValue : variable.default;
      nextTextValues[variable.key] = stringifyInputValue(valueToUse);
    }
  }
  textValues.value = nextTextValues;
  fileValues.value = nextFileValues;
  libraryAssetValues.value = nextLibraryAssetValues;
  previousImageValues.value = nextPreviousImageValues;
  loraListValues.value = nextLoraListValues;
}

function captureFormState(): RunFormState {
  return cloneFormState({
    textValues: textValues.value,
    fileValues: fileValues.value,
    libraryAssetValues: libraryAssetValues.value,
    previousImageValues: previousImageValues.value,
    loraListValues: loraListValues.value,
  });
}

function applyFormState(state: RunFormState) {
  const nextState = cloneFormState(state);
  textValues.value = nextState.textValues;
  fileValues.value = nextState.fileValues;
  libraryAssetValues.value = nextState.libraryAssetValues;
  previousImageValues.value = nextState.previousImageValues;
  loraListValues.value = nextState.loraListValues;
}

function cloneFormState(state: RunFormState): RunFormState {
  return {
    textValues: { ...state.textValues },
    fileValues: { ...state.fileValues },
    libraryAssetValues: { ...state.libraryAssetValues },
    previousImageValues: { ...state.previousImageValues },
    loraListValues: Object.fromEntries(
      Object.entries(state.loraListValues).map(([key, value]) => [
        key,
        value.map((item) => ({ ...item })),
      ]),
    ),
  };
}

function syncActiveBatchDraft() {
  const item = activeBatchItem.value;
  if (!item) return;
  Object.assign(item, captureFormState());
}

function selectBatchItem(itemId: string) {
  if (activeBatchItemId.value === itemId) return;
  syncActiveBatchDraft();
  const item = batchItems.value.find((candidate) => candidate.id === itemId);
  if (!item) return;
  activeBatchItemId.value = itemId;
  applyFormState(item);
}

function openBatchFilePicker() {
  if (!batchImageVariable.value) {
    toast.error("请先为一个图片用户输入变量开启批量");
    return;
  }
  batchFileInput.value?.click();
}

function setBatchFiles(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files ?? []).filter((file) => file.type.startsWith("image/"));
  input.value = "";
  const batchVariable = batchImageVariable.value;
  if (!batchVariable) {
    toast.error("请先为一个图片用户输入变量开启批量");
    return;
  }
  if (files.length === 0) return;

  if (batchMode.value) syncActiveBatchDraft();
  const baseState = batchMode.value && activeBatchItem.value ? activeBatchItem.value : captureFormState();
  const shouldSelectFirstNewItem = batchItems.value.length === 0;
  const nextItems = files.map((file) => createBatchItem(file, batchVariable.key, baseState));
  batchItems.value = [...batchItems.value, ...nextItems];
  if (shouldSelectFirstNewItem) {
    activeBatchItemId.value = nextItems[0].id;
    applyFormState(nextItems[0]);
  }
  toast.success(`已加入 ${nextItems.length} 张图片`);
}

function createBatchItem(file: File, variableKey: string, baseState: RunFormState): BatchImageItem {
  const state = cloneFormState(baseState);
  state.fileValues[variableKey] = file;
  state.libraryAssetValues[variableKey] = null;
  state.previousImageValues[variableKey] = null;
  return {
    ...state,
    id: createBatchItemId(),
    file,
    previewUrl: URL.createObjectURL(file),
    status: "draft",
  };
}

function createBatchItemId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function resetBatchMode() {
  for (const item of batchItems.value) URL.revokeObjectURL(item.previewUrl);
  batchItems.value = [];
  activeBatchItemId.value = "";
}

function removeBatchItem(itemId: string) {
  const item = batchItems.value.find((candidate) => candidate.id === itemId);
  if (!item) return;
  URL.revokeObjectURL(item.previewUrl);
  batchItems.value = batchItems.value.filter((candidate) => candidate.id !== itemId);
  if (activeBatchItemId.value !== itemId) return;
  const nextItem = batchItems.value[0] ?? null;
  activeBatchItemId.value = nextItem?.id ?? "";
  if (nextItem) applyFormState(nextItem);
}

function batchItemStatusLabel(item: BatchImageItem) {
  if (item.status === "submitting") return "提交中";
  if (item.status === "submitted") return item.taskId ? `#${item.taskId}` : "已提交";
  if (item.status === "failed") return "失败";
  return "待提交";
}

function batchItemClass(item: BatchImageItem) {
  const active = activeBatchItemId.value === item.id;
  const statusClass = item.status === "failed"
    ? "border-red-300 bg-red-50"
    : item.status === "submitted"
      ? "border-emerald-300 bg-emerald-50"
      : "border-slate-200 bg-white";
  return `${active ? "ring-2 ring-slate-900" : ""} ${statusClass}`;
}

onBeforeUnmount(resetBatchMode);

async function submitRun() {
  if (submitting.value || store.running.value) return;

  if (batchMode.value) {
    await submitActiveBatchRun();
    return;
  }

  if (!props.taskGroupId) {
    toast.error("请选择任务分组");
    return;
  }

  const validationError = validateInputs(captureFormState());
  if (validationError) {
    toast.error(validationError);
    return;
  }

  try {
    submitting.value = true;
    const inputs = await buildInputs(captureFormState());
    const task = await store.runApp(inputs, props.taskGroupId);
    if (!task) {
      if (store.error.value) toast.error(store.error.value);
      return;
    }

    toast.success(`任务 #${task.id} 已提交`);
    emit("update:open", false);
    await navigateTo(`/tasks?groupId=${props.taskGroupId}&taskId=${task.id}`);
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "运行应用失败");
  } finally {
    submitting.value = false;
  }
}

async function submitActiveBatchRun() {
  if (!props.taskGroupId) {
    toast.error("请选择任务分组");
    return;
  }

  const item = activeBatchItem.value;
  if (!item) {
    toast.error("请选择要提交的图片");
    return;
  }

  syncActiveBatchDraft();
  const validationError = validateInputs(item);
  if (validationError) {
    toast.error(validationError);
    return;
  }

  try {
    submitting.value = true;
    item.status = "submitting";
    item.error = undefined;
    const task = await store.runApp(await buildInputs(item), props.taskGroupId);
    if (!task) {
      item.status = "failed";
      item.error = store.error.value || "运行应用失败";
      if (store.error.value) toast.error(store.error.value);
      return;
    }

    item.status = "submitted";
    item.taskId = task.id;
    toast.success(`图片任务 #${task.id} 已提交`);
    const nextItem = batchItems.value.find(
      (candidate) => candidate.id !== item.id && candidate.status !== "submitted",
    );
    if (nextItem) selectBatchItem(nextItem.id);
  } catch (error) {
    item.status = "failed";
    item.error = error instanceof Error ? error.message : "运行应用失败";
    toast.error(item.error);
  } finally {
    submitting.value = false;
  }
}

async function buildInputs(state: RunFormState) {
  const inputs: Record<string, unknown> = {};
  for (const variable of store.userInputVariables.value) {
    if (variable.type === "IMAGE") {
      const file = state.fileValues[variable.key];
      const libraryAsset = state.libraryAssetValues[variable.key];
      const previousImage = state.previousImageValues[variable.key];
      
      if (file) {
        inputs[variable.key] = await appApi.uploadComfyImage(file);
      } else if (libraryAsset) {
        inputs[variable.key] = libraryAsset.mediaAsset;
      } else if (previousImage) {
        inputs[variable.key] = previousImage;
      } else {
        inputs[variable.key] = variable.default;
      }
      continue;
    }

    if (variable.type === "LORA_LIST") {
      inputs[variable.key] = normalizeLoraListInput(
        variable,
        state.loraListValues[variable.key] || [],
      );
      continue;
    }

    inputs[variable.key] = parseInputValue(
      state.textValues[variable.key] ?? "",
      variable.type,
    );
  }
  return inputs;
}

async function loadLoras(refresh = false) {
  if (!hasLoraInputs.value || lorasLoading.value) return;
  if (!refresh && loraCacheExpiresAt.value > Date.now()) return;

  try {
    lorasLoading.value = true;
    const response = await appApi.listComfyLoras(refresh);
    loraOptions.value = response.items;
    loraCacheExpiresAt.value = Date.parse(response.expiresAt);
    if (refresh) toast.success("LoRA 列表已刷新");
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "加载 LoRA 列表失败");
  } finally {
    lorasLoading.value = false;
  }
}

function validateInputs(state: RunFormState) {
  for (const variable of store.userInputVariables.value) {
    if (!variable.required) continue;
    if (variable.type === "IMAGE") {
      if (
        !state.fileValues[variable.key] &&
        !state.libraryAssetValues[variable.key] &&
        !state.previousImageValues[variable.key] &&
        isEmptyValue(variable.default)
      )
        return `应用输入 $${variable.key} 不能为空`;
      continue;
    }

    if (variable.type === "LORA_LIST") {
      const loraList = state.loraListValues[variable.key];
      if (!loraList || loraList.length === 0) {
        if (isEmptyValue(variable.default))
          return `应用输入 $${variable.key} 不能为空`;
      }
      continue;
    }

    if (isEmptyValue(state.textValues[variable.key]))
      return `应用输入 $${variable.key} 不能为空`;
  }
  return "";
}

function setFile(variable: AppVariable, event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0] ?? null;
  fileValues.value[variable.key] = file;
  if (file) {
    libraryAssetValues.value[variable.key] = null;
    previousImageValues.value[variable.key] = null;
    if (batchMode.value && variable.key === batchImageVariable.value?.key && activeBatchItem.value) {
      URL.revokeObjectURL(activeBatchItem.value.previewUrl);
      activeBatchItem.value.file = file;
      activeBatchItem.value.previewUrl = URL.createObjectURL(file);
      activeBatchItem.value.status = "draft";
      activeBatchItem.value.taskId = undefined;
      activeBatchItem.value.error = undefined;
    }
  }
}

function openLibraryPicker(variableKey: string) {
  currentImageVariableKey.value = variableKey;
  libraryPickerOpen.value = true;
}

function handleLibraryAssetSelect(asset: LibraryAsset) {
  if (currentImageVariableKey.value) {
    libraryAssetValues.value[currentImageVariableKey.value] = asset;
    fileValues.value[currentImageVariableKey.value] = null;
    previousImageValues.value[currentImageVariableKey.value] = null;
  }
}

function clearImageInput(variableKey: string) {
  fileValues.value[variableKey] = null;
  libraryAssetValues.value[variableKey] = null;
  previousImageValues.value[variableKey] = null;
}

function loraOptionsFor(variable: AppVariable) {
  const current = textValues.value[variable.key];
  if (current && !loraOptions.value.includes(current))
    return [current, ...loraOptions.value];
  return loraOptions.value;
}

function supportsLoraClipStrength(variable: AppVariable) {
  const bindings = boundLoraParameters(variable);
  if (bindings.length === 0) return true;
  return bindings.some(({ classType }) => classType === "LoraLoader");
}

function boundLoraParameters(variable: AppVariable) {
  const bindings: Array<{ classType: string }> = [];
  for (const node of store.appGraph.value.nodes) {
    if (node.type !== "workflow_run" || !node.data.workflowId) continue;
    const workflow = store.workflowById.value.get(node.data.workflowId);
    if (!workflow) continue;

    for (const [parameterKey, binding] of Object.entries(node.data.inputBindings)) {
      if (binding.varKey !== variable.key) continue;
      const parameter = workflow.parameters.find(
        (item) => item.key === parameterKey && item.type === "LORA_LIST",
      );
      if (!parameter) continue;

      const rawNode = workflow.rawJson[parameter.nodeId];
      if (!rawNode || typeof rawNode !== "object" || Array.isArray(rawNode)) continue;
      const classType = (rawNode as { class_type?: unknown }).class_type;
      if (typeof classType === "string") bindings.push({ classType });
    }
  }
  return bindings;
}

function normalizeLoraListInput(variable: AppVariable, loraList: LoraItem[]) {
  if (supportsLoraClipStrength(variable)) return loraList;
  return loraList.map((lora) => {
    const strengthModel =
      lora.strength_model === 1 &&
      lora.strength_clip !== undefined &&
      lora.strength_clip !== 1
        ? lora.strength_clip
        : lora.strength_model;
    return { name: lora.name, strength_model: strengthModel };
  });
}

function inputSelectValue(variable: AppVariable) {
  return textValues.value[variable.key] || undefined;
}

function updateTextSelectValue(variable: AppVariable, value: unknown) {
  const nextValue = String(value ?? "");
  textValues.value[variable.key] =
    nextValue === EMPTY_LORA_VALUE ? "" : nextValue;
}

function stringifyInputValue(value: unknown) {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  return JSON.stringify(value);
}

function parseInputValue(value: string, type: string) {
  if (type === "INT") return Number.parseInt(value, 10);
  if (type === "FLOAT") return Number.parseFloat(value);
  if (type === "BOOL") return value === "true";
  return value;
}

function isEmptyValue(value: unknown) {
  return value === undefined || value === null || value === "";
}

async function loadStringPresets() {
  if (!store.activeApp.value?.id) return;
  loadingStringPresets.value = true;
  try {
    stringPresets.value = await appApi.listPresets(
      store.activeApp.value.id,
      "STRING",
    );
  } catch (error) {
    console.error("Failed to load string presets:", error);
  } finally {
    loadingStringPresets.value = false;
  }
}

async function saveStringPreset() {
  if (
    !store.activeApp.value?.id ||
    !newStringPresetName.value.trim() ||
    !currentStringPresetKey.value
  )
    return;
  savingStringPreset.value = true;
  try {
    const value = textValues.value[currentStringPresetKey.value] || "";
    await appApi.createPreset(
      store.activeApp.value.id,
      newStringPresetName.value.trim(),
      "STRING",
      value,
    );
    toast.success("预设已保存");
    newStringPresetName.value = "";
    showSaveStringPresetDialog.value = false;
    currentStringPresetKey.value = "";
    await loadStringPresets();
  } catch (error) {
    console.error("Failed to save preset:", error);
    toast.error("保存预设失败");
  } finally {
    savingStringPreset.value = false;
  }
}

async function deleteStringPreset(presetId: number) {
  if (!store.activeApp.value?.id) return;
  try {
    await appApi.deletePreset(store.activeApp.value.id, presetId);
    toast.success("预设已删除");
    await loadStringPresets();
  } catch (error) {
    console.error("Failed to delete preset:", error);
    toast.error("删除预设失败");
  }
}

function applyStringPreset(presetId: number, variableKey: string) {
  const preset = stringPresets.value.find((p) => p.id === presetId);
  if (!preset) return;
  textValues.value[variableKey] = String(preset.value || "");
  toast.success("预设已应用");
}

function openSaveStringPresetDialog(variableKey: string) {
  currentStringPresetKey.value = variableKey;
  showSaveStringPresetDialog.value = true;
}
</script>

<template>
  <Sheet :open="props.open" @update:open="emit('update:open', $event)">
    <SheetContent
      :class="batchMode ? 'w-full overflow-hidden sm:max-w-5xl' : 'w-full overflow-y-auto sm:max-w-md'"
    >
      <SheetHeader>
        <SheetTitle>运行应用</SheetTitle>
        <SheetDescription>
          填写本次任务的用户输入参数。任务将提交到「{{
            props.taskGroupName || "未选择分组"
          }}」。
        </SheetDescription>
      </SheetHeader>

      <form
        class="flex min-h-0 flex-1 gap-5 px-4"
        :class="batchMode ? 'flex-row' : 'flex-col'"
        @submit.prevent="submitRun"
      >
        <section
          v-if="batchMode && activeBatchItem"
          class="hidden min-h-0 w-[360px] shrink-0 flex-col gap-3 lg:flex"
        >
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0">
              <div class="text-xs font-medium text-slate-500">选中图片</div>
              <div class="mt-1 truncate text-sm font-medium text-slate-900">
                {{ activeBatchItem.file.name }}
              </div>
            </div>
            <div class="shrink-0 rounded-full border px-2 py-0.5 text-xs text-slate-500">
              {{ batchItemStatusLabel(activeBatchItem) }}
            </div>
          </div>
          <div class="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-xl border bg-slate-950/95 p-3">
            <img
              :src="activeBatchItem.previewUrl"
              :alt="activeBatchItem.file.name"
              class="max-h-full max-w-full object-contain"
            />
          </div>
        </section>

        <aside
          v-if="batchMode"
          class="flex min-h-0 w-24 shrink-0 flex-col gap-2 border-r pr-3"
        >
          <div class="text-xs font-medium text-slate-500">批量图片</div>
          <div class="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            <button
              v-for="(item, index) in batchItems"
              :key="item.id"
              type="button"
              class="group relative w-full overflow-hidden rounded-lg border p-1 text-left transition"
              :class="batchItemClass(item)"
              @click="selectBatchItem(item.id)"
            >
              <img :src="item.previewUrl" :alt="item.file.name" class="aspect-square w-full rounded object-cover" />
              <div class="mt-1 truncate text-[11px] text-slate-600">
                {{ index + 1 }} · {{ batchItemStatusLabel(item) }}
              </div>
              <Button
                as="span"
                variant="ghost"
                size="icon"
                class="absolute right-1 top-1 size-6 bg-white/80 opacity-0 group-hover:opacity-100"
                @click.stop="removeBatchItem(item.id)"
              >
                <Trash2 class="size-3.5" />
              </Button>
            </button>
          </div>
        </aside>

        <div class="flex min-h-0 min-w-0 flex-1 flex-col gap-5">
          <div class="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
          <div v-if="batchImageVariable" class="space-y-2 rounded-lg border bg-slate-50 p-3">
            <div class="flex items-center justify-between gap-3">
              <div>
                <div class="text-sm font-medium">批量运行</div>
                <div class="text-xs text-slate-500">
                  使用 ${{ batchImageVariable.key }} 多选图片，每张图可单独调整参数后提交。
                </div>
              </div>
              <Button type="button" variant="outline" @click="openBatchFilePicker">
                <Images class="size-4" />
                批量选择图片
              </Button>
            </div>
            <input
              ref="batchFileInput"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              class="hidden"
              @change="setBatchFiles"
            />
          </div>
        <div
          v-if="store.userInputVariables.value.length === 0"
          class="rounded-lg border border-dashed p-4 text-sm text-slate-500"
        >
          当前应用没有用户输入变量，可以直接提交运行。
        </div>

        <div
          v-for="variable in store.userInputVariables.value"
          :key="variable.key"
          class="space-y-2"
        >
          <Label
            :for="`run-input-${variable.key}`"
            class="flex items-center justify-between gap-3"
          >
            <span>{{ variable.name || variable.key }}</span>
            <span class="text-xs font-normal text-slate-400"
              >{{ variable.type }}{{ variable.required ? " · 必填" : "" }}</span
            >
          </Label>

          <Input
            v-if="variable.type === 'INT' || variable.type === 'FLOAT'"
            :id="`run-input-${variable.key}`"
            v-model="textValues[variable.key]"
            type="number"
            :step="variable.type === 'FLOAT' ? 'any' : '1'"
          />

          <Select
            v-else-if="variable.type === 'BOOL'"
            v-model="textValues[variable.key]"
          >
            <SelectTrigger :id="`run-input-${variable.key}`">
              <SelectValue placeholder="选择布尔值" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">是</SelectItem>
              <SelectItem value="false">否</SelectItem>
            </SelectContent>
          </Select>

          <div v-else-if="variable.type === 'LORA_NAME'" class="flex gap-2">
            <Select
              :model-value="inputSelectValue(variable)"
              :disabled="lorasLoading"
              @update:model-value="updateTextSelectValue(variable, $event)"
            >
              <SelectTrigger
                :id="`run-input-${variable.key}`"
                class="min-w-0 flex-1"
              >
                <SelectValue
                  :placeholder="
                    lorasLoading ? '加载 LoRA 列表...' : '选择 LoRA'
                  "
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem :value="EMPTY_LORA_VALUE">不选择 LoRA</SelectItem>
                <SelectItem
                  v-if="loraOptionsFor(variable).length === 0"
                  value="__no_loras__"
                  disabled
                >
                  暂无 LoRA
                </SelectItem>
                <SelectItem
                  v-for="name in loraOptionsFor(variable)"
                  :key="name"
                  :value="name"
                >
                  {{ name }}
                </SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              type="button"
              class="size-9 shrink-0"
              :disabled="lorasLoading"
              title="刷新 LoRA 列表"
              aria-label="刷新 LoRA 列表"
              @click="loadLoras(true)"
            >
              <RefreshCw
                class="size-4"
                :class="lorasLoading ? 'animate-spin' : ''"
              />
            </Button>
          </div>

          <div v-else-if="variable.type === 'LORA_LIST'" class="space-y-2">
            <AppLoraListEditor
              v-model="loraListValues[variable.key]"
              :lora-options="loraOptions"
              :app-id="store.activeApp.value?.id"
              :disabled="lorasLoading"
              :show-refresh="true"
              :refresh-loading="lorasLoading"
              :show-clip-strength="supportsLoraClipStrength(variable)"
              @refresh="loadLoras(true)"
            />
          </div>

          <div v-else-if="variable.type === 'IMAGE'" class="space-y-2">
            <div
              v-if="batchMode && variable.key === batchImageVariable?.key && activeBatchItem"
              class="flex items-center gap-3 rounded-lg border bg-slate-50 p-3"
            >
              <img
                :src="activeBatchItem.previewUrl"
                :alt="activeBatchItem.file.name"
                class="h-14 w-14 rounded object-cover"
              />
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium">{{ activeBatchItem.file.name }}</p>
                <p class="text-xs text-slate-500">当前批量图片</p>
              </div>
            </div>
            <div v-else class="flex gap-2">
              <Button
                type="button"
                variant="outline"
                class="flex-1"
                @click="openLibraryPicker(variable.key)"
              >
                <Images class="size-4" />
                从素材库选择
              </Button>
              <label class="flex-1">
                <Button
                  type="button"
                  variant="outline"
                  class="w-full"
                  as="span"
                >
                  上传新图片
                </Button>
                <input
                  :id="`run-input-${variable.key}`"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  class="hidden"
                  @change="setFile(variable, $event)"
                />
              </label>
            </div>

            <div
              v-if="
                !(batchMode && variable.key === batchImageVariable?.key) &&
                (fileValues[variable.key] ||
                  libraryAssetValues[variable.key] ||
                  previousImageValues[variable.key])
              "
              class="relative rounded-lg border bg-slate-50 p-3"
            >
              <div class="flex items-center gap-3">
                <div v-if="libraryAssetValues[variable.key]" class="flex items-center gap-3 flex-1 min-w-0">
                  <img
                    :src="libraryAssetValues[variable.key]!.mediaAsset.localUrl"
                    :alt="libraryAssetValues[variable.key]!.displayName"
                    class="h-12 w-12 rounded object-cover"
                  />
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm font-medium">
                      {{ libraryAssetValues[variable.key]!.displayName }}
                    </p>
                    <p class="text-xs text-slate-500">来自素材库</p>
                  </div>
                </div>
                <div v-else-if="fileValues[variable.key]" class="flex-1 min-w-0">
                  <p class="truncate text-sm font-medium">
                    {{ fileValues[variable.key]!.name }}
                  </p>
                  <p class="text-xs text-slate-500">
                    {{ (fileValues[variable.key]!.size / 1024).toFixed(1) }} KB
                  </p>
                </div>
                <div v-else class="flex-1 min-w-0">
                  <p class="truncate text-sm font-medium">沿用上次图片</p>
                  <p class="text-xs text-slate-500">来自最近一次运行参数</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  class="shrink-0"
                  @click="clearImageInput(variable.key)"
                >
                  <Trash2 class="size-4" />
                </Button>
              </div>
            </div>
          </div>

          <div v-else class="space-y-2">
            <div
              v-if="store.activeApp.value?.id"
              class="flex items-center justify-end gap-2"
            >
              <DropdownMenu v-if="stringPresets.length > 0">
                <DropdownMenuTrigger as-child>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    class="h-7 gap-1 px-2 text-xs"
                    :disabled="loadingStringPresets"
                  >
                    <Loader2
                      v-if="loadingStringPresets"
                      class="size-3.5 animate-spin"
                    />
                    <span v-else>预设</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    v-for="preset in stringPresets"
                    :key="preset.id"
                    class="flex items-center justify-between gap-2"
                  >
                    <span
                      class="flex-1 cursor-pointer"
                      @click="applyStringPreset(preset.id, variable.key)"
                    >
                      {{ preset.name }}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      class="size-5 text-red-500 hover:text-red-600"
                      @click.stop="deleteStringPreset(preset.id)"
                    >
                      <Trash2 class="size-3" />
                    </Button>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="outline"
                size="sm"
                type="button"
                class="h-7 gap-1 px-2 text-xs"
                :disabled="!textValues[variable.key]?.trim()"
                @click="openSaveStringPresetDialog(variable.key)"
              >
                <Save class="size-3.5" />
                保存预设
              </Button>
            </div>
            <Textarea
              :id="`run-input-${variable.key}`"
              v-model="textValues[variable.key]"
              class="min-h-24"
            />
          </div>
        </div>

          </div>

        <Dialog v-model:open="showSaveStringPresetDialog">
          <DialogContent class="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>保存文本预设</DialogTitle>
            </DialogHeader>
            <div class="space-y-4 py-4">
              <div class="space-y-2">
                <Label for="string-preset-name">预设名称</Label>
                <Input
                  id="string-preset-name"
                  v-model="newStringPresetName"
                  placeholder="输入预设名称"
                  @keydown.enter="saveStringPreset"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                @click="showSaveStringPresetDialog = false"
              >
                取消
              </Button>
              <Button
                type="button"
                :disabled="!newStringPresetName.trim() || savingStringPreset"
                @click="saveStringPreset"
              >
                <Loader2
                  v-if="savingStringPreset"
                  class="size-4 animate-spin mr-2"
                />
                保存
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <SheetFooter class="mt-auto">
          <Button
            type="button"
            variant="outline"
            :disabled="submitting || store.running.value"
            @click="emit('update:open', false)"
          >
            取消
          </Button>
          <Button
            type="submit"
            :disabled="submitting || store.running.value || !props.taskGroupId || (batchMode && !activeBatchItem)"
          >
            <Loader2 v-if="submitting || store.running.value" class="size-4 animate-spin" />
            {{ batchMode ? "提交当前图片" : "提交运行" }}
          </Button>
        </SheetFooter>
        </div>
      </form>
    </SheetContent>
  </Sheet>

  <AppLibraryPicker
    v-model:open="libraryPickerOpen"
    @select="handleLibraryAssetSelect"
  />
</template>
