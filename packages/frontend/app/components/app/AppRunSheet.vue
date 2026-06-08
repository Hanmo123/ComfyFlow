<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { AppVariable } from '@/lib/app'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const store = useAppDesignerStore()
const appApi = useAppApi()

const textValues = ref<Record<string, string>>({})
const fileValues = ref<Record<string, File | null>>({})
const submitting = ref(false)

watch(
  () => props.open,
  (open) => {
    if (open) resetForm()
  },
)

function resetForm() {
  const nextTextValues: Record<string, string> = {}
  const nextFileValues: Record<string, File | null> = {}
  for (const variable of store.userInputVariables.value) {
    nextTextValues[variable.key] = stringifyInputValue(variable.default)
    if (variable.type === 'IMAGE') nextFileValues[variable.key] = null
  }
  textValues.value = nextTextValues
  fileValues.value = nextFileValues
}

async function submitRun() {
  if (submitting.value || store.running.value) return

  const validationError = validateInputs()
  if (validationError) {
    toast.error(validationError)
    return
  }

  try {
    submitting.value = true
    const inputs = await buildInputs()
    const task = await store.runApp(inputs)
    if (!task) {
      if (store.error.value) toast.error(store.error.value)
      return
    }

    toast.success(`任务 #${task.id} 已提交`)
    emit('update:open', false)
    await navigateTo(`/tasks?taskId=${task.id}`)
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

    inputs[variable.key] = parseInputValue(textValues.value[variable.key] ?? '', variable.type)
  }
  return inputs
}

function validateInputs() {
  for (const variable of store.userInputVariables.value) {
    if (!variable.required) continue
    if (variable.type === 'IMAGE') {
      if (!fileValues.value[variable.key] && isEmptyValue(variable.default)) return `应用输入 $${variable.key} 不能为空`
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
        <SheetDescription>填写本次任务的用户输入参数。</SheetDescription>
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

          <select
            v-else-if="variable.type === 'BOOL'"
            :id="`run-input-${variable.key}`"
            v-model="textValues[variable.key]"
            class="h-9 w-full rounded-md border bg-white px-3 text-sm outline-none focus:border-slate-500"
          >
            <option value="true">是</option>
            <option value="false">否</option>
          </select>

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
          <Button type="submit" :disabled="submitting || store.running.value">
            提交运行
          </Button>
        </SheetFooter>
      </form>
    </SheetContent>
  </Sheet>
</template>
