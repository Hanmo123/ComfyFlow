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
  }
  GET: {
    'profile.profile.show': { paramsTuple?: []; params?: {} }
    'workflows.workflows.index': { paramsTuple?: []; params?: {} }
    'workflows.workflows.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  HEAD: {
    'profile.profile.show': { paramsTuple?: []; params?: {} }
    'workflows.workflows.index': { paramsTuple?: []; params?: {} }
    'workflows.workflows.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  POST: {
    'auth.new_account.store': { paramsTuple?: []; params?: {} }
    'auth.access_tokens.store': { paramsTuple?: []; params?: {} }
    'profile.access_tokens.destroy': { paramsTuple?: []; params?: {} }
    'workflows.workflows.upload': { paramsTuple?: []; params?: {} }
  }
  PUT: {
    'workflows.workflows.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  DELETE: {
    'workflows.workflows.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}