import type { AppRecord, AppSavePayload } from '@/lib/app'

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

  return { listApps, createApp, getApp, saveApp, deleteApp }
}
