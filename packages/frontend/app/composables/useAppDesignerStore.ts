import type { AppGraph, AppGraphNode, AppNodeType, AppRecord, AppTaskRecord, AppVariable } from '@/lib/app'
import { APP_VARIABLE_TYPES, createDefaultGraph, normalizeAppGraph } from '@/lib/app'
import type { WorkflowRecord } from '@/lib/workflow'

export function useAppDesignerStore() {
  const workflows = useState<WorkflowRecord[]>('app-designer-workflows', () => [])
  const apps = useState<AppRecord[]>('app-designer-apps', () => [])
  const activeApp = useState<AppRecord | null>('app-designer-active-app', () => null)
  const appVariables = useState<AppVariable[]>('app-designer-variables', () => [])
  const appGraph = useState<AppGraph>('app-designer-graph', () => createDefaultGraph())
  const selectedAppNodeId = useState<string | null>('app-designer-selected-node-id', () => null)
  const saving = useState('app-designer-saving', () => false)
  const running = useState('app-designer-running', () => false)
  const latestTask = useState<AppTaskRecord | null>('app-designer-latest-task', () => null)
  const error = useState('app-designer-error', () => '')

  const workflowApi = useWorkflowApi()
  const appApi = useAppApi()

  const sortedApps = computed(() => [...apps.value].sort((left, right) => appTimestamp(right) - appTimestamp(left)))
  const variableByKey = computed(() => new Map(appVariables.value.map((variable) => [variable.key, variable])))
  const userInputVariables = computed(() => appVariables.value.filter((variable) => variable.source === 'user_input'))
  const computedVariables = computed(() => appVariables.value.filter((variable) => variable.source === 'computed'))
  const workflowById = computed(() => new Map(workflows.value.map((workflow) => [workflow.id, workflow])))

  async function initialize() {
    try {
      error.value = ''
      await Promise.all([refreshWorkflows(), refreshApps()])
      openRecentOrCreate()
    } catch (loadError) {
      error.value = loadError instanceof Error ? loadError.message : '初始化应用画布失败'
      createDraftApp()
    }
  }

  async function refreshWorkflows() {
    workflows.value = await workflowApi.listWorkflows()
  }

  async function refreshApps() {
    apps.value = await appApi.listApps()
  }

  function openRecentOrCreate() {
    const recentApp = sortedApps.value[0]
    if (recentApp) applyApp(recentApp)
    else createDraftApp()
  }

  function applyApp(app: AppRecord) {
    activeApp.value = clonePlain(app)
    appVariables.value = clonePlain(app.variables ?? [])
    appGraph.value = normalizeAppGraph(clonePlain(app.graph ?? createDefaultGraph()), appVariables.value)
    selectedAppNodeId.value = appGraph.value.nodes[0]?.id ?? null
  }

  function createDraftApp() {
    applyApp({
      id: 0,
      name: '未命名应用',
      description: null,
      status: 'draft',
      variables: [],
      graph: createDefaultGraph(),
      createdAt: new Date().toISOString(),
      updatedAt: null,
    })
  }

  function updateAppName(name: string) {
    if (activeApp.value) activeApp.value.name = name
  }

  async function selectApp(id: number) {
    try {
      error.value = ''
      applyApp(await appApi.getApp(id))
    } catch (selectError) {
      error.value = selectError instanceof Error ? selectError.message : '加载应用失败'
    }
  }

  function addAppVariable(source: AppVariable['source'], options: { key?: string; name?: string; type?: string } = {}) {
    const base = normalizeVariableName(options.key ?? options.name ?? (source === 'user_input' ? 'INPUT' : 'VAR'))
    const key = nextAppVariableKey(base)
    appVariables.value.push({
      key,
      name: normalizeVariableName(options.name ?? key) || key,
      type: isAppVariableType(options.type) ? options.type : APP_VARIABLE_TYPES[0],
      source,
      required: source === 'user_input',
    })
    return key
  }

  function addWorkflowOutputVariable(nodeId: string, resultKey: string, result: { name: string; type: string }) {
    const variableKey = addAppVariable('computed', {
      key: resultKey,
      name: result.name || resultKey,
      type: result.type,
    })
    const node = appGraph.value.nodes.find((item) => item.id === nodeId)
    if (node?.type !== 'workflow_run') return
    node.data.outputAssignments = {
      ...node.data.outputAssignments,
      [resultKey]: variableKey,
    }
  }

  function addWorkflowInputVariable(
    nodeId: string,
    parameterKey: string,
    parameter: { name: string; type: string; default?: unknown }
  ) {
    const node = appGraph.value.nodes.find((item) => item.id === nodeId)
    if (node?.type !== 'workflow_run') return

    const variableType = isAppVariableType(parameter.type) ? parameter.type : APP_VARIABLE_TYPES[0]

    const existingBinding = node.data.inputBindings[parameterKey]
    if (existingBinding?.kind === 'variable' && existingBinding.varKey) {
      const existingVariable = appVariables.value.find((item) => item.key === existingBinding.varKey)
      if (existingVariable) {
        existingVariable.type = variableType
        if (parameter.default !== undefined) existingVariable.default = parameter.default
      }
      return
    }

    const variableKey = addAppVariable('user_input', {
      key: parameterKey,
      name: parameter.name || parameterKey,
      type: variableType,
    })
    const variable = appVariables.value.find((item) => item.key === variableKey)
    if (variable && parameter.default !== undefined) variable.default = parameter.default

    node.data.inputBindings = {
      ...node.data.inputBindings,
      [parameterKey]: { kind: 'variable', varKey: variableKey },
    }
  }

  function updateAppVariable(key: string, patch: Partial<AppVariable>) {
    const variable = appVariables.value.find((item) => item.key === key)
    if (!variable) return

    const nextName = patch.name !== undefined ? normalizeVariableName(patch.name) : undefined
    Object.assign(variable, patch, nextName !== undefined ? { name: nextName, key: nextName || key } : {})
    rewriteVariableReferences(key, variable.key)
  }

  function removeAppVariable(key: string) {
    appVariables.value = appVariables.value.filter((item) => item.key !== key)
    for (const node of appGraph.value.nodes) {
      if (node.type === 'manual_gate') {
        node.data.displayVars = node.data.displayVars.filter((item) => item !== key)
      }
      if (node.type === 'output_text' || node.type === 'output_image') {
        if (node.data.varKey === key) node.data.varKey = null
      }
      if (node.type === 'workflow_run') {
        for (const [parameterKey, binding] of Object.entries(node.data.inputBindings)) {
          if (binding.varKey === key) delete node.data.inputBindings[parameterKey]
        }
        for (const [resultKey, varKey] of Object.entries(node.data.outputAssignments)) {
          if (varKey === key) node.data.outputAssignments[resultKey] = null
        }
      }
    }
  }

  function addAppNode(type: AppNodeType) {
    const id = `${type}-${Date.now()}`
    const position = { x: 280 + appGraph.value.nodes.length * 32, y: 120 + appGraph.value.nodes.length * 24 }
    appGraph.value.nodes.push({ id, type, position, data: createNodeData(type) } as AppGraphNode)
    selectedAppNodeId.value = id
  }

  function removeAppNode(nodeId: string) {
    appGraph.value.nodes = appGraph.value.nodes.filter((node) => node.id !== nodeId)
    appGraph.value.edges = appGraph.value.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId)
    if (selectedAppNodeId.value === nodeId) selectedAppNodeId.value = null
  }

  function updateAppNodeData(nodeId: string, data: Record<string, unknown>) {
    const node = appGraph.value.nodes.find((item) => item.id === nodeId)
    if (node) node.data = data as AppGraphNode['data']
  }

  function connectAppNodes(source: string, target: string) {
    if (source === target) return
    if (appGraph.value.edges.some((edge) => edge.source === source && edge.target === target)) return
    appGraph.value.edges.push({ id: `${source}-${target}`, source, target })
  }

  function moveAppNode(nodeId: string, position: { x: number; y: number }) {
    const node = appGraph.value.nodes.find((item) => item.id === nodeId)
    if (node) node.position = position
  }

  function toggleDisplayVar(node: AppGraphNode, varKey: string) {
    if (node.type !== 'manual_gate') return
    const displayVars = node.data.displayVars.includes(varKey)
      ? node.data.displayVars.filter((item) => item !== varKey)
      : [...node.data.displayVars, varKey]
    updateAppNodeData(node.id, { ...node.data, displayVars })
  }

  function updateOutputVar(node: AppGraphNode, varKey: string) {
    if (node.type !== 'output_text' && node.type !== 'output_image') return
    updateAppNodeData(node.id, { ...node.data, varKey: varKey || null })
  }

  function updateWorkflowId(node: AppGraphNode, value: string) {
    if (node.type !== 'workflow_run') return
    updateAppNodeData(node.id, {
      ...node.data,
      workflowId: value ? Number(value) : null,
      inputBindings: {},
      outputAssignments: {},
    })
  }

  function updateInputBinding(node: AppGraphNode, parameterKey: string, varKey: string) {
    if (node.type !== 'workflow_run') return
    const inputBindings = { ...node.data.inputBindings }
    if (varKey) inputBindings[parameterKey] = { kind: 'variable', varKey }
    else delete inputBindings[parameterKey]
    updateAppNodeData(node.id, { ...node.data, inputBindings })
  }

  function updateOutputAssignment(node: AppGraphNode, resultKey: string, varKey: string) {
    if (node.type !== 'workflow_run') return
    updateAppNodeData(node.id, {
      ...node.data,
      outputAssignments: { ...node.data.outputAssignments, [resultKey]: varKey || null },
    })
  }

  async function saveApp() {
    if (!activeApp.value || saving.value) return
    if (activeApp.value.id <= 0) {
      const defaultName = activeApp.value.name.trim() === '未命名应用' ? '' : activeApp.value.name
      const nextName = window.prompt('请输入应用名称', defaultName)
      if (nextName === null) return

      activeApp.value.name = nextName.trim()
    }

    const validationError = validateAppDraft()
    if (validationError) {
      error.value = validationError
      return
    }

    try {
      saving.value = true
      error.value = ''
      const payload = {
        name: activeApp.value.name,
        description: activeApp.value.description,
        status: activeApp.value.status,
        variables: appVariables.value,
        graph: appGraph.value,
      }
      const saved = activeApp.value.id > 0 ? await appApi.saveApp(activeApp.value.id, payload) : await appApi.createApp(payload)
      applyApp(saved)
      await refreshApps()
    } catch (saveError) {
      error.value = saveError instanceof Error ? saveError.message : '保存应用失败'
    } finally {
      saving.value = false
    }
  }

  async function runApp(inputs: Record<string, unknown>, taskGroupId: number) {
    if (!activeApp.value || running.value) return

    await saveApp()
    if (!activeApp.value || activeApp.value.id <= 0 || error.value) return

    try {
      running.value = true
      error.value = ''
      latestTask.value = await appApi.runApp(activeApp.value.id, taskGroupId, inputs)
      return latestTask.value
    } catch (runError) {
      error.value = runError instanceof Error ? runError.message : '运行应用失败'
    } finally {
      running.value = false
    }
  }

  async function resumeLatestTask() {
    if (!activeApp.value || !latestTask.value || running.value) return
    try {
      running.value = true
      error.value = ''
      latestTask.value = await appApi.resumeAppTask(activeApp.value.id, latestTask.value.id)
      await pollLatestTask()
    } catch (resumeError) {
      error.value = resumeError instanceof Error ? resumeError.message : '继续任务失败'
    } finally {
      running.value = false
    }
  }

  async function pollLatestTask() {
    if (!activeApp.value || !latestTask.value) return
    while (latestTask.value && ['queued', 'running'].includes(latestTask.value.status)) {
      await sleep(1200)
      latestTask.value = await appApi.getAppTask(activeApp.value.id, latestTask.value.id)
    }
  }

  function workflowOf(node: AppGraphNode) {
    if (node.type !== 'workflow_run' || !node.data.workflowId) return null
    return workflowById.value.get(node.data.workflowId) ?? null
  }

  function outputType(node: AppGraphNode) {
    if (node.type === 'output_text') return 'STRING'
    if (node.type === 'output_image') return 'IMAGE'
    return ''
  }

  function validateAppDraft() {
    if (!activeApp.value?.name.trim()) return '应用名称不能为空'
    const variableKeys = new Set<string>()
    for (const variable of appVariables.value) {
      if (!variable.key || !variable.name) return '应用变量名称不能为空'
      if (variableKeys.has(variable.key)) return `应用变量 $${variable.key} 重复`
      variableKeys.add(variable.key)
    }
    if (appGraph.value.nodes.filter((node) => node.type === 'input_collect').length !== 1) {
      return '应用必须有且仅有一个变量定义节点'
    }
    return ''
  }

  function nextAppVariableKey(base: string) {
    const keys = new Set(appVariables.value.map((item) => item.key))
    if (!keys.has(base)) return base
    let index = 2
    while (keys.has(`${base}_${index}`)) index += 1
    return `${base}_${index}`
  }

  function rewriteVariableReferences(oldKey: string, newKey: string) {
    if (oldKey === newKey) return
    for (const node of appGraph.value.nodes) {
      if (node.type === 'manual_gate') {
        node.data.displayVars = node.data.displayVars.map((item) => (item === oldKey ? newKey : item))
      }
      if (node.type === 'output_text' || node.type === 'output_image') {
        if (node.data.varKey === oldKey) node.data.varKey = newKey
      }
      if (node.type === 'workflow_run') {
        for (const binding of Object.values(node.data.inputBindings)) {
          if (binding.varKey === oldKey) binding.varKey = newKey
        }
        for (const [resultKey, varKey] of Object.entries(node.data.outputAssignments)) {
          if (varKey === oldKey) node.data.outputAssignments[resultKey] = newKey
        }
      }
    }
  }

  return {
    workflows,
    apps,
    activeApp,
    appVariables,
    appGraph,
    selectedAppNodeId,
    saving,
    running,
    latestTask,
    error,
    sortedApps,
    variableByKey,
    userInputVariables,
    computedVariables,
    initialize,
    createDraftApp,
    updateAppName,
    selectApp,
    addAppVariable,
    updateAppVariable,
    removeAppVariable,
    addAppNode,
    removeAppNode,
    updateAppNodeData,
    connectAppNodes,
    moveAppNode,
    toggleDisplayVar,
    updateOutputVar,
    updateWorkflowId,
    updateInputBinding,
    updateOutputAssignment,
    addWorkflowInputVariable,
    addWorkflowOutputVariable,
    saveApp,
    runApp,
    resumeLatestTask,
    workflowOf,
    outputType,
  }
}

function createNodeData(type: AppNodeType) {
  if (type === 'manual_gate') return { title: '人工卡点', description: '', displayVars: [] }
  if (type === 'workflow_run') return { workflowId: null, inputBindings: {}, outputAssignments: {} }
  if (type === 'output_text' || type === 'output_image') return { varKey: null }
  return {}
}

function normalizeVariableName(value: string) {
  return value.trim().replace(/^\$+/, '').trim()
}

function appTimestamp(app: AppRecord) {
  return new Date(app.updatedAt ?? app.createdAt).getTime()
}

function clonePlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function isAppVariableType(type: string | undefined): type is AppVariable['type'] {
  return APP_VARIABLE_TYPES.includes(type as AppVariable['type'])
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
