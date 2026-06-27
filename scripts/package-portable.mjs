import { spawnSync } from 'node:child_process'
import { cp, mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import { chmodSync, copyFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const platform = process.platform
const arch = process.arch
const packageName = `comfyflow-${platform}-${arch}`
const distDir = path.join(rootDir, 'dist')
const packageDir = path.join(distDir, packageName)
const deployDir = path.join(distDir, '.portable-deploy')
const appDir = path.join(packageDir, 'app')
const runtimeDir = path.join(packageDir, 'runtime')
const nodeName = platform === 'win32' ? 'node.exe' : 'node'
const nodeTarget = path.join(runtimeDir, nodeName)

await rm(packageDir, { recursive: true, force: true })
await rm(deployDir, { recursive: true, force: true })
await mkdir(distDir, { recursive: true })

run('pnpm', ['--filter', 'frontend', 'generate'])
run('pnpm', ['--filter', 'backend', 'build'])
run('pnpm', ['--filter', 'backend', 'deploy', '--prod', '--legacy', deployDir])

await mkdir(packageDir, { recursive: true })
await mkdir(runtimeDir, { recursive: true })
copyFileSync(process.execPath, nodeTarget)
chmodSync(nodeTarget, 0o755)

await mkdir(appDir, { recursive: true })
await cp(path.join(deployDir, 'node_modules'), path.join(appDir, 'node_modules'), {
  recursive: true,
  verbatimSymlinks: true,
})
await cp(path.join(rootDir, 'packages/backend/build'), appDir, { recursive: true })
await cp(path.join(rootDir, 'packages/frontend/.output/public'), path.join(appDir, 'public'), {
  recursive: true,
})
await mkdir(path.join(appDir, 'tmp'), { recursive: true })
await prunePortableApp(appDir)

await writeFile(path.join(packageDir, 'launcher.mjs'), launcherSource(), { mode: 0o644 })
await writeFile(path.join(packageDir, 'README.txt'), readmeSource(packageName), { mode: 0o644 })

if (platform === 'win32') {
  await writeFile(path.join(packageDir, 'comfyflow.cmd'), windowsLauncher(), { mode: 0o755 })
} else {
  await writeFile(path.join(packageDir, 'comfyflow'), posixLauncher(), { mode: 0o755 })
}

await rm(deployDir, { recursive: true, force: true })

console.log(`Portable package ready: dist/${packageName}`)

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    env: process.env,
    stdio: 'inherit',
    shell: platform === 'win32',
  })

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

async function prunePortableApp(directory) {
  await rm(path.join(directory, 'tests'), { recursive: true, force: true })
  await rm(path.join(directory, 'bin/test.js'), { force: true })
  await rm(path.join(directory, 'bin/test.js.map'), { force: true })
  await removeFilesByExtension(directory, '.map')
}

async function removeFilesByExtension(directory, extension) {
  if (!existsSync(directory)) return

  const entries = await readdir(directory, { withFileTypes: true })

  await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name)
      if (entry.isDirectory()) return removeFilesByExtension(entryPath, extension)
      if (entry.isFile() && entry.name.endsWith(extension)) return rm(entryPath, { force: true })
    })
  )
}

function launcherSource() {
  return `import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const packageDir = path.dirname(fileURLToPath(import.meta.url))
const appDir = path.join(packageDir, 'app')
const nodeBin = path.join(packageDir, 'runtime', process.platform === 'win32' ? 'node.exe' : 'node')
const host = process.env.HOST || 'localhost'
const port = process.env.PORT || String(await findAvailablePort(3333, host))
const dataDir = process.env.COMFYFLOW_DATA_DIR || defaultDataDir()

mkdirSync(path.join(appDir, 'tmp'), { recursive: true })
mkdirSync(path.join(dataDir, 'storage', 'images'), { recursive: true })

const appKey = process.env.APP_KEY || readOrCreateAppKey(path.join(dataDir, 'app.key'))

const env = {
  ...process.env,
  NODE_ENV: 'production',
  PORT: port,
  HOST: host,
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  APP_KEY: appKey,
  APP_URL: process.env.APP_URL || \`http://\${host}:\${port}\`,
  COMFYFLOW_DATA_DIR: dataDir,
  SESSION_DRIVER: process.env.SESSION_DRIVER || 'cookie',
}

if (!existsSync(nodeBin)) {
  console.error(\`Missing bundled Node runtime: \${nodeBin}\`)
  process.exit(1)
}

await runNode(['ace.js', 'migration:run', '--force'])

console.log(\`ComfyFlow is running at http://\${host}:\${port}\`)
console.log(\`Data directory: \${dataDir}\`)
const server = spawn(nodeBin, ['bin/server.js'], { cwd: appDir, env, stdio: 'inherit' })

if (process.env.COMFYFLOW_OPEN_BROWSER === '1') {
  setTimeout(() => openBrowser(env.APP_URL), 1200)
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.kill(signal))
}

server.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  process.exit(code ?? 0)
})

function runNode(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(nodeBin, args, { cwd: appDir, env, stdio: 'inherit' })
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(\`Command failed: node \${args.join(' ')}\`))
    })
  })
}

async function findAvailablePort(startPort, hostName) {
  for (let portNumber = startPort; portNumber < startPort + 20; portNumber += 1) {
    if (await canListen(portNumber, hostName)) return portNumber
  }

  throw new Error(\`No available port found from \${startPort} to \${startPort + 19}\`)
}

function canListen(portNumber, hostName) {
  return new Promise((resolve) => {
    const probe = createServer()
    probe.once('error', () => resolve(false))
    probe.once('listening', () => probe.close(() => resolve(true)))
    probe.listen(portNumber, hostName)
  })
}

function defaultDataDir() {
  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'ComfyFlow')
  }

  if (process.platform === 'win32') {
    return path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'ComfyFlow')
  }

  return path.join(process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share'), 'comfyflow')
}

function readOrCreateAppKey(filePath) {
  if (existsSync(filePath)) return readFileSync(filePath, 'utf8').trim()

  const key = \`base64:\${randomBytes(32).toString('base64')}\`
  writeFileSync(filePath, key, { mode: 0o600 })
  return key
}

function openBrowser(url) {
  const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open'
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url]
  const child = spawn(command, args, { detached: true, stdio: 'ignore' })
  child.unref()
}
`
}

function posixLauncher() {
  return `#!/usr/bin/env sh
set -eu
DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec "$DIR/runtime/node" "$DIR/launcher.mjs" "$@"
`
}

function windowsLauncher() {
  return `@echo off
set DIR=%~dp0
"%DIR%runtime\\node.exe" "%DIR%launcher.mjs" %*
`
}

function readmeSource(name) {
  const launcher = platform === 'win32' ? 'comfyflow.cmd' : './comfyflow'
  return `ComfyFlow portable package: ${name}

Run:
  ${launcher}

Then open the URL printed by the launcher.
If port 3333 is already in use, ComfyFlow will try the next available port.

Optional environment variables:
  PORT=3333
  HOST=localhost
  COMFY_BASE_URL=http://127.0.0.1:8188
  COMFYFLOW_DATA_DIR=<custom data directory>

Default data directory:
  macOS: ~/Library/Application Support/ComfyFlow
  Windows: %APPDATA%\\ComfyFlow
  Linux: ~/.local/share/comfyflow or $XDG_DATA_HOME/comfyflow
`
}
