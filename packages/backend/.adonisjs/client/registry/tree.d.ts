/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  auth: {
    newAccount: {
      store: typeof routes['auth.new_account.store']
    }
    accessTokens: {
      store: typeof routes['auth.access_tokens.store']
    }
  }
  profile: {
    profile: {
      show: typeof routes['profile.profile.show']
    }
    accessTokens: {
      destroy: typeof routes['profile.access_tokens.destroy']
    }
  }
  workflows: {
    workflows: {
      index: typeof routes['workflows.workflows.index']
      upload: typeof routes['workflows.workflows.upload']
      show: typeof routes['workflows.workflows.show']
      update: typeof routes['workflows.workflows.update']
      destroy: typeof routes['workflows.workflows.destroy']
    }
  }
  apps: {
    apps: {
      index: typeof routes['apps.apps.index']
      store: typeof routes['apps.apps.store']
      run: typeof routes['apps.apps.run']
      showTask: typeof routes['apps.apps.show_task']
      resumeTask: typeof routes['apps.apps.resume_task']
      show: typeof routes['apps.apps.show']
      update: typeof routes['apps.apps.update']
      destroy: typeof routes['apps.apps.destroy']
    }
    appInputPresets: {
      index: typeof routes['apps.app_input_presets.index']
      store: typeof routes['apps.app_input_presets.store']
      update: typeof routes['apps.app_input_presets.update']
      destroy: typeof routes['apps.app_input_presets.destroy']
    }
  }
  taskGroups: {
    taskGroups: {
      index: typeof routes['taskGroups.task_groups.index']
      store: typeof routes['taskGroups.task_groups.store']
    }
  }
  tasks: {
    tasks: {
      index: typeof routes['tasks.tasks.index']
      show: typeof routes['tasks.tasks.show']
      retry: typeof routes['tasks.tasks.retry']
      retryNode: typeof routes['tasks.tasks.retry_node']
    }
  }
  comfy: {
    comfy: {
      listLoras: typeof routes['comfy.comfy.list_loras']
      uploadImage: typeof routes['comfy.comfy.upload_image']
    }
  }
  library: {
    libraryAssets: {
      index: typeof routes['library.library_assets.index']
      store: typeof routes['library.library_assets.store']
      show: typeof routes['library.library_assets.show']
      update: typeof routes['library.library_assets.update']
      destroy: typeof routes['library.library_assets.destroy']
    }
  }
  media: {
    show: typeof routes['media.show']
  }
}
