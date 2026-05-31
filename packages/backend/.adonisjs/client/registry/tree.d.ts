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
}
