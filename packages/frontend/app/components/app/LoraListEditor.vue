<script setup lang="ts">
import {
  Plus,
  Trash2,
  GripVertical,
  Save,
  Loader2,
  RefreshCw,
} from "lucide-vue-next";
import type { LoraItem, AppInputPreset } from "@/lib/app";
import { toast } from "vue-sonner";

const props = defineProps<{
  modelValue: LoraItem[];
  loraOptions: string[];
  appId?: number;
  disabled?: boolean;
  showRefresh?: boolean;
  refreshLoading?: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: LoraItem[]];
  refresh: [];
}>();

const EMPTY_LORA_VALUE = "__empty_lora__";
const PRESET_PLACEHOLDER = "__preset_placeholder__";

const api = useAppApi();
const presets = ref<AppInputPreset[]>([]);
const loadingPresets = ref(false);
const savingPreset = ref(false);
const newPresetName = ref("");
const showSaveDialog = ref(false);

async function loadPresets() {
  if (!props.appId) return;
  loadingPresets.value = true;
  try {
    presets.value = await api.listPresets(props.appId, "LORA_LIST");
  } catch (error) {
    console.error("Failed to load presets:", error);
    toast.error("加载预设失败");
  } finally {
    loadingPresets.value = false;
  }
}

async function savePreset() {
  if (!props.appId || !newPresetName.value.trim()) return;
  savingPreset.value = true;
  try {
    await api.createPreset(
      props.appId,
      newPresetName.value.trim(),
      "LORA_LIST",
      props.modelValue,
    );
    toast.success("预设已保存");
    newPresetName.value = "";
    showSaveDialog.value = false;
    await loadPresets();
  } catch (error) {
    console.error("Failed to save preset:", error);
    toast.error("保存预设失败");
  } finally {
    savingPreset.value = false;
  }
}

async function deletePreset(presetId: number) {
  if (!props.appId) return;
  try {
    await api.deletePreset(props.appId, presetId);
    toast.success("预设已删除");
    await loadPresets();
  } catch (error) {
    console.error("Failed to delete preset:", error);
    toast.error("删除预设失败");
  }
}

function applyPreset(presetId: number) {
  const preset = presets.value.find((p) => p.id === presetId);
  if (!preset) return;
  const value = preset.value as LoraItem[];
  emit("update:modelValue", value);
  toast.success("预设已应用");
}

watchEffect(() => {
  if (props.appId) {
    loadPresets();
  }
});

watchEffect(() => {
  if (props.appId) {
    loadPresets();
  }
});

function addLora() {
  const newList = [
    ...props.modelValue,
    { name: "", strength_model: 1.0, strength_clip: 1.0 },
  ];
  emit("update:modelValue", newList);
}

function removeLora(index: number) {
  const newList = props.modelValue.filter((_, i) => i !== index);
  emit("update:modelValue", newList);
}

function updateLoraName(index: number, value: string) {
  const newList = [...props.modelValue];
  newList[index] = {
    ...newList[index],
    name: value === EMPTY_LORA_VALUE ? "" : value,
  };
  emit("update:modelValue", newList);
}

function updateLoraStrengthModel(index: number, value: string) {
  const newList = [...props.modelValue];
  newList[index] = {
    ...newList[index],
    strength_model: Number.parseFloat(value) || 1.0,
  };
  emit("update:modelValue", newList);
}

function updateLoraStrengthClip(index: number, value: string) {
  const newList = [...props.modelValue];
  newList[index] = {
    ...newList[index],
    strength_clip: Number.parseFloat(value) || 1.0,
  };
  emit("update:modelValue", newList);
}

function loraOptionsFor(currentName: string) {
  if (currentName && !props.loraOptions.includes(currentName)) {
    return [currentName, ...props.loraOptions];
  }
  return props.loraOptions;
}
</script>

<template>
  <div class="space-y-2">
    <div class="text-right space-x-1.5">
      <DropdownMenu v-if="props.appId && presets.length > 0">
        <DropdownMenuTrigger as-child>
          <Button
            variant="outline"
            size="sm"
            type="button"
            class="h-7 gap-1 px-2 text-xs"
            :disabled="props.disabled || loadingPresets"
          >
            <Loader2 v-if="loadingPresets" class="size-3.5 animate-spin" />
            <span v-else>预设</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            v-for="preset in presets"
            :key="preset.id"
            class="flex items-center justify-between gap-2"
          >
            <span class="flex-1 cursor-pointer" @click="applyPreset(preset.id)">
              {{ preset.name }}
            </span>
            <Button
              variant="ghost"
              size="icon"
              type="button"
              class="size-5 text-red-500 hover:text-red-600"
              @click.stop="deletePreset(preset.id)"
            >
              <Trash2 class="size-3" />
            </Button>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog v-if="props.appId" v-model:open="showSaveDialog">
        <DialogTrigger as-child>
          <Button
            variant="outline"
            size="sm"
            type="button"
            class="h-7 gap-1 px-2 text-xs"
            :disabled="props.disabled || props.modelValue.length === 0"
          >
            <Save class="size-3.5" />
            保存预设
          </Button>
        </DialogTrigger>
        <DialogContent class="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>保存 LoRA 列表预设</DialogTitle>
          </DialogHeader>
          <div class="space-y-4 py-4">
            <div class="space-y-2">
              <Label for="preset-name">预设名称</Label>
              <Input
                id="preset-name"
                v-model="newPresetName"
                placeholder="输入预设名称"
                @keydown.enter="savePreset"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              @click="showSaveDialog = false"
            >
              取消
            </Button>
            <Button
              type="button"
              :disabled="!newPresetName.trim() || savingPreset"
              @click="savePreset"
            >
              <Loader2 v-if="savingPreset" class="size-4 animate-spin mr-2" />
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Button
        variant="outline"
        size="sm"
        type="button"
        class="h-7 gap-1 px-2 text-xs"
        :disabled="props.disabled"
        @click="addLora"
      >
        <Plus class="size-3.5" />
        添加 LoRA
      </Button>

      <Button
        v-if="props.showRefresh"
        variant="outline"
        size="icon"
        type="button"
        class="size-7 shrink-0"
        :disabled="props.refreshLoading"
        title="刷新 LoRA 列表"
        aria-label="刷新 LoRA 列表"
        @click="emit('refresh')"
      >
        <RefreshCw
          class="size-3.5"
          :class="props.refreshLoading ? 'animate-spin' : ''"
        />
      </Button>
    </div>

    <div
      v-if="props.modelValue.length === 0"
      class="rounded border border-dashed p-3 text-center text-sm text-slate-400"
    >
      暂无 LoRA，点击上方按钮添加
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="(lora, index) in props.modelValue"
        :key="index"
        class="rounded border p-3 space-y-2"
      >
        <div class="flex items-center gap-2">
          <GripVertical class="size-4 text-slate-400 shrink-0" />
          <div class="text-sm font-medium text-slate-600">
            LoRA {{ index + 1 }}
          </div>
          <Button
            variant="ghost"
            size="icon"
            type="button"
            class="ml-auto size-7 text-red-500 hover:text-red-600"
            :disabled="props.disabled"
            @click="removeLora(index)"
          >
            <Trash2 class="size-4" />
          </Button>
        </div>

        <div class="space-y-2">
          <Label :for="`lora-${index}-name`" class="text-xs">名称</Label>
          <Select
            :model-value="lora.name || EMPTY_LORA_VALUE"
            :disabled="props.disabled"
            @update:model-value="updateLoraName(index, $event as string)"
          >
            <SelectTrigger :id="`lora-${index}-name`" class="h-8 text-sm">
              <SelectValue placeholder="选择 LoRA" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem :value="EMPTY_LORA_VALUE">不选择 LoRA</SelectItem>
              <SelectItem
                v-if="loraOptionsFor(lora.name).length === 0"
                value="__no_loras__"
                disabled
              >
                暂无 LoRA
              </SelectItem>
              <SelectItem
                v-for="name in loraOptionsFor(lora.name)"
                :key="name"
                :value="name"
              >
                {{ name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div class="space-y-1.5">
            <Label :for="`lora-${index}-strength-model`" class="text-xs"
              >Model 强度</Label
            >
            <Input
              :id="`lora-${index}-strength-model`"
              type="number"
              step="0.01"
              min="0"
              max="2"
              :value="lora.strength_model"
              :disabled="props.disabled"
              class="h-8 text-sm"
              @input="
                updateLoraStrengthModel(
                  index,
                  ($event.target as HTMLInputElement).value,
                )
              "
            />
          </div>
          <div class="space-y-1.5">
            <Label :for="`lora-${index}-strength-clip`" class="text-xs"
              >CLIP 强度</Label
            >
            <Input
              :id="`lora-${index}-strength-clip`"
              type="number"
              step="0.01"
              min="0"
              max="2"
              :value="lora.strength_clip ?? 1.0"
              :disabled="props.disabled"
              class="h-8 text-sm"
              @input="
                updateLoraStrengthClip(
                  index,
                  ($event.target as HTMLInputElement).value,
                )
              "
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
