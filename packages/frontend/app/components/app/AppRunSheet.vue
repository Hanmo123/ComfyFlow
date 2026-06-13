<script setup lang="ts">
import { RefreshCw } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import type { AppVariable, LoraItem } from '@/lib/app'

const props = defineProps<{
  open: boolean
  taskGroupId: number | null
  taskGroupName?: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const store = useAppDesignerStore()
const appApi = useAppApi()

const textValues = ref<Record<string, string>>()
const fileValues = ref<Record<string, File | null>>({})
const loraListValues = ref<Record<string, LoraItem[]>>({})
const loraOptions = ref<string[]>([])
const loraCacheExpiresAt = ref(0)
const lorasLoading = ref(false)
const submitting = ref(false)
const hasLoraInputs = computed(() => 
  store.userInputVariables.value.some((variable) => 
    variable.type === 'LORA_NAME' || variable.type === 'LORA_LIST'
  )
)
const EMPTY_LORA_VALUE = '__empty_lora__'

watch(
  () => props.open,
  (open) => {
    if (!open) return
    resetForm()
    if (hasLoraInputs.value) void loadLoras()
  },
)

watch(hasLoraInputs, (hasInputs) => {
  if (props.open && hasInputs) void loadLoras()
})

function resetForm() {
  const nextTextValues: Record<string, string> = {}
  const nextFileValues: Record<string, File | null> = {}
  const nextLoraListValues: Record<string, LoraItem[]> = {}
  for (const variable of store.userInputVariables.value) {
    if (variable.type === 'IMAGE') {
      nextFileValues[variable.key] = null
    } else if (variable.type === 'LORA_LIST') {
      nextLoraListValues[variable.key] = Array.isArray(variable.default) 
        ? (variable.default as LoraItem[]) 
        : []
    } else {
      nextTextValues[variable.key] = stringifyInputValue(variable.default)
    }
  }
  textValues.value = nextTextValues
  fileValues.value = nextFileValues
  loraListValues.value = nextLoraListValues
}

async function submitRun() {
  if (submitting.value || store.running.value) return

  if (!props.taskGroupId) {
    toast.error('请选择任务分组')
    return
  }

  const validationError = validateInputs()
  if (validationError) {
    toast.error(validationError)
    return
  }

  try {
    submitting.value = true
    const inputs = await buildInputs()
    const task = await store.runApp(inputs, props.taskGroupId)
    if (!task) {
      if (store.error.value) toast.error(store.error.value)
      return
    }

    toast.success(`任务 #${task.id} 已提交`)
    emit('update:open', false)
    await navigateTo(`/tasks?groupId=${props.taskGroupId}&taskId=${task.id}`)
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '运行应用失败')
  } finally {
    submitting.value = false
  }
}

async function buildInputs() {
  const inputs: Record<string, unknown> = {}
  for (const variable of store.userInputVariables.value) {
    if (variable.type === 'IMAGE') {
      const file = fileValues.value[variable.key]
      inputs[variable.key] = file ? await appApi.uploadComfyImage(file) : variable.default
      continue
    }

    if (variable.type === 'LORA_LIST') {
      inputs[variable.key] = loraListValues.value[variable.key] || []
      continue
    }

    inputs[variable.key] = parseInputValue(textValues.value[variable.key] ?? '', variable.type)
  }
  return inputs
}

async function loadLoras(refresh = false) {
  if (!hasLoraInputs.value || lorasLoading.value) return
  if (!refresh && loraCacheExpiresAt.value > Date.now()) return

  try {
    lorasLoading.value = true
    const response = await appApi.listComfyLoras(refresh)
    loraOptions.value = response.items
    loraCacheExpiresAt.value = Date.parse(response.expiresAt)
    if (refresh) toast.success('LoRA 列表已刷新')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '加载 LoRA 列表失败')
  } finally {
    lorasLoading.value = false
  }
}

function validateInputs() {
  for (const variable of store.userInputVariables.value) {
    if (!variable.required) continue
    if (variable.type === 'IMAGE') {
      if (!fileValues.value[variable.key] && isEmptyValue(variable.default)) return `应用输入 $${variable.key} 不能为空`
      continue
    }

    if (variable.type === 'LORA_LIST') {
      const loraList = loraListValues.value[variable.key]
      if (!loraList || loraList.length === 0) {
        if (isEmptyValue(variable.default)) return `应用输入 $${variable.key} 不能为空`
      }
      continue
    }

    if (isEmptyValue(textValues.value[variable.key])) return `应用输入 $${variable.key} 不能为空`
  }
  return ''
}

function setFile(variable: AppVariable, event: Event) {
  const input = event.target as HTMLInputElement
  fileValues.value[variable.key] = input.files?.[0] ?? null
}

function loraOptionsFor(variable: AppVariable) {
  const current = textValues.value[variable.key]
  if (current && !loraOptions.value.includes(current)) return [current, ...loraOptions.value]
  return loraOptions.value
}

function inputSelectValue(variable: AppVariable) {
  return textValues.value[variable.key] || undefined
}

function updateTextSelectValue(variable: AppVariable, value: unknown) {
  const nextValue = String(value ?? '')
  textValues.value[variable.key] = nextValue === EMPTY_LORA_VALUE ? '' : nextValue
}

function stringifyInputValue(value: unknown) {
  if (value === undefined || value === null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value)
}

function parseInputValue(value: string, type: string) {
  if (type === 'INT') return Number.parseInt(value, 10)
  if (type === 'FLOAT') return Number.parseFloat(value)
  if (type === 'BOOL') return value === 'true'
  return value
}

function isEmptyValue(value: unknown) {
  return value === undefined || value === null || value === ''
}
</script>

<template>
  <Sheet :open="props.open" @update:open="emit('update:open', $event)">
    <SheetContent class="w-full overflow-y-auto sm:max-w-md">
      <SheetHeader>
        <SheetTitle>运行应用</SheetTitle>
        <SheetDescription>
          填写本次任务的用户输入参数。任务将提交到「{{ props.taskGroupName || '未选择分组' }}」。
        </SheetDescription>
      </SheetHeader>

      <form class="flex flex-1 flex-col gap-5" @submit.prevent="submitRun">
        <div v-if="store.userInputVariables.value.length === 0" class="rounded-lg border border-dashed p-4 text-sm text-slate-500">
          当前应用没有用户输入变量，可以直接提交运行。
        </div>

        <div v-for="variable in store.userInputVariables.value" :key="variable.key" class="space-y-2">
          <Label :for="`run-input-${variable.key}`" class="flex items-center justify-between gap-3">
            <span>{{ variable.name || variable.key }}</span>
            <span class="text-xs font-normal text-slate-400">{{ variable.type }}{{ variable.required ? ' · 必填' : '' }}</span>
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
              <SelectTrigger :id="`run-input-${variable.key}`" class="min-w-0 flex-1">
                <SelectValue :placeholder="lorasLoading ? '加载 LoRA 列表...' : '选择 LoRA'" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem :value="EMPTY_LORA_VALUE">不选择 LoRA</SelectItem>
                <SelectItem v-if="loraOptionsFor(variable).length === 0" value="__no_loras__" disabled>
                  暂无 LoRA
                </SelectItem>
                <SelectItem v-for="name in loraOptionsFor(variable)" :key="name" :value="name">
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
              <RefreshCw class="size-4" :class="lorasLoading ? 'animate-spin' : ''" />
            </Button>
          </div>

          <div v-else-if="variable.type === 'LORA_LIST'" class="space-y-2">
            <div class="flex items-center justify-end">
              <Button
                variant="outline"
                size="icon"
                type="button"
                class="size-7 shrink-0"
                :disabled="lorasLoading"
                title="刷新 LoRA 列表"
                aria-label="刷新 LoRA 列表"
                @click="loadLoras(true)"
              >
                <RefreshCw class="size-3.5" :class="lorasLoading ? 'animate-spin' : ''" />
              </Button>
            </div>
            <AppLoraListEditor
              v-model="loraListValues[variable.key]"
              :lora-options="loraOptions"
              :disabled="lorasLoading"
            />
          </div>

          <Input
            v-else-if="variable.type === 'IMAGE'"
            :id="`run-input-${variable.key}`"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            @change="setFile(variable, $event)"
          />

          <Textarea
            v-else
            :id="`run-input-${variable.key}`"
            v-model="textValues[variable.key]"
            class="min-h-24"
          />
        </div>

        <SheetFooter class="mt-auto">
          <Button type="button" variant="outline" :disabled="submitting || store.running.value" @click="emit('update:open', false)">
            取消
          </Button>
          <Button type="submit" :disabled="submitting || store.running.value || !props.taskGroupId">
            提交运行
          </Button>
        </SheetFooter>
      </form>
    </SheetContent>
  </Sheet>
</template>
