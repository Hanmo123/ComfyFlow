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
        router.get(':id', [AppsController, 'show'])
        router.put(':id', [AppsController, 'update'])
        router.delete(':id', [AppsController, 'destroy'])
      })
      .prefix('apps')
      .as('apps')
  })
  .prefix('/api/v1')
