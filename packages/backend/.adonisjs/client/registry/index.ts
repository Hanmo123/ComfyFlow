/* eslint-disable prettier/prettier */
import type { AdonisEndpoint } from '@tuyau/core/types'
import type { Registry } from './schema.d.ts'
import type { ApiDefinition } from './tree.d.ts'

const placeholder: any = {}

const routes = {
  'auth.new_account.store': {
    methods: ["POST"],
    pattern: '/api/v1/auth/signup',
    tokens: [{"old":"/api/v1/auth/signup","type":0,"val":"api","end":""},{"old":"/api/v1/auth/signup","type":0,"val":"v1","end":""},{"old":"/api/v1/auth/signup","type":0,"val":"auth","end":""},{"old":"/api/v1/auth/signup","type":0,"val":"signup","end":""}],
    types: placeholder as Registry['auth.new_account.store']['types'],
  },
  'auth.access_tokens.store': {
    methods: ["POST"],
    pattern: '/api/v1/auth/login',
    tokens: [{"old":"/api/v1/auth/login","type":0,"val":"api","end":""},{"old":"/api/v1/auth/login","type":0,"val":"v1","end":""},{"old":"/api/v1/auth/login","type":0,"val":"auth","end":""},{"old":"/api/v1/auth/login","type":0,"val":"login","end":""}],
    types: placeholder as Registry['auth.access_tokens.store']['types'],
  },
  'profile.profile.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/account/profile',
    tokens: [{"old":"/api/v1/account/profile","type":0,"val":"api","end":""},{"old":"/api/v1/account/profile","type":0,"val":"v1","end":""},{"old":"/api/v1/account/profile","type":0,"val":"account","end":""},{"old":"/api/v1/account/profile","type":0,"val":"profile","end":""}],
    types: placeholder as Registry['profile.profile.show']['types'],
  },
  'profile.access_tokens.destroy': {
    methods: ["POST"],
    pattern: '/api/v1/account/logout',
    tokens: [{"old":"/api/v1/account/logout","type":0,"val":"api","end":""},{"old":"/api/v1/account/logout","type":0,"val":"v1","end":""},{"old":"/api/v1/account/logout","type":0,"val":"account","end":""},{"old":"/api/v1/account/logout","type":0,"val":"logout","end":""}],
    types: placeholder as Registry['profile.access_tokens.destroy']['types'],
  },
  'workflows.workflows.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/workflows',
    tokens: [{"old":"/api/v1/workflows","type":0,"val":"api","end":""},{"old":"/api/v1/workflows","type":0,"val":"v1","end":""},{"old":"/api/v1/workflows","type":0,"val":"workflows","end":""}],
    types: placeholder as Registry['workflows.workflows.index']['types'],
  },
  'workflows.workflows.upload': {
    methods: ["POST"],
    pattern: '/api/v1/workflows/upload',
    tokens: [{"old":"/api/v1/workflows/upload","type":0,"val":"api","end":""},{"old":"/api/v1/workflows/upload","type":0,"val":"v1","end":""},{"old":"/api/v1/workflows/upload","type":0,"val":"workflows","end":""},{"old":"/api/v1/workflows/upload","type":0,"val":"upload","end":""}],
    types: placeholder as Registry['workflows.workflows.upload']['types'],
  },
  'workflows.workflows.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/workflows/:id',
    tokens: [{"old":"/api/v1/workflows/:id","type":0,"val":"api","end":""},{"old":"/api/v1/workflows/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/workflows/:id","type":0,"val":"workflows","end":""},{"old":"/api/v1/workflows/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['workflows.workflows.show']['types'],
  },
  'workflows.workflows.update': {
    methods: ["PUT"],
    pattern: '/api/v1/workflows/:id',
    tokens: [{"old":"/api/v1/workflows/:id","type":0,"val":"api","end":""},{"old":"/api/v1/workflows/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/workflows/:id","type":0,"val":"workflows","end":""},{"old":"/api/v1/workflows/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['workflows.workflows.update']['types'],
  },
  'workflows.workflows.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/workflows/:id',
    tokens: [{"old":"/api/v1/workflows/:id","type":0,"val":"api","end":""},{"old":"/api/v1/workflows/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/workflows/:id","type":0,"val":"workflows","end":""},{"old":"/api/v1/workflows/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['workflows.workflows.destroy']['types'],
  },
  'apps.apps.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/apps',
    tokens: [{"old":"/api/v1/apps","type":0,"val":"api","end":""},{"old":"/api/v1/apps","type":0,"val":"v1","end":""},{"old":"/api/v1/apps","type":0,"val":"apps","end":""}],
    types: placeholder as Registry['apps.apps.index']['types'],
  },
  'apps.apps.store': {
    methods: ["POST"],
    pattern: '/api/v1/apps',
    tokens: [{"old":"/api/v1/apps","type":0,"val":"api","end":""},{"old":"/api/v1/apps","type":0,"val":"v1","end":""},{"old":"/api/v1/apps","type":0,"val":"apps","end":""}],
    types: placeholder as Registry['apps.apps.store']['types'],
  },
  'apps.apps.run': {
    methods: ["POST"],
    pattern: '/api/v1/apps/:id/runs',
    tokens: [{"old":"/api/v1/apps/:id/runs","type":0,"val":"api","end":""},{"old":"/api/v1/apps/:id/runs","type":0,"val":"v1","end":""},{"old":"/api/v1/apps/:id/runs","type":0,"val":"apps","end":""},{"old":"/api/v1/apps/:id/runs","type":1,"val":"id","end":""},{"old":"/api/v1/apps/:id/runs","type":0,"val":"runs","end":""}],
    types: placeholder as Registry['apps.apps.run']['types'],
  },
  'apps.apps.latest_task': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/apps/:id/runs/latest',
    tokens: [{"old":"/api/v1/apps/:id/runs/latest","type":0,"val":"api","end":""},{"old":"/api/v1/apps/:id/runs/latest","type":0,"val":"v1","end":""},{"old":"/api/v1/apps/:id/runs/latest","type":0,"val":"apps","end":""},{"old":"/api/v1/apps/:id/runs/latest","type":1,"val":"id","end":""},{"old":"/api/v1/apps/:id/runs/latest","type":0,"val":"runs","end":""},{"old":"/api/v1/apps/:id/runs/latest","type":0,"val":"latest","end":""}],
    types: placeholder as Registry['apps.apps.latest_task']['types'],
  },
  'apps.apps.show_task': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/apps/:id/runs/:taskId',
    tokens: [{"old":"/api/v1/apps/:id/runs/:taskId","type":0,"val":"api","end":""},{"old":"/api/v1/apps/:id/runs/:taskId","type":0,"val":"v1","end":""},{"old":"/api/v1/apps/:id/runs/:taskId","type":0,"val":"apps","end":""},{"old":"/api/v1/apps/:id/runs/:taskId","type":1,"val":"id","end":""},{"old":"/api/v1/apps/:id/runs/:taskId","type":0,"val":"runs","end":""},{"old":"/api/v1/apps/:id/runs/:taskId","type":1,"val":"taskId","end":""}],
    types: placeholder as Registry['apps.apps.show_task']['types'],
  },
  'apps.apps.resume_task': {
    methods: ["POST"],
    pattern: '/api/v1/apps/:id/runs/:taskId/resume',
    tokens: [{"old":"/api/v1/apps/:id/runs/:taskId/resume","type":0,"val":"api","end":""},{"old":"/api/v1/apps/:id/runs/:taskId/resume","type":0,"val":"v1","end":""},{"old":"/api/v1/apps/:id/runs/:taskId/resume","type":0,"val":"apps","end":""},{"old":"/api/v1/apps/:id/runs/:taskId/resume","type":1,"val":"id","end":""},{"old":"/api/v1/apps/:id/runs/:taskId/resume","type":0,"val":"runs","end":""},{"old":"/api/v1/apps/:id/runs/:taskId/resume","type":1,"val":"taskId","end":""},{"old":"/api/v1/apps/:id/runs/:taskId/resume","type":0,"val":"resume","end":""}],
    types: placeholder as Registry['apps.apps.resume_task']['types'],
  },
  'apps.apps.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/apps/:id',
    tokens: [{"old":"/api/v1/apps/:id","type":0,"val":"api","end":""},{"old":"/api/v1/apps/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/apps/:id","type":0,"val":"apps","end":""},{"old":"/api/v1/apps/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['apps.apps.show']['types'],
  },
  'apps.apps.update': {
    methods: ["PUT"],
    pattern: '/api/v1/apps/:id',
    tokens: [{"old":"/api/v1/apps/:id","type":0,"val":"api","end":""},{"old":"/api/v1/apps/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/apps/:id","type":0,"val":"apps","end":""},{"old":"/api/v1/apps/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['apps.apps.update']['types'],
  },
  'apps.apps.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/apps/:id',
    tokens: [{"old":"/api/v1/apps/:id","type":0,"val":"api","end":""},{"old":"/api/v1/apps/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/apps/:id","type":0,"val":"apps","end":""},{"old":"/api/v1/apps/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['apps.apps.destroy']['types'],
  },
  'apps.app_input_presets.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/apps/:appId/presets',
    tokens: [{"old":"/api/v1/apps/:appId/presets","type":0,"val":"api","end":""},{"old":"/api/v1/apps/:appId/presets","type":0,"val":"v1","end":""},{"old":"/api/v1/apps/:appId/presets","type":0,"val":"apps","end":""},{"old":"/api/v1/apps/:appId/presets","type":1,"val":"appId","end":""},{"old":"/api/v1/apps/:appId/presets","type":0,"val":"presets","end":""}],
    types: placeholder as Registry['apps.app_input_presets.index']['types'],
  },
  'apps.app_input_presets.store': {
    methods: ["POST"],
    pattern: '/api/v1/apps/:appId/presets',
    tokens: [{"old":"/api/v1/apps/:appId/presets","type":0,"val":"api","end":""},{"old":"/api/v1/apps/:appId/presets","type":0,"val":"v1","end":""},{"old":"/api/v1/apps/:appId/presets","type":0,"val":"apps","end":""},{"old":"/api/v1/apps/:appId/presets","type":1,"val":"appId","end":""},{"old":"/api/v1/apps/:appId/presets","type":0,"val":"presets","end":""}],
    types: placeholder as Registry['apps.app_input_presets.store']['types'],
  },
  'apps.app_input_presets.update': {
    methods: ["PUT"],
    pattern: '/api/v1/apps/:appId/presets/:id',
    tokens: [{"old":"/api/v1/apps/:appId/presets/:id","type":0,"val":"api","end":""},{"old":"/api/v1/apps/:appId/presets/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/apps/:appId/presets/:id","type":0,"val":"apps","end":""},{"old":"/api/v1/apps/:appId/presets/:id","type":1,"val":"appId","end":""},{"old":"/api/v1/apps/:appId/presets/:id","type":0,"val":"presets","end":""},{"old":"/api/v1/apps/:appId/presets/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['apps.app_input_presets.update']['types'],
  },
  'apps.app_input_presets.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/apps/:appId/presets/:id',
    tokens: [{"old":"/api/v1/apps/:appId/presets/:id","type":0,"val":"api","end":""},{"old":"/api/v1/apps/:appId/presets/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/apps/:appId/presets/:id","type":0,"val":"apps","end":""},{"old":"/api/v1/apps/:appId/presets/:id","type":1,"val":"appId","end":""},{"old":"/api/v1/apps/:appId/presets/:id","type":0,"val":"presets","end":""},{"old":"/api/v1/apps/:appId/presets/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['apps.app_input_presets.destroy']['types'],
  },
  'taskGroups.task_groups.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/task-groups',
    tokens: [{"old":"/api/v1/task-groups","type":0,"val":"api","end":""},{"old":"/api/v1/task-groups","type":0,"val":"v1","end":""},{"old":"/api/v1/task-groups","type":0,"val":"task-groups","end":""}],
    types: placeholder as Registry['taskGroups.task_groups.index']['types'],
  },
  'taskGroups.task_groups.store': {
    methods: ["POST"],
    pattern: '/api/v1/task-groups',
    tokens: [{"old":"/api/v1/task-groups","type":0,"val":"api","end":""},{"old":"/api/v1/task-groups","type":0,"val":"v1","end":""},{"old":"/api/v1/task-groups","type":0,"val":"task-groups","end":""}],
    types: placeholder as Registry['taskGroups.task_groups.store']['types'],
  },
  'tasks.tasks.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/tasks',
    tokens: [{"old":"/api/v1/tasks","type":0,"val":"api","end":""},{"old":"/api/v1/tasks","type":0,"val":"v1","end":""},{"old":"/api/v1/tasks","type":0,"val":"tasks","end":""}],
    types: placeholder as Registry['tasks.tasks.index']['types'],
  },
  'tasks.tasks.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/tasks/:id',
    tokens: [{"old":"/api/v1/tasks/:id","type":0,"val":"api","end":""},{"old":"/api/v1/tasks/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/tasks/:id","type":0,"val":"tasks","end":""},{"old":"/api/v1/tasks/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['tasks.tasks.show']['types'],
  },
  'tasks.tasks.retry': {
    methods: ["POST"],
    pattern: '/api/v1/tasks/:id/retry',
    tokens: [{"old":"/api/v1/tasks/:id/retry","type":0,"val":"api","end":""},{"old":"/api/v1/tasks/:id/retry","type":0,"val":"v1","end":""},{"old":"/api/v1/tasks/:id/retry","type":0,"val":"tasks","end":""},{"old":"/api/v1/tasks/:id/retry","type":1,"val":"id","end":""},{"old":"/api/v1/tasks/:id/retry","type":0,"val":"retry","end":""}],
    types: placeholder as Registry['tasks.tasks.retry']['types'],
  },
  'tasks.tasks.sync_snapshot': {
    methods: ["POST"],
    pattern: '/api/v1/tasks/:id/sync-snapshot',
    tokens: [{"old":"/api/v1/tasks/:id/sync-snapshot","type":0,"val":"api","end":""},{"old":"/api/v1/tasks/:id/sync-snapshot","type":0,"val":"v1","end":""},{"old":"/api/v1/tasks/:id/sync-snapshot","type":0,"val":"tasks","end":""},{"old":"/api/v1/tasks/:id/sync-snapshot","type":1,"val":"id","end":""},{"old":"/api/v1/tasks/:id/sync-snapshot","type":0,"val":"sync-snapshot","end":""}],
    types: placeholder as Registry['tasks.tasks.sync_snapshot']['types'],
  },
  'tasks.tasks.repair_logic': {
    methods: ["POST"],
    pattern: '/api/v1/tasks/:id/repair-logic',
    tokens: [{"old":"/api/v1/tasks/:id/repair-logic","type":0,"val":"api","end":""},{"old":"/api/v1/tasks/:id/repair-logic","type":0,"val":"v1","end":""},{"old":"/api/v1/tasks/:id/repair-logic","type":0,"val":"tasks","end":""},{"old":"/api/v1/tasks/:id/repair-logic","type":1,"val":"id","end":""},{"old":"/api/v1/tasks/:id/repair-logic","type":0,"val":"repair-logic","end":""}],
    types: placeholder as Registry['tasks.tasks.repair_logic']['types'],
  },
  'tasks.tasks.retry_node': {
    methods: ["POST"],
    pattern: '/api/v1/tasks/:id/nodes/:nodeId/retry',
    tokens: [{"old":"/api/v1/tasks/:id/nodes/:nodeId/retry","type":0,"val":"api","end":""},{"old":"/api/v1/tasks/:id/nodes/:nodeId/retry","type":0,"val":"v1","end":""},{"old":"/api/v1/tasks/:id/nodes/:nodeId/retry","type":0,"val":"tasks","end":""},{"old":"/api/v1/tasks/:id/nodes/:nodeId/retry","type":1,"val":"id","end":""},{"old":"/api/v1/tasks/:id/nodes/:nodeId/retry","type":0,"val":"nodes","end":""},{"old":"/api/v1/tasks/:id/nodes/:nodeId/retry","type":1,"val":"nodeId","end":""},{"old":"/api/v1/tasks/:id/nodes/:nodeId/retry","type":0,"val":"retry","end":""}],
    types: placeholder as Registry['tasks.tasks.retry_node']['types'],
  },
  'tasks.tasks.update_inputs': {
    methods: ["PATCH"],
    pattern: '/api/v1/tasks/:id/inputs',
    tokens: [{"old":"/api/v1/tasks/:id/inputs","type":0,"val":"api","end":""},{"old":"/api/v1/tasks/:id/inputs","type":0,"val":"v1","end":""},{"old":"/api/v1/tasks/:id/inputs","type":0,"val":"tasks","end":""},{"old":"/api/v1/tasks/:id/inputs","type":1,"val":"id","end":""},{"old":"/api/v1/tasks/:id/inputs","type":0,"val":"inputs","end":""}],
    types: placeholder as Registry['tasks.tasks.update_inputs']['types'],
  },
  'tasks.tasks.move_to_group': {
    methods: ["PATCH"],
    pattern: '/api/v1/tasks/:id/group',
    tokens: [{"old":"/api/v1/tasks/:id/group","type":0,"val":"api","end":""},{"old":"/api/v1/tasks/:id/group","type":0,"val":"v1","end":""},{"old":"/api/v1/tasks/:id/group","type":0,"val":"tasks","end":""},{"old":"/api/v1/tasks/:id/group","type":1,"val":"id","end":""},{"old":"/api/v1/tasks/:id/group","type":0,"val":"group","end":""}],
    types: placeholder as Registry['tasks.tasks.move_to_group']['types'],
  },
  'tasks.tasks.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/tasks/:id',
    tokens: [{"old":"/api/v1/tasks/:id","type":0,"val":"api","end":""},{"old":"/api/v1/tasks/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/tasks/:id","type":0,"val":"tasks","end":""},{"old":"/api/v1/tasks/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['tasks.tasks.destroy']['types'],
  },
  'comfy.comfy.list_loras': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/comfy/loras',
    tokens: [{"old":"/api/v1/comfy/loras","type":0,"val":"api","end":""},{"old":"/api/v1/comfy/loras","type":0,"val":"v1","end":""},{"old":"/api/v1/comfy/loras","type":0,"val":"comfy","end":""},{"old":"/api/v1/comfy/loras","type":0,"val":"loras","end":""}],
    types: placeholder as Registry['comfy.comfy.list_loras']['types'],
  },
  'comfy.comfy.upload_image': {
    methods: ["POST"],
    pattern: '/api/v1/comfy/images',
    tokens: [{"old":"/api/v1/comfy/images","type":0,"val":"api","end":""},{"old":"/api/v1/comfy/images","type":0,"val":"v1","end":""},{"old":"/api/v1/comfy/images","type":0,"val":"comfy","end":""},{"old":"/api/v1/comfy/images","type":0,"val":"images","end":""}],
    types: placeholder as Registry['comfy.comfy.upload_image']['types'],
  },
  'library.library_assets.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/library',
    tokens: [{"old":"/api/v1/library","type":0,"val":"api","end":""},{"old":"/api/v1/library","type":0,"val":"v1","end":""},{"old":"/api/v1/library","type":0,"val":"library","end":""}],
    types: placeholder as Registry['library.library_assets.index']['types'],
  },
  'library.library_assets.store': {
    methods: ["POST"],
    pattern: '/api/v1/library',
    tokens: [{"old":"/api/v1/library","type":0,"val":"api","end":""},{"old":"/api/v1/library","type":0,"val":"v1","end":""},{"old":"/api/v1/library","type":0,"val":"library","end":""}],
    types: placeholder as Registry['library.library_assets.store']['types'],
  },
  'library.library_assets.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/library/:id',
    tokens: [{"old":"/api/v1/library/:id","type":0,"val":"api","end":""},{"old":"/api/v1/library/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/library/:id","type":0,"val":"library","end":""},{"old":"/api/v1/library/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['library.library_assets.show']['types'],
  },
  'library.library_assets.update': {
    methods: ["PUT"],
    pattern: '/api/v1/library/:id',
    tokens: [{"old":"/api/v1/library/:id","type":0,"val":"api","end":""},{"old":"/api/v1/library/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/library/:id","type":0,"val":"library","end":""},{"old":"/api/v1/library/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['library.library_assets.update']['types'],
  },
  'library.library_assets.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/library/:id',
    tokens: [{"old":"/api/v1/library/:id","type":0,"val":"api","end":""},{"old":"/api/v1/library/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/library/:id","type":0,"val":"library","end":""},{"old":"/api/v1/library/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['library.library_assets.destroy']['types'],
  },
  'media.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/media/:hash',
    tokens: [{"old":"/api/v1/media/:hash","type":0,"val":"api","end":""},{"old":"/api/v1/media/:hash","type":0,"val":"v1","end":""},{"old":"/api/v1/media/:hash","type":0,"val":"media","end":""},{"old":"/api/v1/media/:hash","type":1,"val":"hash","end":""}],
    types: placeholder as Registry['media.show']['types'],
  },
  'media.proxies': {
    methods: ["POST"],
    pattern: '/api/v1/media/proxies',
    tokens: [{"old":"/api/v1/media/proxies","type":0,"val":"api","end":""},{"old":"/api/v1/media/proxies","type":0,"val":"v1","end":""},{"old":"/api/v1/media/proxies","type":0,"val":"media","end":""},{"old":"/api/v1/media/proxies","type":0,"val":"proxies","end":""}],
    types: placeholder as Registry['media.proxies']['types'],
  },
  'media.starStates': {
    methods: ["POST"],
    pattern: '/api/v1/media/star-states',
    tokens: [{"old":"/api/v1/media/star-states","type":0,"val":"api","end":""},{"old":"/api/v1/media/star-states","type":0,"val":"v1","end":""},{"old":"/api/v1/media/star-states","type":0,"val":"media","end":""},{"old":"/api/v1/media/star-states","type":0,"val":"star-states","end":""}],
    types: placeholder as Registry['media.starStates']['types'],
  },
  'media.updateStar': {
    methods: ["PATCH"],
    pattern: '/api/v1/media/:hash/star',
    tokens: [{"old":"/api/v1/media/:hash/star","type":0,"val":"api","end":""},{"old":"/api/v1/media/:hash/star","type":0,"val":"v1","end":""},{"old":"/api/v1/media/:hash/star","type":0,"val":"media","end":""},{"old":"/api/v1/media/:hash/star","type":1,"val":"hash","end":""},{"old":"/api/v1/media/:hash/star","type":0,"val":"star","end":""}],
    types: placeholder as Registry['media.updateStar']['types'],
  },
} as const satisfies Record<string, AdonisEndpoint>

export { routes }

export const registry = {
  routes,
  $tree: {} as ApiDefinition,
}

declare module '@tuyau/core/types' {
  export interface UserRegistry {
    routes: typeof routes
    $tree: ApiDefinition
  }
}
