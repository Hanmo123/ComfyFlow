export function apiBase() {
  return import.meta.dev ? 'http://localhost:3333/api/v1' : '/api/v1'
}

export function taskRealtimeUrl() {
  if (import.meta.dev) return 'ws://localhost:3333/api/v1/ws/tasks'
  if (!import.meta.client) return ''

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/api/v1/ws/tasks`
}
