<script setup lang="ts">
import { Trash2 } from "lucide-vue-next";
import {
  APP_VARIABLE_TYPE_COLORS,
  APP_VARIABLE_TYPE_LABELS,
  APP_VARIABLE_TYPES,
  type AppVariable,
} from "@/lib/app";

const props = defineProps<{
  variable: AppVariable;
}>();

const store = useAppDesignerStore();
const editingName = ref(false);
const draftName = ref(props.variable.name);
const nameInput = ref<HTMLInputElement | null>(null);
const canBatch = computed(
  () => props.variable.source === "user_input" && props.variable.type === "IMAGE",
);

watch(
  () => props.variable.name,
  (name) => {
    if (!editingName.value) draftName.value = name;
  },
);

async function startNameEdit() {
  draftName.value = props.variable.name;
  editingName.value = true;
  await nextTick();
  nameInput.value?.focus();
  nameInput.value?.select();
}

function saveName() {
  const name = draftName.value.trim();
  editingName.value = false;
  if (name && name !== props.variable.name) {
    store.updateAppVariable(props.variable.key, { name });
  } else {
    draftName.value = props.variable.name;
  }
}

function cancelNameEdit() {
  draftName.value = props.variable.name;
  editingName.value = false;
}

function updateType(value: string) {
  store.updateAppVariable(props.variable.key, {
    type: value as (typeof APP_VARIABLE_TYPES)[number],
    batch: value === "IMAGE" ? props.variable.batch : undefined,
  });
}

function updateBatch(value: boolean) {
  if (!canBatch.value) return;
  if (value) {
    for (const variable of store.userInputVariables.value) {
      if (variable.key !== props.variable.key && variable.batch) {
        store.updateAppVariable(variable.key, { batch: undefined });
      }
    }
  }
  store.updateAppVariable(props.variable.key, { batch: value || undefined });
}
</script>

<template>
  <div class="contents">
    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <Badge
          as="button"
          type="button"
          class="cursor-pointer border-0"
          :class="APP_VARIABLE_TYPE_COLORS[props.variable.type]"
        >
          {{ APP_VARIABLE_TYPE_LABELS[props.variable.type] }}
        </Badge>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" class="w-36">
        <DropdownMenuItem v-for="type in APP_VARIABLE_TYPES" :key="type" @select="updateType(type)">
          {{ APP_VARIABLE_TYPE_LABELS[type] }}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    <input
      v-if="editingName"
      ref="nameInput"
      v-model="draftName"
      class="min-w-0 rounded border px-1.5 py-0.5 text-sm outline-none focus:border-slate-500"
      @blur="saveName"
      @keydown.enter.prevent="saveName"
      @keydown.esc.prevent="cancelNameEdit"
    />
    <button v-else type="button" class="min-w-0 truncate text-left text-sm" @click="startNameEdit">
      {{ props.variable.name }}
    </button>

    <div class="flex items-center justify-end">
      <label
        v-if="canBatch"
        class="flex items-center gap-1.5 text-xs text-slate-500"
        title="在运行面板中允许多图批量提交"
      >
        <Switch
          :model-value="Boolean(props.variable.batch)"
          @update:model-value="updateBatch(Boolean($event))"
        />
        批量
      </label>
    </div>

    <div>
      <button type="button" class="text-red-500" @click="store.removeAppVariable(props.variable.key)">
        <Trash2 class="size-4" />
      </button>
    </div>
  </div>
</template>
