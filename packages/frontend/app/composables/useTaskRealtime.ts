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

interface TaskSubscription {
  groupId?: number | null
  taskId?: number | null
}

const WS_BASE = 'ws://localhost:3333/api/v1/ws/tasks'
const RECONNECT_DELAY_MS = 1200

export function useTaskRealtime(handlers: TaskRealtimeHandlers = {}) {
  let socket: WebSocket | null = null
  let reconnectTimer: ReturnType<typeof window.setTimeout> | null = null
  let stopped = true
  let subscription: TaskSubscription = {}

  function subscribe(nextSubscription: TaskSubscription) {
    subscription = nextSubscription
    stopped = false
    openSocket()
  }

  function close() {
    stopped = true
    clearReconnectTimer()
    socket?.close()
    socket = null
  }

  function openSocket() {
    clearReconnectTimer()
    socket?.close()
    socket = null

    if (!import.meta.client || (!subscription.groupId && !subscription.taskId)) return

    const params = new URLSearchParams()
    if (subscription.groupId) params.set('groupId', String(subscription.groupId))
    if (subscription.taskId) params.set('taskId', String(subscription.taskId))

    const nextSocket = new WebSocket(`${WS_BASE}?${params.toString()}`)
    socket = nextSocket

    nextSocket.addEventListener('open', () => handlers.onOpen?.())
    nextSocket.addEventListener('message', (event) => handleMessage(event.data))
    nextSocket.addEventListener('close', () => {
      if (socket !== nextSocket) return
      socket = null
      scheduleReconnect()
    })
    nextSocket.addEventListener('error', () => nextSocket.close())
  }

  function scheduleReconnect() {
    if (stopped || reconnectTimer) return
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

  function handleMessage(data: string) {
    const message = parseMessage(data)
    if (!message) return

    if (message.type === 'task.created') handlers.onTaskCreated?.(message.task)
    if (message.type === 'task.updated') handlers.onTaskUpdated?.(message.task)
    if (message.type === 'task.deleted') {
      handlers.onTaskDeleted?.({ taskId: message.taskId, taskGroupId: message.taskGroupId })
    }
  }

  return { subscribe, close }
}

function parseMessage(data: string) {
  try {
    const parsed = JSON.parse(data) as unknown
    return parsed && typeof parsed === 'object' ? (parsed as TaskRealtimeMessage) : null
  } catch {
    return null
  }
}
