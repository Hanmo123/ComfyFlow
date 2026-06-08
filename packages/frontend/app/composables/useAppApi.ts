import type { AppRecord, AppSavePayload, AppTaskRecord, TaskGroupRecord } from '@/lib/app'

export interface ComfyUploadedImage {
  id: number
  hash: string
  name: string
  filename: string
  subfolder: string
  type: string
  url: string
  localUrl: string
  originalName: string
  size: number
}

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

  const runApp = (id: number, taskGroupId: number, inputs: Record<string, unknown>) =>
    $fetch<AppTaskRecord>(`${API_BASE}/apps/${id}/runs`, {
      method: 'POST',
      body: { taskGroupId, inputs },
    })

  const listTaskGroups = () => $fetch<TaskGroupRecord[]>(`${API_BASE}/task-groups`)

  const createTaskGroup = (name: string) =>
    $fetch<TaskGroupRecord>(`${API_BASE}/task-groups`, {
      method: 'POST',
      body: { name },
    })

  const listTasks = (groupId?: number) =>
    $fetch<AppTaskRecord[]>(`${API_BASE}/tasks`, {
      query: groupId ? { groupId } : undefined,
    })

  const getTask = (taskId: number) => $fetch<AppTaskRecord>(`${API_BASE}/tasks/${taskId}`)

  const retryTaskNode = (taskId: number, nodeId: string) =>
    $fetch<AppTaskRecord>(`${API_BASE}/tasks/${taskId}/nodes/${nodeId}/retry`, {
      method: 'POST',
    })

  const uploadComfyImage = (file: File) => {
    const formData = new FormData()
    formData.append('image', file)
    return $fetch<ComfyUploadedImage>(`${API_BASE}/comfy/images`, {
      method: 'POST',
      body: formData,
    })
  }

  const getAppTask = (appId: number, taskId: number) => $fetch<AppTaskRecord>(`${API_BASE}/apps/${appId}/runs/${taskId}`)

  const resumeAppTask = (appId: number, taskId: number) =>
    $fetch<AppTaskRecord>(`${API_BASE}/apps/${appId}/runs/${taskId}/resume`, {
      method: 'POST',
    })

  return {
    listApps,
    createApp,
    getApp,
    saveApp,
    deleteApp,
    runApp,
    listTaskGroups,
    createTaskGroup,
    listTasks,
    getTask,
    retryTaskNode,
    uploadComfyImage,
    getAppTask,
    resumeAppTask,
  }
}
