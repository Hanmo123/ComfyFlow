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
    'apps.apps.latest_task': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'apps.apps.show_task': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'taskId': ParamValue} }
    'apps.apps.resume_task': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'taskId': ParamValue} }
    'apps.apps.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'apps.apps.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'apps.apps.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'apps.app_input_presets.index': { paramsTuple: [ParamValue]; params: {'appId': ParamValue} }
    'apps.app_input_presets.store': { paramsTuple: [ParamValue]; params: {'appId': ParamValue} }
    'apps.app_input_presets.update': { paramsTuple: [ParamValue,ParamValue]; params: {'appId': ParamValue,'id': ParamValue} }
    'apps.app_input_presets.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'appId': ParamValue,'id': ParamValue} }
    'taskGroups.task_groups.index': { paramsTuple?: []; params?: {} }
    'taskGroups.task_groups.store': { paramsTuple?: []; params?: {} }
    'tasks.tasks.index': { paramsTuple?: []; params?: {} }
    'tasks.tasks.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tasks.tasks.retry': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tasks.tasks.sync_snapshot': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tasks.tasks.repair_logic': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tasks.tasks.retry_node': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'nodeId': ParamValue} }
    'tasks.tasks.update_inputs': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tasks.tasks.move_to_group': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tasks.tasks.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'comfy.comfy.list_loras': { paramsTuple?: []; params?: {} }
    'comfy.comfy.upload_image': { paramsTuple?: []; params?: {} }
    'library.library_assets.index': { paramsTuple?: []; params?: {} }
    'library.library_assets.store': { paramsTuple?: []; params?: {} }
    'library.library_assets.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.library_assets.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.library_assets.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'media.show': { paramsTuple: [ParamValue]; params: {'hash': ParamValue} }
    'media.proxies': { paramsTuple?: []; params?: {} }
    'media.starStates': { paramsTuple?: []; params?: {} }
    'media.updateStar': { paramsTuple: [ParamValue]; params: {'hash': ParamValue} }
  }
  GET: {
    'profile.profile.show': { paramsTuple?: []; params?: {} }
    'workflows.workflows.index': { paramsTuple?: []; params?: {} }
    'workflows.workflows.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'apps.apps.index': { paramsTuple?: []; params?: {} }
    'apps.apps.latest_task': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'apps.apps.show_task': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'taskId': ParamValue} }
    'apps.apps.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'apps.app_input_presets.index': { paramsTuple: [ParamValue]; params: {'appId': ParamValue} }
    'taskGroups.task_groups.index': { paramsTuple?: []; params?: {} }
    'tasks.tasks.index': { paramsTuple?: []; params?: {} }
    'tasks.tasks.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'comfy.comfy.list_loras': { paramsTuple?: []; params?: {} }
    'library.library_assets.index': { paramsTuple?: []; params?: {} }
    'library.library_assets.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'media.show': { paramsTuple: [ParamValue]; params: {'hash': ParamValue} }
  }
  HEAD: {
    'profile.profile.show': { paramsTuple?: []; params?: {} }
    'workflows.workflows.index': { paramsTuple?: []; params?: {} }
    'workflows.workflows.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'apps.apps.index': { paramsTuple?: []; params?: {} }
    'apps.apps.latest_task': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'apps.apps.show_task': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'taskId': ParamValue} }
    'apps.apps.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'apps.app_input_presets.index': { paramsTuple: [ParamValue]; params: {'appId': ParamValue} }
    'taskGroups.task_groups.index': { paramsTuple?: []; params?: {} }
    'tasks.tasks.index': { paramsTuple?: []; params?: {} }
    'tasks.tasks.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'comfy.comfy.list_loras': { paramsTuple?: []; params?: {} }
    'library.library_assets.index': { paramsTuple?: []; params?: {} }
    'library.library_assets.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'media.show': { paramsTuple: [ParamValue]; params: {'hash': ParamValue} }
  }
  POST: {
    'auth.new_account.store': { paramsTuple?: []; params?: {} }
    'auth.access_tokens.store': { paramsTuple?: []; params?: {} }
    'profile.access_tokens.destroy': { paramsTuple?: []; params?: {} }
    'workflows.workflows.upload': { paramsTuple?: []; params?: {} }
    'apps.apps.store': { paramsTuple?: []; params?: {} }
    'apps.apps.run': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'apps.apps.resume_task': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'taskId': ParamValue} }
    'apps.app_input_presets.store': { paramsTuple: [ParamValue]; params: {'appId': ParamValue} }
    'taskGroups.task_groups.store': { paramsTuple?: []; params?: {} }
    'tasks.tasks.retry': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tasks.tasks.sync_snapshot': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tasks.tasks.repair_logic': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tasks.tasks.retry_node': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'nodeId': ParamValue} }
    'comfy.comfy.upload_image': { paramsTuple?: []; params?: {} }
    'library.library_assets.store': { paramsTuple?: []; params?: {} }
    'media.proxies': { paramsTuple?: []; params?: {} }
    'media.starStates': { paramsTuple?: []; params?: {} }
  }
  PUT: {
    'workflows.workflows.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'apps.apps.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'apps.app_input_presets.update': { paramsTuple: [ParamValue,ParamValue]; params: {'appId': ParamValue,'id': ParamValue} }
    'library.library_assets.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  DELETE: {
    'workflows.workflows.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'apps.apps.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'apps.app_input_presets.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'appId': ParamValue,'id': ParamValue} }
    'tasks.tasks.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'library.library_assets.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  PATCH: {
    'tasks.tasks.update_inputs': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tasks.tasks.move_to_group': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'media.updateStar': { paramsTuple: [ParamValue]; params: {'hash': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}