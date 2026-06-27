import app from '@adonisjs/core/services/app'
import { mkdirSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const dataRoot = resolveDataRoot()

export function dataPath(...segments: string[]) {
  return path.join(dataRoot, ...segments)
}

export function storagePath(...segments: string[]) {
  return dataPath('storage', ...segments)
}

export function databasePath() {
  const filePath = resolveDatabasePath()
  mkdirSync(path.dirname(filePath), { recursive: true })
  return filePath
}

function resolveDatabasePath() {
  if (process.env.NODE_ENV === 'development') return storagePath('db.sqlite3')
  return dataPath('db.sqlite3')
}

function resolveDataRoot() {
  if (process.env.COMFYFLOW_DATA_DIR) return path.resolve(process.env.COMFYFLOW_DATA_DIR)
  if (!app.inProduction) return app.makePath()

  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'ComfyFlow')
  }

  if (process.platform === 'win32') {
    return path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'ComfyFlow')
  }

  return path.join(process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share'), 'comfyflow')
}
