/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'
import { controllers } from '#generated/controllers'

const WorkflowsController = () => import('#controllers/workflows_controller')
const AppsController = () => import('#controllers/apps_controller')
const TaskGroupsController = () => import('#controllers/task_groups_controller')
const TasksController = () => import('#controllers/tasks_controller')
const ComfyController = () => import('#controllers/comfy_controller')
const MediaAssetsController = () => import('#controllers/media_assets_controller')

router.get('/', () => {
  return { hello: 'world' }
})

router
  .group(() => {
    router
      .group(() => {
        router.post('signup', [controllers.NewAccount, 'store'])
        router.post('login', [controllers.AccessTokens, 'store'])
      })
      .prefix('auth')
      .as('auth')

    router
      .group(() => {
        router.get('profile', [controllers.Profile, 'show'])
        router.post('logout', [controllers.AccessTokens, 'destroy'])
      })
      .prefix('account')
      .as('profile')
      .use(middleware.auth())

    router
      .group(() => {
        router.get('/', [WorkflowsController, 'index'])
        router.post('upload', [WorkflowsController, 'upload'])
        router.get(':id', [WorkflowsController, 'show'])
        router.put(':id', [WorkflowsController, 'update'])
        router.delete(':id', [WorkflowsController, 'destroy'])
      })
      .prefix('workflows')
      .as('workflows')

    router
      .group(() => {
        router.get('/', [AppsController, 'index'])
        router.post('/', [AppsController, 'store'])
        router.post(':id/runs', [AppsController, 'run'])
        router.get(':id/runs/:taskId', [AppsController, 'showTask'])
        router.post(':id/runs/:taskId/resume', [AppsController, 'resumeTask'])
        router.get(':id', [AppsController, 'show'])
        router.put(':id', [AppsController, 'update'])
        router.delete(':id', [AppsController, 'destroy'])
      })
      .prefix('apps')
      .as('apps')

    router
      .group(() => {
        router.get('/', [TaskGroupsController, 'index'])
        router.post('/', [TaskGroupsController, 'store'])
      })
      .prefix('task-groups')
      .as('taskGroups')

    router
      .group(() => {
        router.get('/', [TasksController, 'index'])
        router.get(':id', [TasksController, 'show'])
        router.post(':id/nodes/:nodeId/retry', [TasksController, 'retryNode'])
      })
      .prefix('tasks')
      .as('tasks')

    router
      .group(() => {
        router.post('images', [ComfyController, 'uploadImage'])
      })
      .prefix('comfy')
      .as('comfy')

    router.get('media/:hash', [MediaAssetsController, 'show']).as('media.show')
  })
  .prefix('/api/v1')
