const TASK_GROUP_STORAGE_KEY = 'comfyui-tools:selected-task-group-id'

export function useTaskGroupPreference() {
  const preferredTaskGroupId = useState<number | null>('task-group-preference-id', () => null)

  function loadPreferredTaskGroupId() {
    if (import.meta.server) return preferredTaskGroupId.value

    const storedValue = window.localStorage.getItem(TASK_GROUP_STORAGE_KEY)
    const groupId = Number(storedValue)
    preferredTaskGroupId.value = Number.isFinite(groupId) && groupId > 0 ? groupId : null
    return preferredTaskGroupId.value
  }

  function setPreferredTaskGroupId(groupId: number | null) {
    preferredTaskGroupId.value = groupId && groupId > 0 ? groupId : null
    if (import.meta.server) return

    if (preferredTaskGroupId.value) {
      window.localStorage.setItem(TASK_GROUP_STORAGE_KEY, String(preferredTaskGroupId.value))
    } else {
      window.localStorage.removeItem(TASK_GROUP_STORAGE_KEY)
    }
  }

  return {
    preferredTaskGroupId,
    loadPreferredTaskGroupId,
    setPreferredTaskGroupId,
  }
}
