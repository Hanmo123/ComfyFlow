/* eslint-disable prettier/prettier */
/// <reference path="../manifest.d.ts" />

import type { ExtractBody, ExtractErrorResponse, ExtractQuery, ExtractQueryForGet, ExtractResponse } from '@tuyau/core/types'
import type { InferInput, SimpleError } from '@vinejs/vine/types'

export type ParamValue = string | number | bigint | boolean

export interface Registry {
  'auth.new_account.store': {
    methods: ["POST"]
    pattern: '/api/v1/auth/signup'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').signupValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').signupValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/new_account_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/new_account_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'auth.access_tokens.store': {
    methods: ["POST"]
    pattern: '/api/v1/auth/login'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').loginValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').loginValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/access_tokens_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/access_tokens_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'profile.profile.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/account/profile'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['show']>>>
    }
  }
  'profile.access_tokens.destroy': {
    methods: ["POST"]
    pattern: '/api/v1/account/logout'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/access_tokens_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/access_tokens_controller').default['destroy']>>>
    }
  }
  'workflows.workflows.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/workflows'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/workflows_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/workflows_controller').default['index']>>>
    }
  }
  'workflows.workflows.upload': {
    methods: ["POST"]
    pattern: '/api/v1/workflows/upload'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/workflow').uploadWorkflowValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/workflow').uploadWorkflowValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/workflows_controller').default['upload']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/workflows_controller').default['upload']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'workflows.workflows.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/workflows/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/workflows_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/workflows_controller').default['show']>>>
    }
  }
  'workflows.workflows.update': {
    methods: ["PUT"]
    pattern: '/api/v1/workflows/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/workflow').updateWorkflowValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/workflow').updateWorkflowValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/workflows_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/workflows_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'workflows.workflows.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/workflows/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/workflows_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/workflows_controller').default['destroy']>>>
    }
  }
  'apps.apps.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/apps'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/apps_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/apps_controller').default['index']>>>
    }
  }
  'apps.apps.store': {
    methods: ["POST"]
    pattern: '/api/v1/apps'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/app').createAppValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/app').createAppValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/apps_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/apps_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'apps.apps.run': {
    methods: ["POST"]
    pattern: '/api/v1/apps/:id/runs'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/app').runAppValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/app').runAppValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/apps_controller').default['run']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/apps_controller').default['run']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'apps.apps.show_task': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/apps/:id/runs/:taskId'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { id: ParamValue; taskId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/apps_controller').default['showTask']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/apps_controller').default['showTask']>>>
    }
  }
  'apps.apps.resume_task': {
    methods: ["POST"]
    pattern: '/api/v1/apps/:id/runs/:taskId/resume'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { id: ParamValue; taskId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/apps_controller').default['resumeTask']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/apps_controller').default['resumeTask']>>>
    }
  }
  'apps.apps.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/apps/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/apps_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/apps_controller').default['show']>>>
    }
  }
  'apps.apps.update': {
    methods: ["PUT"]
    pattern: '/api/v1/apps/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/app').updateAppValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/app').updateAppValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/apps_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/apps_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'apps.apps.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/apps/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/apps_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/apps_controller').default['destroy']>>>
    }
  }
  'taskGroups.task_groups.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/task-groups'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/task_groups_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/task_groups_controller').default['index']>>>
    }
  }
  'taskGroups.task_groups.store': {
    methods: ["POST"]
    pattern: '/api/v1/task-groups'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/task_group').createTaskGroupValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/task_group').createTaskGroupValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/task_groups_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/task_groups_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'tasks.tasks.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/tasks'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/tasks_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/tasks_controller').default['index']>>>
    }
  }
  'tasks.tasks.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/tasks/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/tasks_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/tasks_controller').default['show']>>>
    }
  }
  'tasks.tasks.retry': {
    methods: ["POST"]
    pattern: '/api/v1/tasks/:id/retry'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/task').retryTaskValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/task').retryTaskValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/tasks_controller').default['retry']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/tasks_controller').default['retry']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'tasks.tasks.retry_node': {
    methods: ["POST"]
    pattern: '/api/v1/tasks/:id/nodes/:nodeId/retry'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { id: ParamValue; nodeId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/tasks_controller').default['retryNode']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/tasks_controller').default['retryNode']>>>
    }
  }
  'comfy.comfy.list_loras': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/comfy/loras'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/comfy_controller').default['listLoras']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/comfy_controller').default['listLoras']>>>
    }
  }
  'comfy.comfy.upload_image': {
    methods: ["POST"]
    pattern: '/api/v1/comfy/images'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/comfy_controller').default['uploadImage']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/comfy_controller').default['uploadImage']>>>
    }
  }
  'media.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/media/:hash'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { hash: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/media_assets_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/media_assets_controller').default['show']>>>
    }
  }
}
