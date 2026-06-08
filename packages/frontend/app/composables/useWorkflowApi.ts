import type {
  WorkflowDetailResponse,
  WorkflowParameter,
  WorkflowResult,
  WorkflowRecord,
} from '@/lib/workflow'

const API_BASE = 'http://localhost:3333/api/v1'

export function useWorkflowApi() {
  const listWorkflows = () => $fetch<WorkflowRecord[]>(`${API_BASE}/workflows`)

  const uploadWorkflow = (rawJson: Record<string, unknown>) =>
    $fetch<WorkflowDetailResponse>(`${API_BASE}/workflows/upload`, {
      method: 'POST',
      body: { rawJson },
    })

  const getWorkflow = (id: number) => $fetch<WorkflowDetailResponse>(`${API_BASE}/workflows/${id}`)

  const saveWorkflow = (
    id: number,
    payload: {
      name: string
      parameters: WorkflowParameter[]
      results: WorkflowResult[]
    }
  ) =>
    $fetch<WorkflowDetailResponse>(`${API_BASE}/workflows/${id}`, {
      method: 'PUT',
      body: { ...payload, status: 'saved' },
    })

  const deleteWorkflow = (id: number) =>
    $fetch<void>(`${API_BASE}/workflows/${id}`, {
      method: 'DELETE',
    })

  return { listWorkflows, uploadWorkflow, getWorkflow, saveWorkflow, deleteWorkflow }
}
