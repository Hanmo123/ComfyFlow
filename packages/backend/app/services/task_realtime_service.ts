import type AppTask from '#models/app_task'
import type { Server as NodeHttpServer, IncomingMessage } from 'node:http'
import type { Server as NodeHttpsServer } from 'node:https'
import type { Duplex } from 'node:stream'
import WebSocket, { WebSocketServer } from 'ws'

type NodeServer = NodeHttpServer | NodeHttpsServer
type TaskRealtimeEvent =
  | { type: 'task.created'; task: unknown }
  | { type: 'task.updated'; task: unknown }
  | { type: 'task.deleted'; taskId: number; taskGroupId: number | null }

interface TaskRealtimeClient {
  socket: WebSocket
  taskIds: Set<number>
  groupIds: Set<number>
  alive: boolean
}

const WS_PATH = '/api/v1/ws/tasks'
const HEARTBEAT_INTERVAL_MS = 30_000

export default class TaskRealtimeService {
  private static server: WebSocketServer | null = null
  private static clients = new Set<TaskRealtimeClient>()
  private static heartbeatTimer: NodeJS.Timeout | null = null
  private static upgradeHandler:
    | ((request: IncomingMessage, socket: Duplex, head: Buffer) => void)
    | null = null

  static boot(nodeServer: NodeServer) {
    if (this.server) return

    const wsServer = new WebSocketServer({ noServer: true })
    this.server = wsServer
    this.upgradeHandler = (request, socket, head) => this.handleUpgrade(request, socket, head)
    nodeServer.on('upgrade', this.upgradeHandler)

    wsServer.on('connection', (socket, request) => this.handleConnection(socket, request))
    this.heartbeatTimer = setInterval(() => this.heartbeat(), HEARTBEAT_INTERVAL_MS)
  }

  static shutdown(nodeServer?: NodeServer) {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer)
    this.heartbeatTimer = null

    if (nodeServer && this.upgradeHandler) nodeServer.off('upgrade', this.upgradeHandler)
    this.upgradeHandler = null

    for (const client of this.clients) client.socket.terminate()
    this.clients.clear()
    this.server?.close()
    this.server = null
  }

  static broadcastTaskCreated(task: AppTask) {
    this.broadcastTaskEvent({ type: 'task.created', task: serializeTask(task) }, task)
  }

  static broadcastTaskUpdated(task: AppTask) {
    this.broadcastTaskEvent({ type: 'task.updated', task: serializeTask(task) }, task)
  }

  static broadcastTaskDeleted(taskId: number, taskGroupId: number | null) {
    const event: TaskRealtimeEvent = { type: 'task.deleted', taskId, taskGroupId }
    for (const client of this.clients) {
      if (!clientWatchesTask(client, taskId, taskGroupId)) continue
      sendJson(client.socket, event)
    }
  }

  private static handleUpgrade(request: IncomingMessage, socket: Duplex, head: Buffer) {
    if (!this.server) return
    const url = parseRequestUrl(request)
    if (url.pathname !== WS_PATH) return

    this.server.handleUpgrade(request, socket, head, (ws) => {
      this.server?.emit('connection', ws, request)
    })
  }

  private static handleConnection(socket: WebSocket, request: IncomingMessage) {
    const client: TaskRealtimeClient = {
      socket,
      taskIds: new Set(),
      groupIds: new Set(),
      alive: true,
    }
    applyQuerySubscription(client, parseRequestUrl(request))
    this.clients.add(client)

    socket.on('pong', () => {
      client.alive = true
    })
    socket.on('message', (data) => this.handleMessage(client, data))
    socket.on('close', () => this.clients.delete(client))
    socket.on('error', () => this.clients.delete(client))

    sendJson(socket, { type: 'connected' })
  }

  private static handleMessage(client: TaskRealtimeClient, data: WebSocket.RawData) {
    const message = parseJsonMessage(data)
    if (!message || typeof message !== 'object') return
    if ((message as { type?: unknown }).type !== 'subscribe') return

    client.taskIds.clear()
    client.groupIds.clear()
    addNumericValues(client.taskIds, (message as { taskId?: unknown; taskIds?: unknown }).taskId)
    addNumericValues(client.taskIds, (message as { taskId?: unknown; taskIds?: unknown }).taskIds)
    addNumericValues(
      client.groupIds,
      (message as { groupId?: unknown; groupIds?: unknown }).groupId
    )
    addNumericValues(
      client.groupIds,
      (message as { groupId?: unknown; groupIds?: unknown }).groupIds
    )
  }

  private static heartbeat() {
    for (const client of this.clients) {
      if (!client.alive) {
        client.socket.terminate()
        this.clients.delete(client)
        continue
      }
      client.alive = false
      client.socket.ping()
    }
  }

  private static broadcastTaskEvent(event: TaskRealtimeEvent, task: AppTask) {
    for (const client of this.clients) {
      if (!clientWatchesTask(client, task.id, task.taskGroupId)) continue
      sendJson(client.socket, event)
    }
  }
}

function parseRequestUrl(request: IncomingMessage) {
  return new URL(request.url ?? '/', 'http://localhost')
}

function applyQuerySubscription(client: TaskRealtimeClient, url: URL) {
  addNumericValues(client.taskIds, url.searchParams.getAll('taskId'))
  addNumericValues(client.groupIds, url.searchParams.getAll('groupId'))
}

function addNumericValues(target: Set<number>, value: unknown) {
  const values = Array.isArray(value) ? value : [value]
  for (const item of values) {
    if (item === null || item === undefined || item === '') continue
    const nested = typeof item === 'string' ? item.split(',') : [item]
    for (const candidate of nested) {
      const number = Number(candidate)
      if (Number.isFinite(number) && number > 0) target.add(number)
    }
  }
}

function clientWatchesTask(client: TaskRealtimeClient, taskId: number, taskGroupId: number | null) {
  if (client.taskIds.has(taskId)) return true
  return taskGroupId !== null && client.groupIds.has(taskGroupId)
}

function sendJson(socket: WebSocket, event: unknown) {
  if (socket.readyState !== WebSocket.OPEN) return
  socket.send(JSON.stringify(event))
}

function parseJsonMessage(data: WebSocket.RawData) {
  try {
    const text = Array.isArray(data) ? Buffer.concat(data).toString('utf8') : data.toString()
    return JSON.parse(text)
  } catch {
    return null
  }
}

function serializeTask(task: AppTask) {
  const serializer = (task as unknown as { serialize?: () => unknown }).serialize
  return typeof serializer === 'function' ? serializer.call(task) : task
}
