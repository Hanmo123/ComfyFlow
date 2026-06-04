<script setup lang="ts">
import type {
  AppGraph,
  AppGraphNode,
  AppNodeType,
  AppRecord,
  AppVariable,
} from "@/lib/app";
import { APP_VARIABLE_TYPES, createDefaultGraph } from "@/lib/app";
import type {
  NodeDefinition,
  ParsedWorkflowGraph,
  WorkflowDetailResponse,
  WorkflowParameter,
  WorkflowResult,
  WorkflowRecord,
} from "@/lib/workflow";

const section = ref<"workflow" | "app" | "task">("workflow");
const workflows = ref<WorkflowRecord[]>([]);
const activeWorkflow = ref<WorkflowRecord | null>(null);
const apps = ref<AppRecord[]>([]);
const activeApp = ref<AppRecord | null>(null);
const appVariables = ref<AppVariable[]>([]);
const appGraph = ref<AppGraph>(createDefaultGraph());
const selectedAppNodeId = ref<string | null>(null);
const graph = ref<ParsedWorkflowGraph | undefined>();
const nodeDefinitions = ref<Record<string, NodeDefinition>>({});
const parameters = ref<WorkflowParameter[]>([]);
const results = ref<WorkflowResult[]>([]);
const loading = ref(false);
const saving = ref(false);
const error = ref("");
const saveDialogOpen = ref(false);

const api = useWorkflowApi();
const appApi = useAppApi();

const panelTitle = computed(() => {
  if (section.value === "workflow")
    return (
      activeWorkflow.value?.name ||
      (activeWorkflow.value
        ? `未命名工作流 #${activeWorkflow.value.id}`
        : "工作流")
    );
  if (section.value === "app") return "应用编排";
  return "任务";
});

const duplicateVariableNames = computed(() => {
  const counts = new Map<string, number>();
  for (const item of [...parameters.value, ...results.value]) {
    const name = normalizeVariableName(item.name);
    if (!name) continue;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([name]) => name);
});

onMounted(async () => {
  await refreshWorkflows();
  await refreshApps();
});

async function refreshWorkflows() {
  workflows.value = await api.listWorkflows();
}

async function refreshApps() {
  apps.value = await appApi.listApps();
}

const selectedAppNode = computed(
  () => appGraph.value.nodes.find((node) => node.id === selectedAppNodeId.value) ?? null,
);

function applyDetail(detail: WorkflowDetailResponse) {
  activeWorkflow.value = detail.workflow;
  graph.value = detail.graph;
  nodeDefinitions.value = detail.nodeDefinitions;
  parameters.value = (detail.workflow.parameters ?? []).map((item) => ({
    ...item,
    name: normalizeVariableName(item.name || legacyVariableLabel(item)),
  }));
  results.value = (detail.workflow.results ?? []).map((item) => ({
    ...item,
    name: normalizeVariableName(item.name || legacyVariableLabel(item)),
  }));
}

async function upload(rawJson: Record<string, unknown>) {
  try {
    loading.value = true;
    error.value = "";
    const detail = await api.uploadWorkflow(rawJson);
    applyDetail(detail);
    await refreshWorkflows();
  } catch (uploadError) {
    error.value =
      uploadError instanceof Error ? uploadError.message : "上传失败";
  } finally {
    loading.value = false;
  }
}

async function selectWorkflow(id: number) {
  try {
    loading.value = true;
    error.value = "";
    const detail = await api.getWorkflow(id);
    applyDetail(detail);
  } catch (selectError) {
    error.value =
      selectError instanceof Error ? selectError.message : "加载工作流失败";
  } finally {
    loading.value = false;
  }
}

function backToWorkflowList() {
  activeWorkflow.value = null;
  graph.value = undefined;
  nodeDefinitions.value = {};
  parameters.value = [];
  results.value = [];
  error.value = "";
}

function toggleInput(nodeId: string, field: string) {
  const key = `${nodeId}.${field}`;
  const existing = parameters.value.findIndex((item) => item.key === key);
  if (existing >= 0) {
    parameters.value.splice(existing, 1);
    return;
  }

  const node = graph.value?.nodes.find((item) => item.id === nodeId);
  const definition = node
    ? nodeDefinitions.value[node.classType]?.inputs[field]
    : undefined;
  if (!node || !definition) return;

  parameters.value.push({
    key,
    nodeId,
    field,
    name: nextVariableName(field),
    type: definition.type,
    default: node.fieldValues[field],
  });
}

function toggleOutput(nodeId: string, slotIndex: number) {
  const key = `${nodeId}.${slotIndex}`;
  const existing = results.value.findIndex((item) => item.key === key);
  if (existing >= 0) {
    results.value.splice(existing, 1);
    return;
  }

  const node = graph.value?.nodes.find((item) => item.id === nodeId);
  const definition = node
    ? nodeDefinitions.value[node.classType]?.outputs[slotIndex]
    : undefined;
  if (!node || !definition) return;

  results.value.push({
    key,
    nodeId,
    slotIndex,
    name: nextVariableName(definition.name.toLowerCase()),
    type: definition.type,
  });
}

function renameInput(key: string, name: string) {
  const item = parameters.value.find((input) => input.key === key);
  if (item) item.name = normalizeVariableName(name);
}

function renameOutput(key: string, name: string) {
  const item = results.value.find((output) => output.key === key);
  if (item) item.name = normalizeVariableName(name);
}

function normalizeVariableName(value: string) {
  return value.trim().replace(/^\$+/, "").trim();
}

function legacyVariableLabel(item: WorkflowParameter | WorkflowResult) {
  return (item as unknown as { label?: string }).label ?? "";
}

function nextVariableName(base: string) {
  const normalizedBase = normalizeVariableName(base) || "variable";
  const existingNames = new Set(
    [...parameters.value, ...results.value].map((item) =>
      normalizeVariableName(item.name),
    ),
  );
  if (!existingNames.has(normalizedBase)) return normalizedBase;

  let index = 2;
  while (existingNames.has(`${normalizedBase}${index}`)) index += 1;
  return `${normalizedBase}${index}`;
}

function validateVariableNames() {
  if ([...parameters.value, ...results.value].some((item) => !item.name)) {
    error.value = "参数/结果名称不能为空";
    return false;
  }

  if (duplicateVariableNames.value.length > 0) {
    error.value = `参数/结果名称 $${duplicateVariableNames.value[0]} 重复`;
    return false;
  }

  return true;
}

async function saveWorkflow(name: string) {
  if (!activeWorkflow.value) return;
  if (!validateVariableNames()) return;
  try {
    saving.value = true;
    error.value = "";
    const detail = await api.saveWorkflow(activeWorkflow.value.id, {
      name,
      parameters: parameters.value,
      results: results.value,
    });
    applyDetail(detail);
    saveDialogOpen.value = false;
    await refreshWorkflows();
  } catch (saveError) {
    error.value = saveError instanceof Error ? saveError.message : "保存失败";
  } finally {
    saving.value = false;
  }
}

function applyApp(app: AppRecord) {
  activeApp.value = structuredClone(app);
  appVariables.value = structuredClone(app.variables ?? []);
  appGraph.value = structuredClone(app.graph ?? createDefaultGraph());
  selectedAppNodeId.value = appGraph.value.nodes[0]?.id ?? null;
}

async function createApp() {
  error.value = "";
  applyApp({
    id: 0,
    name: "未命名应用",
    description: null,
    status: "draft",
    variables: [],
    graph: createDefaultGraph(),
    createdAt: new Date().toISOString(),
    updatedAt: null,
  });
}

async function selectApp(id: number) {
  try {
    loading.value = true;
    error.value = "";
    applyApp(await appApi.getApp(id));
  } catch (selectError) {
    error.value = selectError instanceof Error ? selectError.message : "加载应用失败";
  } finally {
    loading.value = false;
  }
}

function backToAppList() {
  activeApp.value = null;
  appVariables.value = [];
  appGraph.value = createDefaultGraph();
  selectedAppNodeId.value = null;
}

function updateAppName(name: string) {
  if (activeApp.value) activeApp.value.name = name;
}

function addAppVariable(source: AppVariable["source"]) {
  const base = source === "user_input" ? "INPUT" : "VAR";
  const key = nextAppVariableKey(base);
  appVariables.value.push({
    key,
    name: key,
    type: APP_VARIABLE_TYPES[0],
    source,
    required: source === "user_input",
  });
}

function updateAppVariable(key: string, patch: Partial<AppVariable>) {
  const variable = appVariables.value.find((item) => item.key === key);
  if (!variable) return;
  const nextName = patch.name !== undefined ? normalizeVariableName(patch.name) : undefined;
  Object.assign(variable, patch, nextName !== undefined ? { name: nextName, key: nextName || key } : {});
  rewriteVariableReferences(key, variable.key);
}

function removeAppVariable(key: string) {
  appVariables.value = appVariables.value.filter((item) => item.key !== key);
  for (const node of appGraph.value.nodes) {
    if (node.type === "output_collect" || node.type === "manual_gate") {
      node.data.displayVars = node.data.displayVars.filter((item) => item !== key);
    }
    if (node.type === "workflow_run") {
      for (const [parameterKey, binding] of Object.entries(node.data.inputBindings)) {
        if (binding.varKey === key) delete node.data.inputBindings[parameterKey];
      }
      for (const [resultKey, varKey] of Object.entries(node.data.outputAssignments)) {
        if (varKey === key) node.data.outputAssignments[resultKey] = null;
      }
    }
  }
}

function addAppNode(type: AppNodeType) {
  const id = `${type}-${Date.now()}`;
  const position = { x: 280 + appGraph.value.nodes.length * 32, y: 120 + appGraph.value.nodes.length * 24 };
  const data = type === "manual_gate"
    ? { title: "人工卡点", description: "", displayVars: [] }
    : { workflowId: null, inputBindings: {}, outputAssignments: {} };
  appGraph.value.nodes.push({ id, type, position, data } as AppGraphNode);
  selectedAppNodeId.value = id;
}

function removeAppNode(nodeId: string) {
  appGraph.value.nodes = appGraph.value.nodes.filter((node) => node.id !== nodeId);
  appGraph.value.edges = appGraph.value.edges.filter(
    (edge) => edge.source !== nodeId && edge.target !== nodeId,
  );
  if (selectedAppNodeId.value === nodeId) selectedAppNodeId.value = null;
}

function updateAppNodeData(nodeId: string, data: Record<string, unknown>) {
  const node = appGraph.value.nodes.find((item) => item.id === nodeId);
  if (node) node.data = data as AppGraphNode["data"];
}

function connectAppNodes(source: string, target: string) {
  if (source === target) return;
  if (appGraph.value.edges.some((edge) => edge.source === source && edge.target === target)) return;
  appGraph.value.edges.push({ id: `${source}-${target}`, source, target });
}

function moveAppNode(nodeId: string, position: { x: number; y: number }) {
  const node = appGraph.value.nodes.find((item) => item.id === nodeId);
  if (node) node.position = position;
}

async function saveApp() {
  if (!activeApp.value) return;
  const validationError = validateAppDraft();
  if (validationError) {
    error.value = validationError;
    return;
  }

  try {
    saving.value = true;
    error.value = "";
    const payload = {
      name: activeApp.value.name,
      description: activeApp.value.description,
      status: activeApp.value.status,
      variables: appVariables.value,
      graph: appGraph.value,
    };
    const saved = activeApp.value.id > 0
      ? await appApi.saveApp(activeApp.value.id, payload)
      : await appApi.createApp(payload);
    applyApp(saved);
    await refreshApps();
  } catch (saveError) {
    error.value = saveError instanceof Error ? saveError.message : "保存应用失败";
  } finally {
    saving.value = false;
  }
}

function validateAppDraft() {
  if (!activeApp.value?.name.trim()) return "应用名称不能为空";
  const variableKeys = new Set<string>();
  for (const variable of appVariables.value) {
    if (!variable.key || !variable.name) return "应用变量名称不能为空";
    if (variableKeys.has(variable.key)) return `应用变量 $${variable.key} 重复`;
    variableKeys.add(variable.key);
  }
  if (appGraph.value.nodes.filter((node) => node.type === "input_collect").length !== 1) return "应用必须有且仅有一个输入收集节点";
  if (appGraph.value.nodes.filter((node) => node.type === "output_collect").length !== 1) return "应用必须有且仅有一个输出收集节点";
  for (const node of appGraph.value.nodes) {
    if (node.type !== "workflow_run" || !node.data.workflowId) continue;
    const workflow = workflows.value.find((item) => item.id === node.data.workflowId);
    if (!workflow) return `节点 ${node.id} 选择了不存在的工作流`;
    for (const parameter of workflow.parameters) {
      const binding = node.data.inputBindings[parameter.key];
      if (!binding?.varKey) return `节点 ${node.id} 的参数 ${parameter.name} 未绑定应用变量`;
    }
  }
  return "";
}

function nextAppVariableKey(base: string) {
  const keys = new Set(appVariables.value.map((item) => item.key));
  if (!keys.has(base)) return base;
  let index = 2;
  while (keys.has(`${base}_${index}`)) index += 1;
  return `${base}_${index}`;
}

function rewriteVariableReferences(oldKey: string, newKey: string) {
  if (oldKey === newKey) return;
  for (const node of appGraph.value.nodes) {
    if (node.type === "output_collect" || node.type === "manual_gate") {
      node.data.displayVars = node.data.displayVars.map((item) => (item === oldKey ? newKey : item));
    }
    if (node.type === "workflow_run") {
      for (const binding of Object.values(node.data.inputBindings)) {
        if (binding.varKey === oldKey) binding.varKey = newKey;
      }
      for (const [resultKey, varKey] of Object.entries(node.data.outputAssignments)) {
        if (varKey === oldKey) node.data.outputAssignments[resultKey] = newKey;
      }
    }
  }
}
</script>

<template>
  <LayoutAppShell :workflow-mode="section === 'workflow'">
    <template #rail>
      <LayoutSidebarRail :active="section" @select="section = $event" />
    </template>

    <template #panel>
      <LayoutSidebarPanel :title="panelTitle">
        <template
          v-if="section === 'workflow' && activeWorkflow"
          #header-leading
        >
          <Button
            variant="outline"
            size="sm"
            type="button"
            @click="backToWorkflowList"
          >
            返回
          </Button>
        </template>
        <template
          v-if="section === 'workflow' && activeWorkflow"
          #header-actions
        >
          <Button
            size="sm"
            type="button"
            :disabled="saving"
            @click="saveDialogOpen = true"
          >
            保存
          </Button>
        </template>
        <WorkflowSidebar
          v-if="section === 'workflow' && !activeWorkflow"
          :workflows="workflows"
          :active-id="activeWorkflow?.id"
          :loading="loading"
          @upload="upload"
          @select="selectWorkflow"
        />
        <div
          v-else-if="section === 'workflow'"
          class="flex flex-1 flex-col gap-4 overflow-y-auto p-3"
        >
          <WorkflowInputsPanel
            :parameters="parameters"
            :duplicate-names="duplicateVariableNames"
            @rename="renameInput"
            @remove="parameters = parameters.filter((item) => item.key !== $event)"
          />
          <WorkflowOutputsPanel
            :results="results"
            :duplicate-names="duplicateVariableNames"
            @rename="renameOutput"
            @remove="results = results.filter((item) => item.key !== $event)"
          />
        </div>
        <AppSidebar
          v-else-if="section === 'app'"
          :apps="apps"
          :active-app="activeApp"
          :variables="appVariables"
          :saving="saving"
          @create="createApp"
          @select="selectApp"
          @back="backToAppList"
          @save="saveApp"
          @update-name="updateAppName"
          @add-variable="addAppVariable"
          @update-variable="updateAppVariable"
          @remove-variable="removeAppVariable"
          @add-node="addAppNode"
        />
        <div v-else class="p-4 text-sm text-slate-500">
          {{ panelTitle }}功能开发中。
        </div>
      </LayoutSidebarPanel>
    </template>

    <div
      v-if="section === 'app' && !activeApp"
      class="relative flex h-full items-center justify-center text-slate-500"
    >
      <div
        v-if="error"
        class="absolute bottom-4 left-4 z-20 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 shadow-sm"
      >
        {{ error }}
      </div>
      <span>选择或新建应用开始编排</span>
    </div>

    <div v-else-if="section === 'app' && activeApp" class="relative h-full">
      <div
        v-if="error"
        class="absolute bottom-4 left-4 z-20 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 shadow-sm"
      >
        {{ error }}
      </div>
      <AppCanvas
        :graph="appGraph"
        :variables="appVariables"
        :workflows="workflows"
        :selected-node-id="selectedAppNodeId"
        :controls-offset-left="356"
        @select-node="selectedAppNodeId = $event"
        @connect="connectAppNodes"
        @move-node="moveAppNode"
      />
      <AppInspector
        :node="selectedAppNode"
        :variables="appVariables"
        :workflows="workflows"
        @close="selectedAppNodeId = null"
        @remove-node="removeAppNode"
        @update-node-data="updateAppNodeData"
      />
    </div>

    <div
      v-else-if="section !== 'workflow'"
      class="flex h-full items-center justify-center text-slate-500"
    >
      {{ panelTitle }}功能开发中
    </div>

    <div v-else-if="!activeWorkflow" class="h-full" />

    <div v-else class="relative h-full">
      <div
        v-if="error"
        class="absolute bottom-4 left-4 z-20 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 shadow-sm"
      >
        {{ error }}
      </div>

      <WorkflowGraph
        :graph="graph"
        :node-definitions="nodeDefinitions"
        :parameters="parameters"
        :results="results"
        fullscreen
        :controls-offset-left="356"
        @toggle-input="toggleInput"
        @toggle-output="toggleOutput"
      />

      <WorkflowSaveWorkflowDialog
        :open="saveDialogOpen"
        :initial-name="activeWorkflow.name"
        :saving="saving"
        @close="saveDialogOpen = false"
        @save="saveWorkflow"
      />
    </div>
  </LayoutAppShell>
</template>
