import type { AppRecord, AppSavePayload, AppTaskRecord } from '@/lib/app'

const API_BASE = 'http://localhost:3333/api/v1'

export function useAppApi() {
  const listApps = () => $fetch<AppRecord[]>(`${API_BASE}/apps`)

  const createApp = (payload: AppSavePayload) =>
    $fetch<AppRecord>(`${API_BASE}/apps`, {
      method: 'POST',
      body: payload,
    })

  const getApp = (id: number) => $fetch<AppRecord>(`${API_BASE}/apps/${id}`)

  const saveApp = (id: number, payload: AppSavePayload) =>
    $fetch<AppRecord>(`${API_BASE}/apps/${id}`, {
      method: 'PUT',
      body: payload,
    })

  const deleteApp = (id: number) =>
    $fetch<void>(`${API_BASE}/apps/${id}`, {
      method: 'DELETE',
    })

  const runApp = (id: number, inputs: Record<string, unknown>) =>
    $fetch<AppTaskRecord>(`${API_BASE}/apps/${id}/runs`, {
      method: 'POST',
      body: { inputs },
    })

  const getAppTask = (appId: number, taskId: number) => $fetch<AppTaskRecord>(`${API_BASE}/apps/${appId}/runs/${taskId}`)

  const resumeAppTask = (appId: number, taskId: number) =>
    $fetch<AppTaskRecord>(`${API_BASE}/apps/${appId}/runs/${taskId}/resume`, {
      method: 'POST',
    })

  return { listApps, createApp, getApp, saveApp, deleteApp, runApp, getAppTask, resumeAppTask }
}
