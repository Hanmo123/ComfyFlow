import TaskRealtimeService from '#services/task_realtime_service'
import type { ApplicationService } from '@adonisjs/core/types'
import server from '@adonisjs/core/services/server'

export default class RealtimeProvider {
  private nodeServer: ReturnType<typeof server.getNodeServer> | undefined

  constructor(protected app: ApplicationService) {}

  async ready() {
    this.nodeServer = server.getNodeServer()
    if (this.nodeServer) TaskRealtimeService.boot(this.nodeServer)
  }

  async shutdown() {
    TaskRealtimeService.shutdown(this.nodeServer)
  }
}
