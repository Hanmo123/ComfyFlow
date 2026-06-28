import { spawnSync } from 'node:child_process'
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { chmodSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const packageJson = JSON.parse(await readFile(path.join(rootDir, 'package.json'), 'utf8'))
const version = process.env.COMFYFLOW_VERSION || packageJson.version || '0.0.0'
const portableDir = path.join(rootDir, 'dist', `comfyflow-${process.platform}-${process.arch}`)
const portableZipPath = path.join(rootDir, 'dist', `ComfyFlow-${version}-${process.platform}-${process.arch}-portable.zip`)
const workDir = await mkdtemp(path.join(os.tmpdir(), 'comfyflow-macos-'))
const payloadDir = path.join(workDir, 'payload')
const appDir = path.join(payloadDir, 'ComfyFlow.app')
const contentsDir = path.join(appDir, 'Contents')
const resourcesDir = path.join(contentsDir, 'Resources')
const macosDir = path.join(contentsDir, 'MacOS')
const pkgPath = path.join(rootDir, 'dist', `ComfyFlow-${version}-${process.platform}-${process.arch}.pkg`)

if (process.platform !== 'darwin') {
  console.error('macOS installer packaging must run on macOS.')
  process.exit(1)
}

run('node', ['scripts/package-portable.mjs'])

await rm(pkgPath, { force: true })
await rm(portableZipPath, { force: true })
await mkdir(resourcesDir, { recursive: true })
await mkdir(macosDir, { recursive: true })

await cp(path.join(portableDir, 'app'), path.join(resourcesDir, 'app'), { recursive: true })
await cp(path.join(portableDir, 'runtime'), path.join(resourcesDir, 'runtime'), { recursive: true })
await cp(path.join(portableDir, 'launcher.mjs'), path.join(resourcesDir, 'launcher.mjs'))
await cp(path.join(portableDir, 'README.txt'), path.join(resourcesDir, 'README.txt'))

await writeFile(path.join(contentsDir, 'Info.plist'), infoPlist(version), { mode: 0o644 })
await writeFile(path.join(macosDir, 'ComfyFlow'), appLauncher(), { mode: 0o755 })
chmodSync(path.join(macosDir, 'ComfyFlow'), 0o755)

run('xattr', ['-cr', appDir], { allowFailure: true })
run('ditto', ['-c', '-k', '--sequesterRsrc', '--keepParent', portableDir, portableZipPath])

run('pkgbuild', [
  '--root',
  appDir,
  '--install-location',
  '/Applications/ComfyFlow.app',
  '--identifier',
  'com.comfyflow.app',
  '--version',
  version,
  pkgPath,
])

console.log(`macOS portable package ready: ${path.relative(rootDir, portableZipPath)}`)
console.log(`macOS installer ready: ${path.relative(rootDir, pkgPath)}`)
await rm(workDir, { recursive: true, force: true })

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    env: { ...process.env, COPYFILE_DISABLE: '1' },
    stdio: 'inherit',
  })

  if (result.status !== 0 && !options.allowFailure) process.exit(result.status ?? 1)
}

function appLauncher() {
  return `#!/bin/sh
set -eu
DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
RESOURCES="$DIR/../Resources"
export COMFYFLOW_OPEN_BROWSER=1
exec "$RESOURCES/runtime/node" "$RESOURCES/launcher.mjs"
`
}

function infoPlist(appVersion) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key>
  <string>en</string>
  <key>CFBundleDisplayName</key>
  <string>ComfyFlow</string>
  <key>CFBundleExecutable</key>
  <string>ComfyFlow</string>
  <key>CFBundleIdentifier</key>
  <string>com.comfyflow.app</string>
  <key>CFBundleInfoDictionaryVersion</key>
  <string>6.0</string>
  <key>CFBundleName</key>
  <string>ComfyFlow</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>${appVersion}</string>
  <key>CFBundleVersion</key>
  <string>${appVersion}</string>
  <key>LSMinimumSystemVersion</key>
  <string>12.0</string>
</dict>
</plist>
`
}
