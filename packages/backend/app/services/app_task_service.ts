import type {
  AppGraphNode,
  VariableBinding,
  WorkflowRunNode,
  ImageCompressNode,
  ImageConcatNode,
} from '#models/app'
import type AppTask from '#models/app_task'
import type { AppTaskNodeRun } from '#models/app_task'
import type Workflow from '#models/workflow'
import type { LoraItem } from '#comfy_nodes/types'
import { getNodeDefinition } from '#comfy_nodes/index'
import AppRepository from '#repositories/app_repository'
import AppTaskRepository from '#repositories/app_task_repository'
import WorkflowRepository from '#repositories/workflow_repository'
import TaskGroupService from '#services/task_group_service'
import { Exception } from '@adonisjs/core/exceptions'
import { randomInt } from 'node:crypto'
import { DateTime } from 'luxon'
import sharp from 'sharp'
import ComfyService from './comfy_service.js'
import { normalizeComfyApiJson } from './comfy_parser.js'
import MediaAssetService from './media_asset_service.js'
import TaskRealtimeService from './task_realtime_service.js'

type SeedGenerator = () => number
type PendingTask = { taskId: number; service: AppTaskService }

class AsyncLimiter {
  private activeCount = 0
  private queue: Array<() => void> = []

  constructor(private getConcurrency: () => number) {}

  async run<T>(handler: () => Promise<T>) {
    await this.acquire()
    try {
      return await handler()
    } finally {
      this.release()
    }
  }

  private acquire() {
    if (this.activeCount < this.getConcurrency()) {
      this.activeCount += 1
      return Promise.resolve()
    }

    return new Promise<void>((resolve) => {
      this.queue.push(() => {
        this.activeCount += 1
        resolve()
      })
    })
  }

  private release() {
    this.activeCount -= 1
    const next = this.queue.shift()
    if (next) next()
  }
}

export default class AppTaskService {
  private static pendingTasks = new Map<number, PendingTask>()
  private static runningTaskIds = new Set<number>()
  private static isDraining = false
  private static comfyLimiter = new AsyncLimiter(() => readConcurrency('COMFY_CONCURRENCY', 1))

  constructor(
    private appRepository = new AppRepository(),
    private taskRepository = new AppTaskRepository(),
    private workflowRepository = new WorkflowRepository(),
    private taskGroupService = new TaskGroupService(),
    private comfyService = new ComfyService(),
    private mediaAssetService = new MediaAssetService(),
    private seedGenerator: SeedGenerator = randomSeed
  ) {}

  async run(appId: number, taskGroupId: number, inputs: Record<string, unknown> = {}) {
    await this.taskGroupService.ensureExists(taskGroupId)
    const app = await this.appRepository.findOrFail(appId)
    const variables = buildInitialVariables(app.variables, inputs)
    const task = await this.createTask({
      appId: app.id,
      taskGroupId,
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

  async list(taskGroupId?: number) {
    return this.taskRepository.list(taskGroupId)
  }

  async showById(taskId: number) {
    return this.taskRepository.findOrFail(taskId)
  }

  async show(appId: number, taskId: number) {
    return this.taskRepository.findForAppOrFail(appId, taskId)
  }

  async moveToGroup(taskId: number, taskGroupId: number) {
    await this.taskGroupService.ensureExists(taskGroupId)
    const task = await this.taskRepository.findOrFail(taskId)
    await this.updateTask(task, { taskGroupId })
    return task
  }

  async getLatestTask(appId: number) {
    return this.taskRepository.findLatestByAppId(appId)
  }

  async resume(appId: number, taskId: number) {
    const task = await this.taskRepository.findForAppOrFail(appId, taskId)
    if (task.status !== 'waiting' || !task.waitingNodeId) {
      throw new Exception('任务当前不在人工卡点', { status: 422, code: 'E_TASK_NOT_WAITING' })
    }

    markNodeRun(task, task.waitingNodeId, 'completed')
    await this.updateTask(task, {
      status: 'queued',
      requiresManualAction: false,
      waitingNodeId: null,
      nodeRuns: task.nodeRuns,
      error: null,
    })
    this.enqueue(task.id)
    return task
  }

  async retryNode(taskId: number, nodeId: string, force?: boolean) {
    const task = await this.taskRepository.findOrFail(taskId)
    if (!force && (task.status === 'queued' || task.status === 'running')) {
      throw new Exception('任务正在执行，不能发起重试', { status: 422, code: 'E_TASK_BUSY' })
    }

    const node = task.appSnapshot.graph.nodes.find((item) => item.id === nodeId)
    if (!node) throw new Exception('任务节点不存在', { status: 404, code: 'E_TASK_NODE_NOT_FOUND' })
    if (!isRetryableNode(node)) {
      throw new Exception('该节点不支持重试', {
        status: 422,
        code: 'E_TASK_NODE_NOT_RETRYABLE',
      })
    }

    const resetNodeIds = collectDownstreamNodeIds(
      task.appSnapshot.graph.nodes,
      task.appSnapshot.graph.edges,
      nodeId
    )
    task.nodeRuns = task.nodeRuns.filter((nodeRun) => !resetNodeIds.has(nodeRun.nodeId))

    await this.updateTask(task, {
      status: 'queued',
      requiresManualAction: false,
      waitingNodeId: null,
      error: null,
      nodeRuns: task.nodeRuns,
      completedAt: null,
    })
    this.enqueue(task.id)
    return task
  }

  async retryTask(taskId: number, inputs?: Record<string, unknown>, force?: boolean) {
    const task = await this.taskRepository.findOrFail(taskId)
    if (!force && (task.status === 'queued' || task.status === 'running')) {
      throw new Exception('任务正在执行，不能发起重试', { status: 422, code: 'E_TASK_BUSY' })
    }

    const nextInputs = preserveImageProxies(inputs ?? task.inputs, task.variables)
    await this.updateTask(task, {
      status: 'queued',
      requiresManualAction: false,
      inputs: nextInputs,
      variables: buildInitialVariables(task.appSnapshot.variables, nextInputs),
      outputs: {},
      nodeRuns: [],
      waitingNodeId: null,
      error: null,
      startedAt: null,
      completedAt: null,
    })
    this.enqueue(task.id)
    return task
  }

  async updateTaskInputs(taskId: number, inputs: Record<string, unknown>) {
    const task = await this.taskRepository.findOrFail(taskId)
    if (task.status === 'queued' || task.status === 'running') {
      throw new Exception('任务正在执行，不能编辑参数', { status: 422, code: 'E_TASK_BUSY' })
    }

    const nextVariables = mergeUserInputVariables(
      task.appSnapshot.variables,
      task.variables,
      inputs
    )

    await this.updateTask(task, {
      inputs,
      variables: nextVariables,
    })
    return task
  }

  async syncSnapshot(taskId: number, force?: boolean) {
    const task = await this.taskRepository.findOrFail(taskId)
    if (!force && (task.status === 'queued' || task.status === 'running')) {
      throw new Exception('任务正在执行，不能同步快照', { status: 422, code: 'E_TASK_BUSY' })
    }

    const app = await this.appRepository.findOrFail(task.appId)
    const nextSnapshot = {
      id: app.id,
      name: app.name,
      variables: app.variables,
      graph: app.graph,
    }
    const changedNodeIds = collectChangedSnapshotNodeIds(
      task.appSnapshot.graph.nodes,
      task.appSnapshot.graph.edges,
      nextSnapshot.graph.nodes,
      nextSnapshot.graph.edges
    )
    const nextVariables = mergeSnapshotVariables(nextSnapshot.variables, task.variables, task.inputs)
    for (const nodeId of await this.collectChangedWorkflowInputNodeIds(
      nextSnapshot,
      task.nodeRuns,
      nextVariables
    )) {
      changedNodeIds.add(nodeId)
    }
    const resetNodeIds = collectResetNodeIds(nextSnapshot.graph.nodes, nextSnapshot.graph.edges, changedNodeIds)
    const nextNodeIds = new Set(nextSnapshot.graph.nodes.map((node) => node.id))

    task.nodeRuns = task.nodeRuns.filter(
      (nodeRun) => nextNodeIds.has(nodeRun.nodeId) && !resetNodeIds.has(nodeRun.nodeId)
    )
    const nextOutputs = filterOutputsForSnapshot(nextSnapshot.variables, task.outputs)

    const waitingNode = task.nodeRuns.find((nodeRun) => nodeRun.status === 'waiting')
    await this.updateTask(task, {
      status: waitingNode ? 'waiting' : 'failed',
      requiresManualAction: waitingNode ? isManualGateNode(nextSnapshot.graph.nodes, waitingNode.nodeId) : false,
      appSnapshot: nextSnapshot,
      variables: nextVariables,
      outputs: nextOutputs,
      nodeRuns: task.nodeRuns,
      waitingNodeId: waitingNode?.nodeId ?? null,
      error: waitingNode ? null : '任务快照已同步，请重试变更节点或整个任务',
      completedAt: null,
    })
    return task
  }

  async repairLogic(taskId: number) {
    const task = await this.taskRepository.findOrFail(taskId)
    if (task.status === 'queued' || task.status === 'running') {
      throw new Exception('任务正在执行，不能修复逻辑', { status: 422, code: 'E_TASK_BUSY' })
    }

    rebuildConditionalSkips(task)
    const unsafeWorkflowNodeIds = task.appSnapshot.graph.nodes
      .filter((node) => node.type === 'workflow_run')
      .filter((node) => {
        const status = nodeRunStatus(task, node.id)
        return status !== 'completed' && status !== 'skipped'
      })
      .map((node) => node.id)

    if (unsafeWorkflowNodeIds.length > 0) {
      throw new Exception('任务包含未完成的工作流节点，不能在不重跑工作流的前提下修复逻辑', {
        status: 422,
        code: 'E_TASK_REPAIR_WORKFLOW_RERUN_RISK',
      })
    }

    const waitingNode = task.nodeRuns.find((nodeRun) => nodeRun.status === 'waiting')
    await this.updateTask(task, {
      status: 'queued',
      requiresManualAction: false,
      waitingNodeId: waitingNode?.nodeId ?? null,
      error: null,
      nodeRuns: task.nodeRuns,
      completedAt: null,
    })
    this.enqueue(task.id)
    return task
  }

  async deleteTask(taskId: number, options: { force?: boolean } = {}) {
    const task = await this.taskRepository.findOrFail(taskId)
    if (!options.force && (task.status === 'queued' || task.status === 'running')) {
      throw new Exception('任务正在执行，不能删除', { status: 422, code: 'E_TASK_BUSY' })
    }

    const mediaHashes = collectMediaHashes([task.inputs, task.variables, task.outputs, task.nodeRuns])
    await this.deleteTaskRecord(task)
    await this.mediaAssetService.deleteOrphanedByHashes(mediaHashes)
  }

  private async createTask(payload: Parameters<AppTaskRepository['create']>[0]) {
    const task = await this.taskRepository.create(payload)
    TaskRealtimeService.broadcastTaskCreated(task)
    return task
  }

  private async updateTask(task: AppTask, payload: Parameters<AppTaskRepository['update']>[1]) {
    const updated = await this.taskRepository.update(task, payload)
    TaskRealtimeService.broadcastTaskUpdated(updated)
    return updated
  }

  private async deleteTaskRecord(task: AppTask) {
    const taskId = task.id
    const taskGroupId = task.taskGroupId
    await this.taskRepository.delete(task)
    TaskRealtimeService.broadcastTaskDeleted(taskId, taskGroupId)
  }

  private enqueue(taskId: number) {
    AppTaskService.pendingTasks.set(taskId, { taskId, service: this })
    AppTaskService.scheduleDrain()
  }

  private static scheduleDrain() {
    if (AppTaskService.isDraining) return
    AppTaskService.isDraining = true
    queueMicrotask(() => {
      AppTaskService.isDraining = false
      AppTaskService.drain()
    })
  }

  private static drain() {
    const concurrency = readConcurrency('APP_TASK_CONCURRENCY', 4)
    while (AppTaskService.runningTaskIds.size < concurrency) {
      const pendingEntry = [...AppTaskService.pendingTasks.entries()].find(
        ([taskId]) => !AppTaskService.runningTaskIds.has(taskId)
      )
      if (!pendingEntry) return

      const [taskId, pendingTask] = pendingEntry
      AppTaskService.pendingTasks.delete(taskId)
      AppTaskService.runningTaskIds.add(taskId)

      void pendingTask.service
        .execute(taskId)
        .catch(() => {
          // execute persists task failure when possible; keep the in-memory scheduler alive.
        })
        .finally(() => {
          AppTaskService.runningTaskIds.delete(taskId)
          AppTaskService.drain()
        })
    }
  }

  private async execute(taskId: number) {
    const task = await this.taskRepository.findOrFail(taskId)
    if (task.status !== 'queued') return

    await this.updateTask(task, {
      status: 'running',
      requiresManualAction: false,
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
      await this.updateTask(task, {
        status: 'failed',
        requiresManualAction: false,
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
    const parents = buildParentMap(task.appSnapshot.graph.edges)
    for (const node of orderedNodes) {
      const status = nodeRunStatus(task, node.id)
      if (status === 'completed' || status === 'waiting' || status === 'skipped') continue

      if (!areParentsCompleted(task, node.id, parents)) continue

      if (node.type === 'wait_for_previous') {
        markWaitForPreviousNode(task, node.id, parents)
        await this.persistProgress(task)
        continue
      }

      if (node.type === 'input_collect') {
        markNodeRun(task, node.id, 'completed')
        await this.persistProgress(task)
        continue
      }

      if (node.type === 'manual_gate') {
        if (task.nodeRuns.some((nodeRun) => nodeRun.status === 'waiting')) continue
        markNodeRun(task, node.id, 'waiting')
        task.waitingNodeId = task.waitingNodeId ?? node.id
        await this.persistProgress(task)
        continue
      }

      if (node.type === 'workflow_run') {
        await this.runWorkflowNode(task, node)
        continue
      }

      if (node.type === 'output_text' || node.type === 'output_image') {
        const varKey = node.data.varKey
        markNodeRun(task, node.id, 'running')
        if (varKey)
          task.outputs[varKey] = mergeOutputValue(
            node.type,
            task.outputs[varKey],
            task.variables[varKey]
          )
        markNodeRun(task, node.id, 'completed', {
          outputs: varKey ? { [varKey]: task.outputs[varKey] } : {},
        })
        await this.persistProgress(task)
        continue
      }

      if (node.type === 'coalesce') {
        markNodeRun(task, node.id, 'running')
        const inputs = node.data.inputs.map((input) =>
          input.varKey ? task.variables[input.varKey] : undefined
        )

        let foundValue: unknown = undefined
        let foundIndex = -1

        for (let i = 0; i < inputs.length; i++) {
          if (inputs[i]) {
            foundValue = inputs[i]
            foundIndex = i
            break
          }
        }

        if (foundIndex < 0) {
          markNodeRun(task, node.id, 'failed', {
            inputs: { inputs },
            error: '所有输入都为空值',
          })
          throw new Exception('取非空值节点：所有输入都为空值', { status: 422 })
        }

        if (node.data.outputValue) {
          task.variables[node.data.outputValue] = foundValue
        }
        if (node.data.outputSourceIndex) {
          task.variables[node.data.outputSourceIndex] = foundIndex
        }

        markNodeRun(task, node.id, 'completed', {
          inputs: { inputs },
          outputs: {
            value: foundValue,
            sourceIndex: foundIndex,
          },
        })
        await this.persistProgress(task)
        continue
      }

      if (node.type === 'conditional') {
        markNodeRun(task, node.id, 'running')
        const conditionValue = node.data.conditionVarKey
          ? task.variables[node.data.conditionVarKey]
          : false
        const conditionMet = resolveConditionValue(conditionValue)

        markNodeRun(task, node.id, 'completed', {
          inputs: { condition: conditionValue },
          outputs: { conditionMet },
        })

        const branchToSkip = conditionMet ? 'false' : 'true'
        const branchToRun = conditionMet ? 'true' : 'false'
        const activeBranchNodeIds = collectBranchNodeIds(
          task.appSnapshot.graph.nodes,
          task.appSnapshot.graph.edges,
          node.id,
          branchToRun
        )
        const edgesToSkip = task.appSnapshot.graph.edges.filter(
          (edge) => edge.source === node.id && edge.sourceHandle === branchToSkip
        )

        const downstreamNodeIds = collectSkippableBranchNodeIds(
          task.appSnapshot.graph.nodes,
          task.appSnapshot.graph.edges,
          edgesToSkip,
          activeBranchNodeIds,
          new Set(
            task.nodeRuns
              .filter((nodeRun) => nodeRun.status === 'skipped')
              .map((nodeRun) => nodeRun.nodeId)
          )
        )

        for (const downstreamId of downstreamNodeIds) {
          const existingRun = task.nodeRuns.find((run) => run.nodeId === downstreamId)
          if (!existingRun) {
            const downstreamNode = task.appSnapshot.graph.nodes.find((n) => n.id === downstreamId)
            if (downstreamNode) {
              task.nodeRuns.push({
                nodeId: downstreamId,
                type: downstreamNode.type,
                status: 'skipped',
              })
            }
          } else if (existingRun.status !== 'completed') {
            existingRun.status = 'skipped'
          }
        }

        await this.persistProgress(task)
        continue
      }

      if (node.type === 'image_compress') {
        await this.runImageCompressNode(task, node)
        continue
      }

      if (node.type === 'image_concat') {
        await this.runImageConcatNode(task, node)
        continue
      }
    }

    const waitingNode = task.nodeRuns.find((nodeRun) => nodeRun.status === 'waiting')
    if (waitingNode) {
      await this.updateTask(task, {
        status: 'waiting',
        requiresManualAction: true,
        waitingNodeId: task.waitingNodeId ?? waitingNode.nodeId,
        variables: task.variables,
        outputs: task.outputs,
        nodeRuns: task.nodeRuns,
      })
      return
    }

    await this.updateTask(task, {
      status: 'completed',
      requiresManualAction: false,
      variables: task.variables,
      outputs: task.outputs,
      nodeRuns: task.nodeRuns,
      completedAt: DateTime.now(),
    })
  }

  private async runWorkflowNode(task: AppTask, node: WorkflowRunNode) {
    if (!node.data.workflowId)
      throw new Exception(`工作流节点 ${node.id} 未选择工作流`, { status: 422 })

    const workflow = await this.workflowRepository.findOrFail(node.data.workflowId)
    const inputs = resolveWorkflowInputs(
      workflow,
      node,
      task.variables,
      this.seedGenerator,
      task.appSnapshot.variables
    )
    markNodeRun(task, node.id, 'running', { inputs })
    await this.persistProgress(task)

    const prompt = await buildWorkflowPrompt(
      workflow,
      inputs,
      task.variables,
      this.mediaAssetService,
      this.seedGenerator
    )
    const workflowOutputs = await this.localizeWorkflowOutputs(
      await AppTaskService.comfyLimiter.run(() => this.comfyService.runWorkflow(prompt, workflow.results))
    )
    for (const [resultKey, varKey] of Object.entries(node.data.outputAssignments ?? {})) {
      if (varKey) task.variables[varKey] = workflowOutputs[resultKey]
    }

    markNodeRun(task, node.id, 'completed', { outputs: workflowOutputs })
    await this.persistProgress(task)
  }

  private async runImageCompressNode(task: AppTask, node: ImageCompressNode) {
    const varKey = node.data.varKey
    markNodeRun(task, node.id, 'running')
    await this.persistProgress(task)

    if (!varKey) {
      markNodeRun(task, node.id, 'completed', { skipped: true, reason: '未选择变量' })
      await this.persistProgress(task)
      return
    }

    const value = task.variables[varKey]
    if (!value) {
      markNodeRun(task, node.id, 'completed', { skipped: true, reason: '变量值为空' })
      await this.persistProgress(task)
      return
    }

    const images = Array.isArray(value) ? value : [value]
    const compressed = []
    let compressedCount = 0

    for (const image of images) {
      if (!image || typeof image !== 'object') {
        compressed.push(image)
        continue
      }

      const imageObj = image as Record<string, unknown>
      if (!imageObj.hash || typeof imageObj.hash !== 'string') {
        compressed.push(image)
        continue
      }

      try {
        const proxy = await this.mediaAssetService.compressToAvif({
          originalHash: imageObj.hash,
          quality: node.data.quality ?? 80,
          resizeMode: node.data.resizeMode ?? 'longest',
          maxSize: node.data.maxSize ?? 2048,
          deleteOriginalFile: node.data.deleteOriginalFile ?? false,
        })

        if (proxy) {
          compressed.push({ ...imageObj, proxy })
          compressedCount++
        } else {
          compressed.push(image)
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : '压缩失败'
        console.warn(`图片压缩失败: ${imageObj.hash}`, message)
        compressed.push(image)
      }
    }

    task.variables[varKey] = Array.isArray(value) ? compressed : compressed[0]
    markNodeRun(task, node.id, 'completed', { compressedCount })
    await this.persistProgress(task)
  }

  private async runImageConcatNode(task: AppTask, node: ImageConcatNode) {
    markNodeRun(task, node.id, 'running')
    await this.persistProgress(task)

    const inputs = node.data.inputs ?? []
    const imageValues = inputs.flatMap((input) => {
      const value = input.varKey ? task.variables[input.varKey] : undefined
      return normalizeImageItems(value)
    })

    if (imageValues.length === 0) {
      markNodeRun(task, node.id, 'failed', { inputs: { inputs }, error: '没有可拼接的图片' })
      throw new Exception('图片拼接节点：没有可拼接的图片', { status: 422 })
    }

    const sourceImages = await Promise.all(
      imageValues.map(async (image) => {
        const localPath = await this.imageLocalPath(image)
        const metadata = await sharp(localPath).metadata()
        if (!metadata.width || !metadata.height) {
          throw new Exception('图片尺寸信息无效', { status: 422 })
        }
        return { localPath, width: metadata.width, height: metadata.height }
      })
    )

    const base = sourceImages[0]
    const horizontal = base.height >= base.width
    const resizedImages = await Promise.all(
      sourceImages.map(async (image, index) => {
        if (index === 0) return { input: image.localPath, width: image.width, height: image.height }

        const buffer = await (horizontal
          ? sharp(image.localPath).resize({ height: base.height, withoutEnlargement: false }).png().toBuffer()
          : sharp(image.localPath).resize({ width: base.width, withoutEnlargement: false }).png().toBuffer())
        const metadata = await sharp(buffer).metadata()
        if (!metadata.width || !metadata.height) {
          throw new Exception('图片缩放失败', { status: 422 })
        }
        return { input: buffer, width: metadata.width, height: metadata.height }
      })
    )

    const outputWidth = horizontal
      ? resizedImages.reduce((sum, image) => sum + image.width, 0)
      : base.width
    const outputHeight = horizontal
      ? base.height
      : resizedImages.reduce((sum, image) => sum + image.height, 0)

    let offset = 0
    const composite = resizedImages.map((image) => {
      const currentOffset = offset
      offset += horizontal ? image.width : image.height
      return {
        input: image.input,
        left: horizontal ? currentOffset : 0,
        top: horizontal ? 0 : currentOffset,
      }
    })

    const buffer = await sharp({
      create: {
        width: outputWidth,
        height: outputHeight,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite(composite)
      .png()
      .toBuffer()

    const image = await this.mediaAssetService.saveGeneratedImage({
      buffer,
      originalName: `concat-${node.id}.png`,
      mimeType: 'image/png',
    })

    if (node.data.outputValue) task.variables[node.data.outputValue] = image
    markNodeRun(task, node.id, 'completed', {
      inputs: { imageCount: imageValues.length, direction: horizontal ? 'horizontal' : 'vertical' },
      outputs: node.data.outputValue ? { [node.data.outputValue]: image } : { image },
    })
    await this.persistProgress(task)
  }

  private async imageLocalPath(image: Record<string, unknown>) {
    const hashes = collectImageHashes(image)
    for (const hash of hashes) {
      const localPath = await this.mediaAssetService.existingLocalPathForHash(hash)
      if (localPath) return localPath
    }
    throw new Exception('图片缺少可用的本地文件，无法拼接', { status: 422 })
  }

  private async localizeWorkflowOutputs(outputs: Record<string, unknown>) {
    const localized: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(outputs)) {
      localized[key] = await this.localizeOutputValue(value)
    }
    return localized
  }

  private async localizeOutputValue(value: unknown): Promise<unknown> {
    if (Array.isArray(value))
      return Promise.all(value.map((item) => this.localizeOutputValue(item)))
    if (!isComfyImageReference(value)) return value
    return this.mediaAssetService.saveComfyImage(value)
  }

  private async persistProgress(task: AppTask) {
    await this.updateTask(task, {
      variables: task.variables,
      outputs: task.outputs,
      nodeRuns: task.nodeRuns,
      waitingNodeId: task.waitingNodeId,
    })
  }

  private async collectChangedWorkflowInputNodeIds(
    snapshot: AppTask['appSnapshot'],
    nodeRuns: AppTaskNodeRun[],
    variables: Record<string, unknown>
  ) {
    const changed = new Set<string>()
    const completedRuns = new Map(
      nodeRuns
        .filter((nodeRun) => nodeRun.status === 'completed' && nodeRun.type === 'workflow_run')
        .map((nodeRun) => [nodeRun.nodeId, nodeRun])
    )

    for (const node of snapshot.graph.nodes) {
      if (node.type !== 'workflow_run' || !node.data.workflowId) continue
      const nodeRun = completedRuns.get(node.id)
      if (!nodeRun) continue

      const workflow = await this.workflowRepository.findOrFail(node.data.workflowId)
      const nextInputs = resolveWorkflowInputs(workflow, node, variables, () => 0, snapshot.variables)
      if (workflowInputsChanged(workflow, nodeRun.inputs ?? {}, nextInputs)) changed.add(node.id)
    }

    return changed
  }
}

function buildInitialVariables(
  variables: AppTask['appSnapshot']['variables'],
  inputs: Record<string, unknown>
) {
  const result: Record<string, unknown> = {}
  for (const variable of variables) {
    if (variable.source === 'user_input') {
      const value = inputs[variable.key] ?? variable.default
      if (variable.required && isEmptyValue(value)) {
        throw new Exception(`应用输入 $${variable.key} 不能为空`, {
          status: 422,
          code: 'E_INVALID_APP_INPUTS',
        })
      }
      result[variable.key] = value
      continue
    }

    if (variable.default !== undefined) result[variable.key] = variable.default
  }
  return result
}

function mergeUserInputVariables(
  variables: AppTask['appSnapshot']['variables'],
  currentVariables: Record<string, unknown>,
  inputs: Record<string, unknown>
) {
  const nextVariables = { ...currentVariables }
  const nextInitialVariables = buildInitialVariables(variables, inputs)
  for (const variable of variables) {
    if (variable.source === 'user_input') nextVariables[variable.key] = nextInitialVariables[variable.key]
  }
  return nextVariables
}

function preserveImageProxies(
  inputs: Record<string, unknown>,
  currentVariables: Record<string, unknown>
) {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(inputs)) {
    result[key] = attachImageProxy(value, currentVariables[key])
  }
  return result
}

function attachImageProxy(value: unknown, currentValue: unknown): unknown {
  if (Array.isArray(value)) {
    const currentItems = Array.isArray(currentValue) ? currentValue : []
    return value.map((item, index) => attachImageProxy(item, currentItems[index]))
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value

  const image = value as Record<string, unknown>
  if (image.proxy) return image

  const currentImage =
    currentValue && typeof currentValue === 'object' && !Array.isArray(currentValue)
      ? (currentValue as Record<string, unknown>)
      : null
  if (!currentImage?.proxy) return image
  if (typeof image.hash === 'string' && currentImage.hash !== image.hash) return image

  return { ...image, proxy: currentImage.proxy }
}

function collectMediaHashes(values: unknown[]) {
  const hashes = new Set<string>()
  for (const value of values) collectMediaHashesFromValue(value, hashes)
  return [...hashes]
}

function collectMediaHashesFromValue(value: unknown, hashes: Set<string>) {
  if (!value) return
  if (Array.isArray(value)) {
    for (const item of value) collectMediaHashesFromValue(item, hashes)
    return
  }
  if (typeof value !== 'object') return

  const record = value as Record<string, unknown>
  if (typeof record.hash === 'string') hashes.add(record.hash)
  for (const nested of Object.values(record)) collectMediaHashesFromValue(nested, hashes)
}

function normalizeImageItems(value: unknown): Record<string, unknown>[] {
  const items = Array.isArray(value) ? value : value ? [value] : []
  const images: Record<string, unknown>[] = []
  for (const item of items) {
    if (Array.isArray(item)) {
      images.push(...normalizeImageItems(item))
    } else if (item && typeof item === 'object') {
      images.push(item as Record<string, unknown>)
    }
  }
  return images
}

function collectImageHashes(image: Record<string, unknown>) {
  const hashes: string[] = []
  if (typeof image.hash === 'string') hashes.push(image.hash)
  const proxy = image.proxy
  if (proxy && typeof proxy === 'object' && !Array.isArray(proxy)) {
    const proxyImage = proxy as Record<string, unknown>
    if (typeof proxyImage.hash === 'string') hashes.push(proxyImage.hash)
  }
  return hashes
}

function resolveWorkflowInputs(
  workflow: Workflow,
  node: WorkflowRunNode,
  variables: Record<string, unknown>,
  seedGenerator: SeedGenerator,
  appVariables: AppTask['appSnapshot']['variables'] = []
) {
  const inputs: Record<string, unknown> = {}
  for (const parameter of workflow.parameters) {
    if (parameter.type === 'SEED') {
      inputs[parameter.key] = seedGenerator()
      continue
    }

    const binding = node.data.inputBindings?.[parameter.key] ?? inferImplicitImageBinding(parameter, appVariables)
    inputs[parameter.key] = resolveBinding(binding, variables, parameter.default)
  }
  return inputs
}

function inferImplicitImageBinding(
  parameter: Workflow['parameters'][number],
  appVariables: AppTask['appSnapshot']['variables']
): VariableBinding | undefined {
  if (parameter.type !== 'IMAGE') return undefined

  const parameterNames = new Set([
    normalizePlaceholderName(parameter.key),
    normalizePlaceholderName(parameter.name),
  ])
  const matches = appVariables.filter(
    (variable) =>
      variable.source === 'user_input' &&
      variable.type === 'IMAGE' &&
      (parameterNames.has(normalizePlaceholderName(variable.key)) ||
        parameterNames.has(normalizePlaceholderName(variable.name)))
  )

  return matches.length === 1 ? { kind: 'variable', varKey: matches[0].key } : undefined
}

function workflowInputsChanged(
  workflow: Workflow,
  previousInputs: Record<string, unknown>,
  nextInputs: Record<string, unknown>
) {
  const seedKeys = new Set(
    workflow.parameters.filter((parameter) => parameter.type === 'SEED').map((parameter) => parameter.key)
  )
  const inputKeys = new Set(workflow.parameters.map((parameter) => parameter.key))

  for (const parameter of workflow.parameters) {
    if (parameter.type === 'SEED') continue
    if (stableJson(previousInputs[parameter.key]) !== stableJson(nextInputs[parameter.key])) return true
  }

  for (const key of Object.keys(previousInputs)) {
    if (!seedKeys.has(key) && !inputKeys.has(key)) return true
  }
  for (const key of Object.keys(nextInputs)) {
    if (!seedKeys.has(key) && !inputKeys.has(key)) return true
  }

  return false
}

function randomSeed() {
  return randomInt(0, 2 ** 32)
}

function resolveBinding(
  binding: VariableBinding | undefined,
  variables: Record<string, unknown>,
  fallback: unknown
) {
  if (!binding) return fallback
  if (binding.kind === 'literal') return binding.literal
  return binding.varKey ? variables[binding.varKey] : fallback
}

async function buildWorkflowPrompt(
  workflow: Workflow,
  inputs: Record<string, unknown>,
  variables: Record<string, unknown>,
  mediaAssetService: MediaAssetService,
  seedGenerator: SeedGenerator
) {
  const prompt = normalizeComfyApiJson(workflow.rawJson)
  randomizePromptSeedInputs(prompt, workflow, seedGenerator)
  
  // 收集需要扩展的 LORA_LIST 节点
  const loraExpansions: Array<{
    nodeId: string
    classType: string
    loraList: LoraItem[]
    hasClip: boolean
  }> = []
  
  for (const parameter of workflow.parameters) {
    const rawNode = prompt[parameter.nodeId]
    if (!isPromptNode(rawNode)) continue
    
    // 检查是否是 LORA_LIST 参数
    if (parameter.type === 'LORA_LIST' && parameter.field === 'lora_list') {
      const loraList = inputs[parameter.key]
      if (Array.isArray(loraList) && loraList.length > 0) {
        loraExpansions.push({
          nodeId: parameter.nodeId,
          classType: rawNode.class_type,
          loraList: loraList as LoraItem[],
          hasClip: rawNode.class_type === 'LoraLoader',
        })
      } else if (Array.isArray(loraList) && loraList.length === 0) {
        bypassLoraNode(prompt, parameter.nodeId, rawNode.class_type === 'LoraLoader')
      }
      continue
    }
    
    // 普通参数处理
    rawNode.inputs[parameter.field] = await normalizePromptInput(
      parameter.type,
      inputs[parameter.key],
      mediaAssetService
    )
  }
  injectPromptPlaceholders(prompt, workflow, inputs, variables)
  
  // 执行 Lora 节点扩展
  for (const expansion of loraExpansions) {
    expandLoraNode(prompt, expansion)
  }
  
  return prompt
}

function randomizePromptSeedInputs(
  prompt: Record<string, any>,
  workflow: Workflow,
  seedGenerator: SeedGenerator
) {
  const exposedSeedFields = new Set(
    workflow.parameters
      .filter((parameter) => parameter.type === 'SEED')
      .map((parameter) => `${parameter.nodeId}:${parameter.field}`)
  )

  for (const [nodeId, node] of Object.entries(prompt)) {
    if (!isPromptNode(node)) continue
    const definition = getNodeDefinition(node.class_type)
    if (!definition) continue

    for (const [field, input] of Object.entries(definition.inputs)) {
      if (input.type !== 'SEED') continue
      if (!(field in node.inputs)) continue
      if (exposedSeedFields.has(`${nodeId}:${field}`)) continue
      node.inputs[field] = seedGenerator()
    }
  }
}

function bypassLoraNode(prompt: Record<string, any>, nodeId: string, hasClip: boolean) {
  const originalNode = prompt[nodeId]
  if (!isPromptNode(originalNode)) return

  const replacements = new Map<number, unknown>([[0, originalNode.inputs.model]])
  if (hasClip) replacements.set(1, originalNode.inputs.clip)

  for (const [otherNodeId, otherNode] of Object.entries(prompt)) {
    if (otherNodeId === nodeId || !isPromptNode(otherNode)) continue
    for (const [inputKey, inputValue] of Object.entries(otherNode.inputs)) {
      if (!Array.isArray(inputValue) || inputValue[0] !== nodeId) continue
      const replacement = replacements.get(Number(inputValue[1]))
      if (replacement !== undefined) otherNode.inputs[inputKey] = replacement
    }
  }

  delete prompt[nodeId]
}

function injectPromptPlaceholders(
  prompt: Record<string, any>,
  workflow: Workflow,
  inputs: Record<string, unknown>,
  variables: Record<string, unknown>
) {
  for (const node of Object.values(prompt)) {
    if (!isPromptNode(node)) continue
    for (const [field, value] of Object.entries(node.inputs)) {
      if (typeof value !== 'string') continue
      node.inputs[field] = replacePromptPlaceholders(value, workflow, inputs, variables)
    }
  }
}

function replacePromptPlaceholders(
  value: string,
  workflow: Workflow,
  inputs: Record<string, unknown>,
  variables: Record<string, unknown>
) {
  const exactMatch = value.match(/^__([^_][\p{L}\p{N}_ -]*?)__$/u)
  if (exactMatch) {
    const replacement = resolvePlaceholderValue(exactMatch[1], workflow, inputs, variables)
    return replacement === undefined ? value : replacement
  }

  return value.replace(/__([^_][\p{L}\p{N}_ -]*?)__/gu, (placeholder, token) => {
    const replacement = resolvePlaceholderValue(token, workflow, inputs, variables)
    return replacement === undefined ? placeholder : String(replacement)
  })
}

function resolvePlaceholderValue(
  token: string,
  workflow: Workflow,
  inputs: Record<string, unknown>,
  variables: Record<string, unknown>
) {
  const names = placeholderAliases(token)
  const parameterByKey = new Map(workflow.parameters.map((parameter) => [parameter.key, parameter]))

  for (const [key, value] of Object.entries(inputs)) {
    const parameter = parameterByKey.get(key)
    if (
      !isUnresolvedPlaceholderValue(value) &&
      (names.has(normalizePlaceholderName(key)) ||
        (parameter &&
          (names.has(normalizePlaceholderName(parameter.name)) ||
            names.has(normalizePlaceholderName(parameter.field)))))
    ) {
      return value
    }
  }

  for (const [key, value] of Object.entries(variables)) {
    if (names.has(normalizePlaceholderName(key))) return value
  }
}

function isUnresolvedPlaceholderValue(value: unknown) {
  return typeof value === 'string' && /^__([^_][\p{L}\p{N}_ -]*?)__$/u.test(value)
}

function placeholderAliases(token: string) {
  const normalized = normalizePlaceholderName(token)
  const aliases = new Set([normalized])
  if (normalized === 'prompt') {
    aliases.add(normalizePlaceholderName('提示词'))
    aliases.add(normalizePlaceholderName('正向提示词'))
  }
  return aliases
}

function normalizePlaceholderName(value: string) {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, '')
}

function expandLoraNode(
  prompt: Record<string, any>,
  expansion: {
    nodeId: string
    classType: string
    loraList: LoraItem[]
    hasClip: boolean
  }
) {
  const originalNode = prompt[expansion.nodeId]
  if (!isPromptNode(originalNode)) return
  
  const { nodeId, classType, loraList, hasClip } = expansion
  
  // 保存原始上游连接
  const originalModelInput = originalNode.inputs.model
  const originalClipInput = hasClip ? originalNode.inputs.clip : undefined
  
  // 为每个 lora 创建一个新节点，按照串联方式连接
  let currentModelOutput = originalModelInput
  let currentClipOutput = originalClipInput
  
  for (let i = 0; i < loraList.length; i++) {
    const lora = loraList[i]
    const newNodeId = i === 0 ? nodeId : `${nodeId}_lora_${i}`
    
    if (hasClip) {
      // LoraLoader 节点
      prompt[newNodeId] = {
        class_type: classType,
        inputs: {
          model: currentModelOutput,
          clip: currentClipOutput,
          lora_name: lora.name,
          strength_model: resolveLoraStrengthModel(lora, hasClip),
          strength_clip: resolveLoraStrengthClip(lora),
        },
      }
      currentModelOutput = [newNodeId, 0]
      currentClipOutput = [newNodeId, 1]
    } else {
      // LoraLoaderModelOnly 节点
      prompt[newNodeId] = {
        class_type: classType,
        inputs: {
          model: currentModelOutput,
          lora_name: lora.name,
          strength_model: resolveLoraStrengthModel(lora, hasClip),
        },
      }
      currentModelOutput = [newNodeId, 0]
    }
  }
  
  // 更新所有引用原始节点输出的其他节点
  for (const [otherNodeId, otherNode] of Object.entries(prompt)) {
    if (!isPromptNode(otherNode)) continue
    if (otherNodeId === nodeId || otherNodeId.startsWith(`${nodeId}_lora_`)) continue
    
    for (const [inputKey, inputValue] of Object.entries(otherNode.inputs)) {
      if (Array.isArray(inputValue) && inputValue[0] === nodeId) {
        // 替换为最后一个 lora 节点的输出
        const lastNodeId = loraList.length > 1 ? `${nodeId}_lora_${loraList.length - 1}` : nodeId
        otherNode.inputs[inputKey] = [lastNodeId, inputValue[1]]
      }
    }
  }
}

function resolveLoraStrengthModel(lora: LoraItem, hasClip: boolean) {
  if (!hasClip && lora.strength_model === 1 && isFiniteNumber(lora.strength_clip) && lora.strength_clip !== 1) {
    return lora.strength_clip
  }
  return isFiniteNumber(lora.strength_model) ? lora.strength_model : 1.0
}

function resolveLoraStrengthClip(lora: LoraItem) {
  return isFiniteNumber(lora.strength_clip) ? lora.strength_clip : 1.0
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

async function normalizePromptInput(
  type: string,
  value: unknown,
  mediaAssetService: MediaAssetService
): Promise<unknown> {
  if (type === 'INT') return normalizeIntInput(value)
  if (type === 'FLOAT') return normalizeFloatInput(value)
  if (type === 'BOOL') return normalizeBoolInput(value)
  if (type === 'STRING') return value == null ? '' : String(value)
  if (type !== 'IMAGE') return value
  if (Array.isArray(value)) return normalizePromptInput(type, value[0], mediaAssetService)
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value
  const image = value as Record<string, unknown>
  const promptImage = await resolvePromptImage(image, mediaAssetService)
  if (typeof promptImage.filename !== 'string') {
    return typeof promptImage.name === 'string' ? promptImage.name : value
  }

  const subfolder =
    typeof promptImage.subfolder === 'string' ? promptImage.subfolder.replace(/^\/+|\/+$/g, '') : ''
  const filePath = subfolder ? `${subfolder}/${promptImage.filename}` : promptImage.filename
  const imageType = typeof promptImage.type === 'string' ? promptImage.type : 'input'
  return imageType === 'input' ? filePath : `${filePath} [${imageType}]`
}

function normalizeIntInput(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value)
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseInt(value, 10)
    if (Number.isFinite(parsed)) return parsed
  }
  return value
}

function normalizeFloatInput(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseFloat(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return value
}

function normalizeBoolInput(value: unknown) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') return value === 'true'
  return Boolean(value)
}

async function resolvePromptImage(
  image: Record<string, unknown>,
  mediaAssetService: MediaAssetService
) {
  const proxyImage = imageProxy(image)
  if (typeof image.hash === 'string') {
    const localPath = await mediaAssetService.existingLocalPathForHash(image.hash)
    if (localPath) {
      return typeof image.filename === 'string'
        ? image
        : mediaAssetService.ensureComfyUpload(image.hash)
    }

    if (proxyImage) return resolvePromptImage(proxyImage, mediaAssetService)
    if (typeof image.filename === 'string') return image
    return mediaAssetService.ensureComfyUpload(image.hash)
  }

  if (typeof image.filename === 'string') return image
  if (proxyImage) return resolvePromptImage(proxyImage, mediaAssetService)
  return image
}

function imageProxy(image: Record<string, unknown>) {
  const proxy = image.proxy
  if (!proxy || typeof proxy !== 'object' || Array.isArray(proxy)) return null
  return proxy as Record<string, unknown>
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

function buildParentMap(edges: { source: string; target: string }[]) {
  const parents = new Map<string, string[]>()
  for (const edge of edges) {
    parents.set(edge.target, [...(parents.get(edge.target) ?? []), edge.source])
  }
  return parents
}

function areParentsCompleted(task: AppTask, nodeId: string, parents: Map<string, string[]>) {
  return (parents.get(nodeId) ?? []).every((parentId) => {
    const status = nodeRunStatus(task, parentId)
    return status === 'completed' || status === 'skipped'
  })
}

function markWaitForPreviousNode(task: AppTask, nodeId: string, parents: Map<string, string[]>) {
  const parentIds = parents.get(nodeId) ?? []
  const arrivedParentIds = parentIds.filter((parentId) => {
    const status = nodeRunStatus(task, parentId)
    return status === 'completed' || status === 'skipped'
  })

  markNodeRun(task, nodeId, 'completed', {
    inputs: {
      arrivedParentIds,
      arrivedCount: arrivedParentIds.length,
      expectedCount: parentIds.length,
    },
    outputs: {
      canContinue: arrivedParentIds.length === parentIds.length,
    },
  })
}

function isManualGateNode(nodes: AppGraphNode[], nodeId: string) {
  return nodes.some((node) => node.id === nodeId && node.type === 'manual_gate')
}

function collectDownstreamNodeIds(
  nodes: AppGraphNode[],
  edges: { source: string; target: string }[],
  nodeId: string
) {
  const nodeIds = new Set(nodes.map((node) => node.id))
  const outgoing = new Map<string, string[]>()
  for (const edge of edges)
    outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge.target])

  const result = new Set<string>()
  const queue = [nodeId]
  while (queue.length > 0) {
    const current = queue.shift()!
    if (!nodeIds.has(current) || result.has(current)) continue
    result.add(current)
    queue.push(...(outgoing.get(current) ?? []))
  }
  return result
}

function collectBranchNodeIds(
  nodes: AppGraphNode[],
  edges: { source: string; target: string; sourceHandle?: string }[],
  nodeId: string,
  sourceHandle: string
) {
  const result = new Set<string>()
  const branchEdges = edges.filter(
    (edge) => edge.source === nodeId && edge.sourceHandle === sourceHandle
  )
  for (const edge of branchEdges) {
    for (const downstreamId of collectDownstreamNodeIds(nodes, edges, edge.target)) {
      result.add(downstreamId)
    }
  }
  return result
}

function collectSkippableBranchNodeIds(
  nodes: AppGraphNode[],
  edges: { id?: string; source: string; target: string; sourceHandle?: string; targetHandle?: string }[],
  skippedEdges: { id?: string; source: string; target: string; sourceHandle?: string; targetHandle?: string }[],
  protectedNodeIds: Set<string>,
  alreadySkippedNodeIds: Set<string>
) {
  const candidates = new Set<string>()
  for (const edge of skippedEdges) {
    for (const downstreamId of collectDownstreamNodeIds(nodes, edges, edge.target)) {
      if (!protectedNodeIds.has(downstreamId)) candidates.add(downstreamId)
    }
  }

  const skippedEdgeKeys = new Set(skippedEdges.map(edgeKey))
  const incoming = new Map<string, typeof edges>()
  for (const edge of edges) {
    incoming.set(edge.target, [...(incoming.get(edge.target) ?? []), edge])
  }

  const result = new Set<string>()
  for (const node of topologicalSort(nodes, edges)) {
    if (!candidates.has(node.id)) continue

    const incomingEdges = incoming.get(node.id) ?? []
    const onlySkippedInputs = incomingEdges.every(
      (edge) =>
        skippedEdgeKeys.has(edgeKey(edge)) ||
        result.has(edge.source) ||
        alreadySkippedNodeIds.has(edge.source)
    )
    if (onlySkippedInputs) result.add(node.id)
  }

  return result
}

function rebuildConditionalSkips(task: AppTask) {
  task.nodeRuns = task.nodeRuns.filter((nodeRun) => nodeRun.status !== 'skipped')

  for (const node of topologicalSort(task.appSnapshot.graph.nodes, task.appSnapshot.graph.edges)) {
    if (node.type !== 'conditional') continue

    const nodeRun = task.nodeRuns.find(
      (item) => item.nodeId === node.id && item.status === 'completed'
    )
    if (!nodeRun) continue

    const conditionMet =
      typeof nodeRun.outputs?.conditionMet === 'boolean'
        ? nodeRun.outputs.conditionMet
        : resolveConditionValue(node.data.conditionVarKey ? task.variables[node.data.conditionVarKey] : false)
    const branchToSkip = conditionMet ? 'false' : 'true'
    const branchToRun = conditionMet ? 'true' : 'false'
    const activeBranchNodeIds = collectBranchNodeIds(
      task.appSnapshot.graph.nodes,
      task.appSnapshot.graph.edges,
      node.id,
      branchToRun
    )
    const edgesToSkip = task.appSnapshot.graph.edges.filter(
      (edge) => edge.source === node.id && edge.sourceHandle === branchToSkip
    )
    const skippedNodeIds = collectSkippableBranchNodeIds(
      task.appSnapshot.graph.nodes,
      task.appSnapshot.graph.edges,
      edgesToSkip,
      activeBranchNodeIds,
      new Set(
        task.nodeRuns.filter((item) => item.status === 'skipped').map((item) => item.nodeId)
      )
    )

    for (const skippedNodeId of skippedNodeIds) {
      const existingRun = task.nodeRuns.find((item) => item.nodeId === skippedNodeId)
      if (!existingRun || existingRun.status !== 'completed') markNodeRun(task, skippedNodeId, 'skipped')
    }
  }
}

function collectChangedSnapshotNodeIds(
  previousNodes: AppGraphNode[],
  previousEdges: { source: string; target: string; sourceHandle?: string; targetHandle?: string }[],
  nextNodes: AppGraphNode[],
  nextEdges: { source: string; target: string; sourceHandle?: string; targetHandle?: string }[]
) {
  const previousNodeById = new Map(previousNodes.map((node) => [node.id, node]))
  const nextNodeById = new Map(nextNodes.map((node) => [node.id, node]))
  const changed = new Set<string>()

  for (const nextNode of nextNodes) {
    const previousNode = previousNodeById.get(nextNode.id)
    if (!previousNode || stableJson(previousNode) !== stableJson(nextNode)) changed.add(nextNode.id)
  }

  for (const previousNode of previousNodes) {
    if (!nextNodeById.has(previousNode.id)) changed.add(previousNode.id)
  }

  for (const edge of changedEdges(previousEdges, nextEdges)) {
    changed.add(edge.source)
    changed.add(edge.target)
  }

  return changed
}

function collectResetNodeIds(
  nodes: AppGraphNode[],
  edges: { source: string; target: string }[],
  changedNodeIds: Set<string>
) {
  const result = new Set<string>()
  for (const nodeId of changedNodeIds) {
    for (const resetNodeId of collectDownstreamNodeIds(nodes, edges, nodeId)) result.add(resetNodeId)
  }
  return result
}

function changedEdges(
  previousEdges: { id?: string; source: string; target: string; sourceHandle?: string; targetHandle?: string }[],
  nextEdges: { id?: string; source: string; target: string; sourceHandle?: string; targetHandle?: string }[]
) {
  const previous = new Map(previousEdges.map((edge) => [edgeKey(edge), stableJson(edge)]))
  const next = new Map(nextEdges.map((edge) => [edgeKey(edge), stableJson(edge)]))
  return [...nextEdges.filter((edge) => previous.get(edgeKey(edge)) !== stableJson(edge)), ...previousEdges.filter((edge) => !next.has(edgeKey(edge)))]
}

function edgeKey(edge: { id?: string; source: string; target: string; sourceHandle?: string; targetHandle?: string }) {
  return edge.id ?? `${edge.source}:${edge.sourceHandle ?? ''}->${edge.target}:${edge.targetHandle ?? ''}`
}

function mergeSnapshotVariables(
  variables: AppTask['appSnapshot']['variables'],
  currentVariables: Record<string, unknown>,
  inputs: Record<string, unknown>
) {
  const variableKeys = new Set(variables.map((variable) => variable.key))
  const nextVariables: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(currentVariables)) {
    if (variableKeys.has(key)) nextVariables[key] = value
  }
  return mergeUserInputVariables(variables, nextVariables, inputs)
}

function filterOutputsForSnapshot(
  variables: AppTask['appSnapshot']['variables'],
  outputs: Record<string, unknown>
) {
  const variableKeys = new Set(variables.map((variable) => variable.key))
  return Object.fromEntries(Object.entries(outputs).filter(([key]) => variableKeys.has(key)))
}

function stableJson(value: unknown) {
  return JSON.stringify(value)
}

function isRetryableNode(node: AppGraphNode) {
  return node.type === 'workflow_run' || node.type === 'image_concat'
}

function mergeOutputValue(nodeType: AppGraphNode['type'], previous: unknown, next: unknown) {
  if (nodeType !== 'output_image') return next
  const previousItems = Array.isArray(previous)
    ? previous
    : previous === undefined || previous === null
      ? []
      : [previous]
  const nextItems = Array.isArray(next) ? next : next === undefined || next === null ? [] : [next]
  return [...previousItems, ...nextItems]
}

function markNodeRun(
  task: AppTask,
  nodeId: string,
  status: AppTaskNodeRun['status'],
  patch: Partial<AppTaskNodeRun> & Record<string, unknown> = {}
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
  if (['completed', 'failed', 'skipped'].includes(status))
    nodeRun.completedAt = new Date().toISOString()
}

function nodeRunStatus(task: AppTask, nodeId: string) {
  return task.nodeRuns.find((item) => item.nodeId === nodeId)?.status
}

function resolveConditionValue(value: unknown) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['', 'false', '0', 'no', 'off'].includes(normalized)) return false
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true
  }
  return Boolean(value)
}

function isPromptNode(value: unknown): value is { class_type: string; inputs: Record<string, unknown> } {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value) && 'inputs' in value)
}

function isComfyImageReference(
  value: unknown
): value is { filename: string; subfolder?: string; type?: string; url: string } {
  return Boolean(
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    typeof (value as Record<string, unknown>).filename === 'string' &&
    typeof (value as Record<string, unknown>).url === 'string'
  )
}

function isEmptyValue(value: unknown) {
  return value === undefined || value === null || value === ''
}

function readConcurrency(name: string, fallback: number) {
  const value = Number.parseInt(process.env[name] ?? '', 10)
  if (!Number.isFinite(value) || value < 1) return fallback
  return value
}
