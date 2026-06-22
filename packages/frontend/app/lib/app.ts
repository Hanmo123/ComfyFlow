export type AppStatus = "draft" | "published";
export type AppVariableSource = "user_input" | "computed";
export type AppNodeType =
  | "input_collect"
  | "output_text"
  | "output_image"
  | "manual_gate"
  | "workflow_run"
  | "coalesce"
  | "conditional"
  | "image_compress"
  | "image_concat"
  | "wait_for_previous";

export interface LoraItem {
  name: string;
  strength_model: number;
  strength_clip?: number;
}

export type PresetType = 'LORA_LIST' | 'STRING';

export interface AppInputPreset {
  id: number;
  appId: number;
  name: string;
  type: PresetType;
  value: unknown;
  createdAt: string;
  updatedAt: string | null;
}

export const APP_VARIABLE_TYPES = [
  "STRING",
  "INT",
  "FLOAT",
  "BOOL",
  "IMAGE",
  "LORA_NAME",
  "LORA_LIST",
  "LATENT",
  "MODEL",
  "CLIP",
  "VAE",
  "CONDITIONING",
  "CONTROL_NET",
  "UNKNOWN",
] as const;

export const APP_VARIABLE_TYPE_COLORS: Record<
  (typeof APP_VARIABLE_TYPES)[number],
  string
> = {
  STRING: "bg-blue-500",
  INT: "bg-green-500",
  FLOAT: "bg-indigo-500",
  BOOL: "bg-yellow-500 text-black",
  IMAGE: "bg-purple-500",
  LORA_NAME: "bg-fuchsia-500",
  LORA_LIST: "bg-fuchsia-600",
  LATENT: "bg-pink-500",
  MODEL: "bg-red-500",
  CLIP: "bg-orange-500",
  VAE: "bg-teal-500",
  CONDITIONING: "bg-cyan-500 text-black",
  CONTROL_NET: "bg-rose-500",
  UNKNOWN: "bg-gray-500",
};

export const APP_VARIABLE_TYPE_LABELS: Record<
  (typeof APP_VARIABLE_TYPES)[number],
  string
> = {
  STRING: "字符串",
  INT: "整数",
  FLOAT: "浮点数",
  BOOL: "布尔值",
  IMAGE: "图片",
  LORA_NAME: "LoRA",
  LORA_LIST: "LoRA列表",
  LATENT: "Latent",
  MODEL: "Model",
  CLIP: "CLIP",
  VAE: "VAE",
  CONDITIONING: "Conditioning",
  CONTROL_NET: "ControlNet",
  UNKNOWN: "未知",
};

export interface AppVariable {
  key: string;
  name: string;
  type: (typeof APP_VARIABLE_TYPES)[number];
  source: AppVariableSource;
  required?: boolean;
  default?: unknown;
  batch?: boolean;
}

export interface AppEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface VariableBinding {
  kind: "literal" | "variable";
  literal?: unknown;
  varKey?: string;
}

export interface BaseAppNode<
  TType extends AppNodeType,
  TData extends Record<string, unknown>,
> {
  id: string;
  type: TType;
  position: { x: number; y: number };
  data: TData;
}

export type InputCollectNode = BaseAppNode<
  "input_collect",
  Record<string, never>
>;
export type OutputTextNode = BaseAppNode<
  "output_text",
  { varKey: string | null }
>;
export type OutputImageNode = BaseAppNode<
  "output_image",
  { varKey: string | null }
>;
export type ManualGateNode = BaseAppNode<
  "manual_gate",
  { title: string; description?: string; displayVars: string[] }
>;
export type WorkflowRunNode = BaseAppNode<
  "workflow_run",
  {
    workflowId: number | null;
    inputBindings: Record<string, VariableBinding>;
    outputAssignments: Record<string, string | null>;
  }
>;
export type CoalesceNode = BaseAppNode<
  "coalesce",
  {
    inputs: Array<{ varKey: string | null }>;
    outputValue: string | null;
    outputSourceIndex: string | null;
  }
>;
export type ConditionalNode = BaseAppNode<
  "conditional",
  {
    conditionVarKey: string | null;
  }
>;
export type ImageCompressNode = BaseAppNode<
  "image_compress",
  {
    varKey: string | null;
    quality: number;
    resizeMode: "longest" | "shortest" | "none";
    maxSize: number | null;
    deleteOriginalFile: boolean;
  }
>;
export type ImageConcatNode = BaseAppNode<
  "image_concat",
  {
    inputs: Array<{ varKey: string | null }>;
    outputValue: string | null;
  }
>;
export type WaitForPreviousNode = BaseAppNode<
  "wait_for_previous",
  Record<string, never>
>;

export type AppGraphNode =
  | InputCollectNode
  | OutputTextNode
  | OutputImageNode
  | ManualGateNode
  | WorkflowRunNode
  | CoalesceNode
  | ConditionalNode
  | ImageCompressNode
  | ImageConcatNode
  | WaitForPreviousNode;

export interface AppGraph {
  nodes: AppGraphNode[];
  edges: AppEdge[];
}

export interface AppRecord {
  id: number;
  name: string;
  description: string | null;
  status: AppStatus;
  variables: AppVariable[];
  graph: AppGraph;
  createdAt: string;
  updatedAt: string | null;
}

export interface AppSavePayload {
  name: string;
  description?: string | null;
  status?: AppStatus;
  variables: AppVariable[];
  graph: AppGraph;
}

export type AppTaskStatus =
  | "queued"
  | "running"
  | "waiting"
  | "completed"
  | "failed";
export type AppTaskNodeStatus =
  | "queued"
  | "running"
  | "waiting"
  | "completed"
  | "failed"
  | "skipped";

export interface AppTaskNodeRun {
  nodeId: string;
  type: AppNodeType;
  status: AppTaskNodeStatus;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  inputs?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
}

export interface AppTaskRecord {
  id: number;
  appId: number;
  taskGroupId: number | null;
  status: AppTaskStatus;
  requiresManualAction: boolean;
  inputs: Record<string, unknown>;
  variables: Record<string, unknown>;
  outputs: Record<string, unknown>;
  appSnapshot: { id: number; name: string; variables: AppVariable[]; graph: AppGraph };
  nodeRuns: AppTaskNodeRun[];
  waitingNodeId: string | null;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface TaskGroupRecord {
  id: number;
  name: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string | null;
}

export function isCompatibleVariableType(actual: string, expected: string) {
  return actual === 'UNKNOWN' || expected === 'UNKNOWN' || actual === expected
}

export function createDefaultGraph(): AppGraph {
  return {
    nodes: [
      {
        id: "input",
        type: "input_collect",
        position: { x: 0, y: 0 },
        data: {},
      },
    ],
    edges: [],
  };
}

type LegacyOutputCollectNode = {
  id: string;
  type: "output_collect";
  position: { x: number; y: number };
  data: { displayVars: string[] };
};
type LegacyGraphNode = AppGraphNode | LegacyOutputCollectNode;

export function normalizeAppGraph(
  graph: AppGraph | null | undefined,
  variables: AppVariable[] = [],
): AppGraph {
  const sourceGraph = graph ?? createDefaultGraph();
  const variableByKey = new Map(
    variables.map((variable) => [variable.key, variable]),
  );
  const legacyOutputIds = new Map<string, string[]>();
  const nodes: AppGraphNode[] = [];

  for (const node of (sourceGraph.nodes ?? []) as LegacyGraphNode[]) {
    if (node.type !== "output_collect") {
      nodes.push(node);
      continue;
    }

    const displayVars = node.data.displayVars ?? [];
    legacyOutputIds.set(
      node.id,
      displayVars.map((_, index) =>
        index === 0 ? node.id : `${node.id}-${index + 1}`,
      ),
    );
    for (const [index, varKey] of displayVars.entries()) {
      const variable = variableByKey.get(varKey);
      nodes.push({
        id: index === 0 ? node.id : `${node.id}-${index + 1}`,
        type: variable?.type === "IMAGE" ? "output_image" : "output_text",
        position: { x: node.position.x, y: node.position.y + index * 120 },
        data: { varKey },
      });
    }
  }

  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges: AppEdge[] = [];
  const edgeIds = new Set<string>();
  for (const edge of sourceGraph.edges ?? []) {
    const sourceIds = legacyOutputIds.get(edge.source) ?? [edge.source];
    const targetIds = legacyOutputIds.get(edge.target) ?? [edge.target];
    for (const source of sourceIds) {
      for (const target of targetIds) {
        if (!nodeIds.has(source) || !nodeIds.has(target) || source === target)
          continue;
        const id = buildEdgeId(source, target, edge.sourceHandle, edge.targetHandle);
        if (edgeIds.has(id)) continue;
        edgeIds.add(id);
        edges.push({
          id,
          source,
          target,
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle,
        });
      }
    }
  }

  return { nodes, edges };
}

export function nodeTypeLabel(type: AppNodeType) {
  const labels: Record<AppNodeType, string> = {
    input_collect: "变量定义",
    output_text: "输出文本",
    output_image: "输出图片",
    manual_gate: "人工卡点",
    workflow_run: "工作流运行",
    coalesce: "取非空值",
    conditional: "条件执行",
    image_compress: "图片压缩",
    image_concat: "图片拼接",
    wait_for_previous: "等待前序",
  };
  return labels[type];
}

function buildEdgeId(
  source: string,
  target: string,
  sourceHandle?: string,
  targetHandle?: string,
) {
  if (sourceHandle || targetHandle) {
    return `${source}-${sourceHandle || "default"}-${target}-${targetHandle || "default"}`;
  }
  return `${source}-${target}`;
}
