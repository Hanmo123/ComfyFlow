import type { AppRecord, AppSavePayload, AppTaskRecord, TaskGroupRecord, AppInputPreset, PresetType } from '@/lib/app'

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
  isStarred: boolean
}

export interface ComfyLoraListResponse {
  items: string[]
  cached: boolean
  fetchedAt: string
  expiresAt: string
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

  const deleteTask = (taskId: number, force = false) =>
    $fetch<void>(`${API_BASE}/tasks/${taskId}`, {
      method: 'DELETE',
      query: force ? { force: true } : undefined,
    })

  const retryTask = (taskId: number, inputs?: Record<string, unknown>) =>
    $fetch<AppTaskRecord>(`${API_BASE}/tasks/${taskId}/retry`, {
      method: 'POST',
      body: inputs === undefined ? undefined : { inputs },
    })

  const retryTaskNode = (taskId: number, nodeId: string) =>
    $fetch<AppTaskRecord>(`${API_BASE}/tasks/${taskId}/nodes/${nodeId}/retry`, {
      method: 'POST',
    })

  const moveTaskToGroup = (taskId: number, taskGroupId: number) =>
    $fetch<AppTaskRecord>(`${API_BASE}/tasks/${taskId}/group`, {
      method: 'PATCH',
      body: { taskGroupId },
    })

  const uploadComfyImage = (file: File) => {
    const formData = new FormData()
    formData.append('image', file)
    return $fetch<ComfyUploadedImage>(`${API_BASE}/comfy/images`, {
      method: 'POST',
      body: formData,
    })
  }

  const listComfyLoras = (refresh = false) =>
    $fetch<ComfyLoraListResponse>(`${API_BASE}/comfy/loras`, {
      query: refresh ? { refresh: true } : undefined,
    })

  const getAppTask = (appId: number, taskId: number) => $fetch<AppTaskRecord>(`${API_BASE}/apps/${appId}/runs/${taskId}`)

  const getLatestAppTask = (appId: number) => $fetch<AppTaskRecord | null>(`${API_BASE}/apps/${appId}/runs/latest`)

  const resumeAppTask = (appId: number, taskId: number) =>
    $fetch<AppTaskRecord>(`${API_BASE}/apps/${appId}/runs/${taskId}/resume`, {
      method: 'POST',
    })

  const listPresets = (appId: number, type?: PresetType) =>
    $fetch<AppInputPreset[]>(`${API_BASE}/apps/${appId}/presets`, {
      query: type ? { type } : undefined,
    })

  const createPreset = (appId: number, name: string, type: PresetType, value: unknown) =>
    $fetch<AppInputPreset>(`${API_BASE}/apps/${appId}/presets`, {
      method: 'POST',
      body: { name, type, value },
    })

  const updatePreset = (appId: number, presetId: number, name?: string, value?: unknown) =>
    $fetch<AppInputPreset>(`${API_BASE}/apps/${appId}/presets/${presetId}`, {
      method: 'PUT',
      body: { name, value },
    })

  const deletePreset = (appId: number, presetId: number) =>
    $fetch<void>(`${API_BASE}/apps/${appId}/presets/${presetId}`, {
      method: 'DELETE',
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
    deleteTask,
    retryTask,
    retryTaskNode,
    moveTaskToGroup,
    uploadComfyImage,
    listComfyLoras,
    getAppTask,
    getLatestAppTask,
    resumeAppTask,
    listPresets,
    createPreset,
    updatePreset,
    deletePreset,
  }
}
