import type { AppTaskRecord } from '@/lib/app'

export interface TaskImageItem {
  url: string
  name: string
  hash: string | null
  isStarred: boolean
  nodeId: string
  varKey: string
  imageIndex: number
}

export interface TaskImageGroup {
  nodeId: string
  varKey: string
  images: TaskImageItem[]
}

export function buildTaskImageGroups(task: AppTaskRecord) {
  const imageVariableKeys = new Set(
    task.appSnapshot.variables.filter((variable) => variable.type === 'IMAGE').map((variable) => variable.key),
  )
  const displayedVarKeys = new Set<string>()
  const groups: TaskImageGroup[] = []

  for (const node of task.appSnapshot.graph.nodes) {
    if (node.type !== 'output_image' || !node.data.varKey) continue
    addImageGroup(task, groups, displayedVarKeys, node.id, node.data.varKey)
  }

  for (const node of task.appSnapshot.graph.nodes) {
    if (node.type !== 'manual_gate') continue
    for (const varKey of node.data.displayVars) {
      if (!imageVariableKeys.has(varKey)) continue
      addImageGroup(task, groups, displayedVarKeys, node.id, varKey)
    }
  }

  return groups
}

export function flattenTaskImageGroups(groups: TaskImageGroup[]) {
  return groups.flatMap((group) => group.images)
}

export function findTaskImageIndex(images: TaskImageItem[], nodeId: string, varKey: string, imageIndex: number) {
  return images.findIndex((image) => image.nodeId === nodeId && image.varKey === varKey && image.imageIndex === imageIndex)
}

function addImageGroup(
  task: AppTaskRecord,
  groups: TaskImageGroup[],
  displayedVarKeys: Set<string>,
  nodeId: string,
  varKey: string,
) {
  if (displayedVarKeys.has(varKey)) return
  const images = normalizeImages(task.outputs[varKey] ?? task.variables[varKey], nodeId, varKey)
  if (images.length === 0) return
  groups.push({ nodeId, varKey, images })
  displayedVarKeys.add(varKey)
}

function normalizeImages(value: unknown, nodeId: string, varKey: string): TaskImageItem[] {
  const items = Array.isArray(value) ? value : value ? [value] : []
  return items.flatMap((item, index) => {
    if (Array.isArray(item)) return normalizeImages(item, nodeId, varKey)
    const url = imageUrl(item)
    return url
      ? [
          {
            url,
            name: imageName(item, index),
            hash: imageHash(item),
            isStarred: imageIsStarred(item),
            nodeId,
            varKey,
            imageIndex: index,
          },
        ]
      : []
  })
}

function imageUrl(value: unknown) {
  if (typeof value === 'string') return value
  if (!value || typeof value !== 'object') return ''
  const image = value as Record<string, unknown>
  if (image.proxy && typeof image.proxy === 'object') {
    const proxy = image.proxy as Record<string, unknown>
    if (typeof proxy.localUrl === 'string') return proxy.localUrl
    if (typeof proxy.url === 'string') return proxy.url
  }
  if (typeof image.localUrl === 'string') return image.localUrl
  return typeof image.url === 'string' ? image.url : ''
}

function imageName(value: unknown, index: number) {
  if (!value || typeof value !== 'object') return `图片 ${index + 1}`
  const image = value as Record<string, unknown>
  return String(image.filename ?? image.name ?? `图片 ${index + 1}`)
}

function imageHash(value: unknown) {
  if (!value || typeof value !== 'object') return null
  const image = value as Record<string, unknown>
  return typeof image.hash === 'string' ? image.hash : null
}

function imageIsStarred(value: unknown) {
  if (!value || typeof value !== 'object') return false
  const image = value as Record<string, unknown>
  return image.isStarred === true
}
