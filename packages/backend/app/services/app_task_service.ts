import type { AppGraphNode, VariableBinding, WorkflowRunNode } from '#models/app'
import type AppTask from '#models/app_task'
import type { AppTaskNodeRun } from '#models/app_task'
import type Workflow from '#models/workflow'
import AppRepository from '#repositories/app_repository'
import AppTaskRepository from '#repositories/app_task_repository'
import WorkflowRepository from '#repositories/workflow_repository'
import { Exception } from '@adonisjs/core/exceptions'
import { DateTime } from 'luxon'
import ComfyService from './comfy_service.js'

export default class AppTaskService {
  private static queue = Promise.resolve()

  constructor(
    private appRepository = new AppRepository(),
    private taskRepository = new AppTaskRepository(),
    private workflowRepository = new WorkflowRepository(),
    private comfyService = new ComfyService()
  ) {}

  async run(appId: number, inputs: Record<string, unknown> = {}) {
    const app = await this.appRepository.findOrFail(appId)
    const variables = buildInitialVariables(app.variables, inputs)
    const task = await this.taskRepository.create({
      appId: app.id,
      inputs,
      variables,
      appSnapshot: {
        id: app.id,
        name: app.name,
        variables: app.variables,
        graph: app.graph,
      },
    })

    this.enqueue(task.id)
    return task
  }

  async show(appId: number, taskId: number) {
    return this.taskRepository.findForAppOrFail(appId, taskId)
  }

  async resume(appId: number, taskId: number) {
    const task = await this.taskRepository.findForAppOrFail(appId, taskId)
    if (task.status !== 'waiting' || !task.waitingNodeId) {
      throw new Exception('任务当前不在人工卡点', { status: 422, code: 'E_TASK_NOT_WAITING' })
    }

    markNodeRun(task, task.waitingNodeId, 'completed')
    await this.taskRepository.update(task, {
      status: 'queued',
      waitingNodeId: null,
      nodeRuns: task.nodeRuns,
      error: null,
    })
    this.enqueue(task.id)
    return task
  }

  private enqueue(taskId: number) {
    AppTaskService.queue = AppTaskService.queue
      .then(() => this.execute(taskId))
      .catch(() => {
        // execute persists task failure; keep the in-memory queue alive for the next task.
      })
  }

  private async execute(taskId: number) {
    const task = await this.taskRepository.findOrFail(taskId)
    if (task.status !== 'queued') return

    await this.taskRepository.update(task, {
      status: 'running',
      startedAt: task.startedAt ?? DateTime.now(),
      completedAt: null,
      error: null,
    })

    try {
      await this.processTask(task)
    } catch (error) {
      const message = error instanceof Error ? error.message : '任务执行失败'
      const runningNode = task.nodeRuns.find((nodeRun) => nodeRun.status === 'running')
      if (runningNode) {
        runningNode.status = 'failed'
        runningNode.completedAt = new Date().toISOString()
        runningNode.error = message
      }
      await this.taskRepository.update(task, {
        status: 'failed',
        error: message,
        nodeRuns: task.nodeRuns,
        variables: task.variables,
        outputs: task.outputs,
        completedAt: DateTime.now(),
      })
    }
  }

  private async processTask(task: AppTask) {
    const orderedNodes = topologicalSort(task.appSnapshot.graph.nodes, task.appSnapshot.graph.edges)
    for (const node of orderedNodes) {
      if (nodeRunStatus(task, node.id) === 'completed') continue

      if (node.type === 'input_collect') {
        markNodeRun(task, node.id, 'completed')
        await this.persistProgress(task)
        continue
      }

      if (node.type === 'manual_gate') {
        markNodeRun(task, node.id, 'waiting')
        await this.taskRepository.update(task, {
          status: 'waiting',
          waitingNodeId: node.id,
          variables: task.variables,
          nodeRuns: task.nodeRuns,
        })
        return
      }

      if (node.type === 'workflow_run') {
        await this.runWorkflowNode(task, node)
        continue
      }

      if (node.type === 'output_text' || node.type === 'output_image') {
        const varKey = node.data.varKey
        markNodeRun(task, node.id, 'running')
        if (varKey) task.outputs[varKey] = task.variables[varKey]
        markNodeRun(task, node.id, 'completed', { outputs: varKey ? { [varKey]: task.outputs[varKey] } : {} })
        await this.persistProgress(task)
      }
    }

    await this.taskRepository.update(task, {
      status: 'completed',
      variables: task.variables,
      outputs: task.outputs,
      nodeRuns: task.nodeRuns,
      completedAt: DateTime.now(),
    })
  }

  private async runWorkflowNode(task: AppTask, node: WorkflowRunNode) {
    if (!node.data.workflowId) throw new Exception(`工作流节点 ${node.id} 未选择工作流`, { status: 422 })

    const workflow = await this.workflowRepository.findOrFail(node.data.workflowId)
    const inputs = resolveWorkflowInputs(workflow, node, task.variables)
    markNodeRun(task, node.id, 'running', { inputs })
    await this.persistProgress(task)

    const prompt = buildWorkflowPrompt(workflow, inputs)
    const workflowOutputs = await this.comfyService.runWorkflow(prompt, workflow.results)
    for (const [resultKey, varKey] of Object.entries(node.data.outputAssignments ?? {})) {
      if (varKey) task.variables[varKey] = workflowOutputs[resultKey]
    }

    markNodeRun(task, node.id, 'completed', { outputs: workflowOutputs })
    await this.persistProgress(task)
  }

  private async persistProgress(task: AppTask) {
    await this.taskRepository.update(task, {
      variables: task.variables,
      outputs: task.outputs,
      nodeRuns: task.nodeRuns,
    })
  }
}

function buildInitialVariables(variables: AppTask['appSnapshot']['variables'], inputs: Record<string, unknown>) {
  const result: Record<string, unknown> = {}
  for (const variable of variables) {
    if (variable.source === 'user_input') {
      const value = inputs[variable.key] ?? variable.default
      if (variable.required && isEmptyValue(value)) {
        throw new Exception(`应用输入 $${variable.key} 不能为空`, { status: 422, code: 'E_INVALID_APP_INPUTS' })
      }
      result[variable.key] = value
      continue
    }

    if (variable.default !== undefined) result[variable.key] = variable.default
  }
  return result
}

function resolveWorkflowInputs(workflow: Workflow, node: WorkflowRunNode, variables: Record<string, unknown>) {
  const inputs: Record<string, unknown> = {}
  for (const parameter of workflow.parameters) {
    const binding = node.data.inputBindings?.[parameter.key]
    inputs[parameter.key] = resolveBinding(binding, variables, parameter.default)
  }
  return inputs
}

function resolveBinding(binding: VariableBinding | undefined, variables: Record<string, unknown>, fallback: unknown) {
  if (!binding) return fallback
  if (binding.kind === 'literal') return binding.literal
  return binding.varKey ? variables[binding.varKey] : fallback
}

function buildWorkflowPrompt(workflow: Workflow, inputs: Record<string, unknown>) {
  const prompt = structuredClone(workflow.rawJson)
  for (const parameter of workflow.parameters) {
    const rawNode = prompt[parameter.nodeId]
    if (!isPromptNode(rawNode)) continue
    rawNode.inputs[parameter.field] = inputs[parameter.key]
  }
  return prompt
}

function topologicalSort(nodes: AppGraphNode[], edges: { source: string; target: string }[]) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const indegree = new Map(nodes.map((node) => [node.id, 0]))
  const outgoing = new Map<string, string[]>()

  for (const edge of edges) {
    indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1)
    outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge.target])
  }

  const queue = [...indegree.entries()].filter(([, degree]) => degree === 0).map(([id]) => id)
  const result: AppGraphNode[] = []
  while (queue.length > 0) {
    const id = queue.shift()!
    const node = nodeById.get(id)
    if (node) result.push(node)
    for (const target of outgoing.get(id) ?? []) {
      const nextDegree = (indegree.get(target) ?? 0) - 1
      indegree.set(target, nextDegree)
      if (nextDegree === 0) queue.push(target)
    }
  }

  return result
}

function markNodeRun(
  task: AppTask,
  nodeId: string,
  status: AppTaskNodeRun['status'],
  patch: Partial<AppTaskNodeRun> = {}
) {
  const node = task.appSnapshot.graph.nodes.find((item) => item.id === nodeId)
  if (!node) return

  let nodeRun = task.nodeRuns.find((item) => item.nodeId === nodeId)
  if (!nodeRun) {
    nodeRun = { nodeId, type: node.type, status: 'queued' }
    task.nodeRuns.push(nodeRun)
  }

  Object.assign(nodeRun, patch, { status })
  if (status === 'running' && !nodeRun.startedAt) nodeRun.startedAt = new Date().toISOString()
  if (['completed', 'failed', 'skipped'].includes(status)) nodeRun.completedAt = new Date().toISOString()
}

function nodeRunStatus(task: AppTask, nodeId: string) {
  return task.nodeRuns.find((item) => item.nodeId === nodeId)?.status
}

function isPromptNode(value: unknown): value is { inputs: Record<string, unknown> } {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value) && 'inputs' in value)
}

function isEmptyValue(value: unknown) {
  return value === undefined || value === null || value === ''
}
