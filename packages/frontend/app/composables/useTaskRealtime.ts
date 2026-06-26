import type { AppTaskRecord } from '@/lib/app'

type TaskRealtimeMessage =
  | { type: 'connected' }
  | { type: 'task.created'; task: AppTaskRecord }
  | { type: 'task.updated'; task: AppTaskRecord }
  | { type: 'task.deleted'; taskId: number; taskGroupId: number | null }

interface TaskRealtimeHandlers {
  onOpen?: () => void
  onTaskCreated?: (task: AppTaskRecord) => void
  onTaskUpdated?: (task: AppTaskRecord) => void
  onTaskDeleted?: (payload: { taskId: number; taskGroupId: number | null }) => void
}

const WS_BASE = 'ws://localhost:3333/api/v1/ws/tasks'
const RECONNECT_DELAY_MS = 1200
const realtimeHandlers = new Set<TaskRealtimeHandlers>()

let socket: WebSocket | null = null
let reconnectTimer: ReturnType<typeof window.setTimeout> | null = null
let stopped = true

export function useTaskRealtime(handlers: TaskRealtimeHandlers = {}) {
  let registered = false

  function connect() {
    if (!registered) {
      realtimeHandlers.add(handlers)
      registered = true
    }
    stopped = false
    openSocket()
    if (import.meta.client && socket?.readyState === WebSocket.OPEN) handlers.onOpen?.()
  }

  function close() {
    if (registered) {
      realtimeHandlers.delete(handlers)
      registered = false
    }
    if (realtimeHandlers.size > 0) return

    stopSocket()
  }

  return { connect, close }
}

function openSocket() {
  clearReconnectTimer()
  if (!import.meta.client || realtimeHandlers.size === 0) return
  if (socket && [WebSocket.CONNECTING, WebSocket.OPEN].includes(socket.readyState)) return

  const nextSocket = new WebSocket(WS_BASE)
  socket = nextSocket

  nextSocket.addEventListener('open', () => notifyOpen())
  nextSocket.addEventListener('message', (event) => handleMessage(event.data))
  nextSocket.addEventListener('close', () => {
    if (socket !== nextSocket) return
    socket = null
    scheduleReconnect()
  })
  nextSocket.addEventListener('error', () => nextSocket.close())
}

function stopSocket() {
  stopped = true
  clearReconnectTimer()
  socket?.close()
  socket = null
}

function scheduleReconnect() {
  if (stopped || reconnectTimer || realtimeHandlers.size === 0) return
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null
    openSocket()
  }, RECONNECT_DELAY_MS)
}

function clearReconnectTimer() {
  if (!reconnectTimer) return
  window.clearTimeout(reconnectTimer)
  reconnectTimer = null
}

function notifyOpen() {
  for (const handler of [...realtimeHandlers]) handler.onOpen?.()
}

function handleMessage(data: string) {
  const message = parseMessage(data)
  if (!message) return

  for (const handler of [...realtimeHandlers]) {
    if (message.type === 'task.created') handler.onTaskCreated?.(message.task)
    if (message.type === 'task.updated') handler.onTaskUpdated?.(message.task)
    if (message.type === 'task.deleted') {
      handler.onTaskDeleted?.({ taskId: message.taskId, taskGroupId: message.taskGroupId })
    }
  }
}

function parseMessage(data: string) {
  try {
    const parsed = JSON.parse(data) as unknown
    return parsed && typeof parsed === 'object' ? (parsed as TaskRealtimeMessage) : null
  } catch {
    return null
  }
}
