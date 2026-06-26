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
