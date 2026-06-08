<script setup lang="ts">
import { Plus, X } from 'lucide-vue-next'
import { APP_VARIABLE_TYPE_COLORS, APP_VARIABLE_TYPE_LABELS, type AppVariable, type ManualGateNode } from '@/lib/app'

const props = defineProps<{
  node: ManualGateNode
}>()

const store = useAppDesignerStore()

const pendingDisplayVarKey = ref('')
const selectedDisplayVariables = computed(() =>
  props.node.data.displayVars
    .map((varKey) => store.variableByKey.value.get(varKey))
    .filter((variable): variable is AppVariable => Boolean(variable)),
)
const availableDisplayVariables = computed(() =>
  store.appVariables.value.filter((variable) => !props.node.data.displayVars.includes(variable.key)),
)

function addDisplayVar() {
  if (!pendingDisplayVarKey.value || props.node.data.displayVars.includes(pendingDisplayVarKey.value)) return
  store.toggleDisplayVar(props.node, pendingDisplayVarKey.value)
  pendingDisplayVarKey.value = ''
}
</script>

<template>
  <div class="space-y-2">
    <input
      class="w-full rounded border px-2 py-2 text-sm outline-none focus:border-slate-500"
      :value="props.node.data.title"
      placeholder="卡点标题"
      @input="store.updateAppNodeData(props.node.id, { ...props.node.data, title: ($event.target as HTMLInputElement).value })"
    />
    <textarea
      class="min-h-20 w-full rounded border px-2 py-2 text-sm outline-none focus:border-slate-500"
      :value="props.node.data.description"
      placeholder="给处理人看的说明"
      @input="store.updateAppNodeData(props.node.id, { ...props.node.data, description: ($event.target as HTMLTextAreaElement).value })"
    />
    <section class="space-y-2">
      <div class="text-slate-500">展示变量</div>
      <div v-if="store.appVariables.value.length === 0" class="rounded border border-dashed px-2 py-2 text-slate-400">
        暂无应用变量
      </div>
      <template v-else>
        <div class="flex gap-2">
          <Select
            :model-value="pendingDisplayVarKey || undefined"
            :disabled="availableDisplayVariables.length === 0"
            @update:model-value="pendingDisplayVarKey = String($event ?? '')"
          >
            <SelectTrigger class="min-w-0 flex-1">
              <SelectValue :placeholder="availableDisplayVariables.length > 0 ? '选择要展示的变量' : '已全部添加'" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="variable in availableDisplayVariables" :key="variable.key" :value="variable.key">
                {{ variable.name }} · {{ APP_VARIABLE_TYPE_LABELS[variable.type] }}
              </SelectItem>
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" class="shrink-0" :disabled="!pendingDisplayVarKey" @click="addDisplayVar">
            <Plus class="size-4" />
            添加
          </Button>
        </div>

        <div v-if="selectedDisplayVariables.length === 0" class="rounded border border-dashed px-2 py-2 text-slate-400">
          尚未添加展示变量
        </div>
        <div v-else class="space-y-1.5">
          <div v-for="variable in selectedDisplayVariables" :key="variable.key" class="flex items-center gap-2 rounded border px-2 py-1.5">
            <Badge class="border-0" :class="APP_VARIABLE_TYPE_COLORS[variable.type]">
              {{ APP_VARIABLE_TYPE_LABELS[variable.type] }}
            </Badge>
            <span class="min-w-0 flex-1 truncate text-sm">{{ variable.name }}</span>
            <Button
              variant="ghost"
              size="icon"
              type="button"
              class="size-7 shrink-0"
              aria-label="移除展示变量"
              @click="store.toggleDisplayVar(props.node, variable.key)"
            >
              <X class="size-3.5" />
            </Button>
          </div>
        </div>
      </template>
    </section>
  </div>
</template>
