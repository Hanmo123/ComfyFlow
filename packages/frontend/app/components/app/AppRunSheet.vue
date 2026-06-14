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

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    void resetForm();
    if (hasLoraInputs.value) void loadLoras();
    void loadStringPresets();
  },
);

watch(hasLoraInputs, (hasInputs) => {
  if (props.open && hasInputs) void loadLoras();
});

function resetForm() {
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

async function submitRun() {
  if (submitting.value || store.running.value) return;

  if (!props.taskGroupId) {
    toast.error("请选择任务分组");
    return;
  }

  const validationError = validateInputs();
  if (validationError) {
    toast.error(validationError);
    return;
  }

  try {
    submitting.value = true;
    const inputs = await buildInputs();
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

async function buildInputs() {
  const inputs: Record<string, unknown> = {};
  for (const variable of store.userInputVariables.value) {
    if (variable.type === "IMAGE") {
      const file = fileValues.value[variable.key];
      const libraryAsset = libraryAssetValues.value[variable.key];
      const previousImage = previousImageValues.value[variable.key];
      
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
      inputs[variable.key] = loraListValues.value[variable.key] || [];
      continue;
    }

    inputs[variable.key] = parseInputValue(
      textValues.value[variable.key] ?? "",
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

function validateInputs() {
  for (const variable of store.userInputVariables.value) {
    if (!variable.required) continue;
    if (variable.type === "IMAGE") {
      if (
        !fileValues.value[variable.key] &&
        !libraryAssetValues.value[variable.key] &&
        !previousImageValues.value[variable.key] &&
        isEmptyValue(variable.default)
      )
        return `应用输入 $${variable.key} 不能为空`;
      continue;
    }

    if (variable.type === "LORA_LIST") {
      const loraList = loraListValues.value[variable.key];
      if (!loraList || loraList.length === 0) {
        if (isEmptyValue(variable.default))
          return `应用输入 $${variable.key} 不能为空`;
      }
      continue;
    }

    if (isEmptyValue(textValues.value[variable.key]))
      return `应用输入 $${variable.key} 不能为空`;
  }
  return "";
}

function setFile(variable: AppVariable, event: Event) {
  const input = event.target as HTMLInputElement;
  fileValues.value[variable.key] = input.files?.[0] ?? null;
  if (input.files?.[0]) {
    libraryAssetValues.value[variable.key] = null;
    previousImageValues.value[variable.key] = null;
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
    <SheetContent class="w-full overflow-y-auto sm:max-w-md">
      <SheetHeader>
        <SheetTitle>运行应用</SheetTitle>
        <SheetDescription>
          填写本次任务的用户输入参数。任务将提交到「{{
            props.taskGroupName || "未选择分组"
          }}」。
        </SheetDescription>
      </SheetHeader>

      <form class="flex flex-1 flex-col gap-5 px-4" @submit.prevent="submitRun">
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
              @refresh="loadLoras(true)"
            />
          </div>

          <div v-else-if="variable.type === 'IMAGE'" class="space-y-2">
            <div class="flex gap-2">
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
                fileValues[variable.key] ||
                libraryAssetValues[variable.key] ||
                previousImageValues[variable.key]
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
            :disabled="submitting || store.running.value || !props.taskGroupId"
          >
            提交运行
          </Button>
        </SheetFooter>
      </form>
    </SheetContent>
  </Sheet>

  <AppLibraryPicker
    v-model:open="libraryPickerOpen"
    @select="handleLibraryAssetSelect"
  />
</template>
