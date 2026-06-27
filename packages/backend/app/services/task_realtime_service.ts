import type AppTask from '#models/app_task'
import type { AppTaskStatus } from '#models/app_task'
import type { Server as NodeHttpServer, IncomingMessage } from 'node:http'
import type { Server as NodeHttpsServer } from 'node:https'
import type { Duplex } from 'node:stream'
import WebSocket, { WebSocketServer } from 'ws'

type NodeServer = NodeHttpServer | NodeHttpsServer
type TaskRealtimeEvent =
  | { type: 'task.created'; task: unknown }
  | { type: 'task.updated'; task: unknown }
  | { type: 'task.deleted'; taskId: number; taskGroupId: number | null }
  | { type: 'task.progress'; counts: TaskProgressCounts }
  | { type: 'media.thumbnail.ready'; originalHash: string; thumbnail: unknown }

export interface TaskProgressCounts {
  running: number
  waiting: number
  completed: number
}

type TrackedTaskStatus = Extract<AppTaskStatus, 'queued' | 'running' | 'waiting' | 'completed'>

interface TaskRealtimeClient {
  socket: WebSocket
  alive: boolean
}

const WS_PATH = '/api/v1/ws/tasks'
const HEARTBEAT_INTERVAL_MS = 30_000

export default class TaskRealtimeService {
  private static server: WebSocketServer | null = null
  private static clients = new Set<TaskRealtimeClient>()
  private static taskProgressStatuses = new Map<number, TrackedTaskStatus>()
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

    wsServer.on('connection', (socket) => this.handleConnection(socket))
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
    this.broadcast({ type: 'task.created', task: serializeTask(task) })
  }

  static broadcastTaskUpdated(task: AppTask) {
    this.broadcast({ type: 'task.updated', task: serializeTask(task) })
  }

  static broadcastTaskDeleted(taskId: number, taskGroupId: number | null) {
    this.broadcast({ type: 'task.deleted', taskId, taskGroupId })
  }

  static trackTaskProgress(task: AppTask) {
    if (isTrackedTaskStatus(task.status)) {
      this.taskProgressStatuses.set(task.id, task.status)
    } else {
      this.taskProgressStatuses.delete(task.id)
    }

    if (!this.hasActiveTaskProgress()) this.taskProgressStatuses.clear()
    this.broadcastTaskProgress()
  }

  static removeTaskProgress(taskId: number) {
    this.taskProgressStatuses.delete(taskId)
    if (!this.hasActiveTaskProgress()) this.taskProgressStatuses.clear()
    this.broadcastTaskProgress()
  }

  static broadcastMediaThumbnailReady(originalHash: string, thumbnail: unknown) {
    this.broadcast({ type: 'media.thumbnail.ready', originalHash, thumbnail })
  }

  private static handleUpgrade(request: IncomingMessage, socket: Duplex, head: Buffer) {
    if (!this.server) return
    const url = parseRequestUrl(request)
    if (url.pathname !== WS_PATH) return

    this.server.handleUpgrade(request, socket, head, (ws) => {
      this.server?.emit('connection', ws, request)
    })
  }

  private static handleConnection(socket: WebSocket) {
    const client: TaskRealtimeClient = {
      socket,
      alive: true,
    }
    this.clients.add(client)

    socket.on('pong', () => {
      client.alive = true
    })
    socket.on('close', () => this.clients.delete(client))
    socket.on('error', () => this.clients.delete(client))

    sendJson(socket, { type: 'connected' })
    sendJson(socket, { type: 'task.progress', counts: this.taskProgressCounts() })
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

  private static broadcast(event: TaskRealtimeEvent) {
    for (const client of this.clients) {
      sendJson(client.socket, event)
    }
  }

  private static broadcastTaskProgress() {
    this.broadcast({ type: 'task.progress', counts: this.taskProgressCounts() })
  }

  private static taskProgressCounts(): TaskProgressCounts {
    const counts: TaskProgressCounts = { running: 0, waiting: 0, completed: 0 }
    for (const status of this.taskProgressStatuses.values()) {
      if (status === 'queued' || status === 'running') counts.running++
      if (status === 'waiting') counts.waiting++
      if (status === 'completed') counts.completed++
    }
    return counts
  }

  private static hasActiveTaskProgress() {
    for (const status of this.taskProgressStatuses.values()) {
      if (status === 'queued' || status === 'running' || status === 'waiting') return true
    }
    return false
  }
}

function isTrackedTaskStatus(status: AppTaskStatus): status is TrackedTaskStatus {
  return status === 'queued' || status === 'running' || status === 'waiting' || status === 'completed'
}

function parseRequestUrl(request: IncomingMessage) {
  return new URL(request.url ?? '/', 'http://localhost')
}

function sendJson(socket: WebSocket, event: unknown) {
  if (socket.readyState !== WebSocket.OPEN) return
  socket.send(JSON.stringify(event))
}

function serializeTask(task: AppTask) {
  const serializer = (task as unknown as { serialize?: () => unknown }).serialize
  return typeof serializer === 'function' ? serializer.call(task) : task
}
