import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'auth.new_account.store': { paramsTuple?: []; params?: {} }
    'auth.access_tokens.store': { paramsTuple?: []; params?: {} }
    'profile.profile.show': { paramsTuple?: []; params?: {} }
    'profile.access_tokens.destroy': { paramsTuple?: []; params?: {} }
    'workflows.workflows.index': { paramsTuple?: []; params?: {} }
    'workflows.workflows.upload': { paramsTuple?: []; params?: {} }
    'workflows.workflows.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'workflows.workflows.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'workflows.workflows.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'apps.apps.index': { paramsTuple?: []; params?: {} }
    'apps.apps.store': { paramsTuple?: []; params?: {} }
    'apps.apps.run': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'apps.apps.show_task': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'taskId': ParamValue} }
    'apps.apps.resume_task': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'taskId': ParamValue} }
    'apps.apps.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'apps.apps.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'apps.apps.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  GET: {
    'profile.profile.show': { paramsTuple?: []; params?: {} }
    'workflows.workflows.index': { paramsTuple?: []; params?: {} }
    'workflows.workflows.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'apps.apps.index': { paramsTuple?: []; params?: {} }
    'apps.apps.show_task': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'taskId': ParamValue} }
    'apps.apps.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  HEAD: {
    'profile.profile.show': { paramsTuple?: []; params?: {} }
    'workflows.workflows.index': { paramsTuple?: []; params?: {} }
    'workflows.workflows.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'apps.apps.index': { paramsTuple?: []; params?: {} }
    'apps.apps.show_task': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'taskId': ParamValue} }
    'apps.apps.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  POST: {
    'auth.new_account.store': { paramsTuple?: []; params?: {} }
    'auth.access_tokens.store': { paramsTuple?: []; params?: {} }
    'profile.access_tokens.destroy': { paramsTuple?: []; params?: {} }
    'workflows.workflows.upload': { paramsTuple?: []; params?: {} }
    'apps.apps.store': { paramsTuple?: []; params?: {} }
    'apps.apps.run': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'apps.apps.resume_task': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'taskId': ParamValue} }
  }
  PUT: {
    'workflows.workflows.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'apps.apps.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  DELETE: {
    'workflows.workflows.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'apps.apps.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}