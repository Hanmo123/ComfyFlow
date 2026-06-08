import App, { type AppGraph, type AppStatus, type AppVariable } from '#models/app'

export interface CreateAppPayload {
  name: string
  description?: string | null
  status?: AppStatus
  variables?: AppVariable[]
  graph?: AppGraph
}

export interface UpdateAppPayload {
  name?: string
  description?: string | null
  status?: AppStatus
  variables?: AppVariable[]
  graph?: AppGraph
}

export default class AppRepository {
  async list() {
    return App.query().orderBy('updated_at', 'desc')
  }

  async findOrFail(id: number) {
    return App.findOrFail(id)
  }

  async create(payload: CreateAppPayload) {
    return App.create({
      name: payload.name,
      description: payload.description ?? null,
      status: payload.status ?? 'draft',
      variables: payload.variables ?? [],
      graph: payload.graph ?? defaultGraph(),
    })
  }

  async update(app: App, payload: UpdateAppPayload) {
    app.merge(payload)
    await app.save()
    return app
  }

  async delete(app: App) {
    await app.delete()
  }
}

export function defaultGraph(): AppGraph {
  return {
    nodes: [{ id: 'input', type: 'input_collect', position: { x: 0, y: 0 }, data: {} }],
    edges: [],
  }
}
