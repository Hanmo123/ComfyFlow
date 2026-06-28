import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const packageJson = JSON.parse(await readFile(path.join(rootDir, 'package.json'), 'utf8'))
const version = process.env.COMFYFLOW_VERSION || packageJson.version || '0.0.0'
const arch = process.arch
const distDir = path.join(rootDir, 'dist')
const portableDir = path.join(distDir, `comfyflow-${process.platform}-${arch}`)
const zipPath = path.join(distDir, `ComfyFlow-${version}-${process.platform}-${arch}-portable.zip`)
const setupName = `ComfyFlow-${version}-${process.platform}-${arch}-setup`
const setupPath = path.join(distDir, `${setupName}.exe`)
const workDir = path.join(os.tmpdir(), `comfyflow-windows-${process.pid}`)
const issPath = path.join(workDir, 'ComfyFlow.iss')

if (process.platform !== 'win32') {
  console.error('Windows packaging must run on Windows so the bundled Node runtime and native dependencies match win32.')
  process.exit(1)
}

run('node', ['scripts/package-portable.mjs'])

await rm(workDir, { recursive: true, force: true })
await rm(zipPath, { force: true })
await rm(setupPath, { force: true })
await mkdir(workDir, { recursive: true })

await writeFile(path.join(portableDir, 'ComfyFlow.cmd'), installedCommandLauncher(), { mode: 0o644 })
await writeFile(path.join(portableDir, 'ComfyFlow.vbs'), hiddenLauncher(), { mode: 0o644 })
await writeFile(issPath, innoSetupScript(), { mode: 0o644 })

run('powershell.exe', [
  '-NoProfile',
  '-ExecutionPolicy',
  'Bypass',
  '-Command',
  `Compress-Archive -Path ${psQuote(path.join(portableDir, '*'))} -DestinationPath ${psQuote(zipPath)} -Force`,
])

const innoCompiler = findInnoSetupCompiler()
if (!innoCompiler) {
  console.error('Inno Setup compiler not found. Install Inno Setup 6 or set INNO_SETUP_COMPILER to ISCC.exe.')
  process.exit(1)
}

run(innoCompiler, [issPath])
await rm(workDir, { recursive: true, force: true })

console.log(`Windows portable package ready: ${path.relative(rootDir, zipPath)}`)
console.log(`Windows installer ready: ${path.relative(rootDir, setupPath)}`)

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    env: process.env,
    stdio: 'inherit',
    shell: false,
  })

  if (result.status !== 0) process.exit(result.status ?? 1)
}

function findInnoSetupCompiler() {
  if (process.env.INNO_SETUP_COMPILER && existsSync(process.env.INNO_SETUP_COMPILER)) {
    return process.env.INNO_SETUP_COMPILER
  }

  const candidates = [
    path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Inno Setup 6', 'ISCC.exe'),
    path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Inno Setup 6', 'ISCC.exe'),
  ]

  const candidate = candidates.find((filePath) => existsSync(filePath))
  if (candidate) return candidate

  const whereResult = spawnSync('where.exe', ['ISCC.exe'], { encoding: 'utf8' })
  const firstMatch = whereResult.stdout?.split(/\r?\n/).find(Boolean)
  return firstMatch || null
}

function installedCommandLauncher() {
  return `@echo off
setlocal
set "DIR=%~dp0"
set "COMFYFLOW_OPEN_BROWSER=1"
"%DIR%runtime\\node.exe" "%DIR%launcher.mjs" %*
`
}

function hiddenLauncher() {
  return `Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
appDir = fso.GetParentFolderName(WScript.ScriptFullName)
shell.CurrentDirectory = appDir
shell.Run Chr(34) & appDir & "\\ComfyFlow.cmd" & Chr(34), 0, False
`
}

function windowsScriptHostCommand() {
  return '{sys}\\wscript.exe'
}

function windowsScriptHostArgs(scriptPath) {
  return `//B //NoLogo "${scriptPath}"`
}

function innoSetupScript() {
  return `#define AppName "ComfyFlow"
#define AppVersion "${version}"

[Setup]
AppId={{D6F0668D-8347-4DC0-90AF-1B038EFC5D1F}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher=ComfyFlow
DefaultDirName={autopf}\\ComfyFlow
DefaultGroupName=ComfyFlow
DisableProgramGroupPage=yes
OutputDir=${innoQuote(distDir)}
OutputBaseFilename=${setupName}
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
ArchitecturesInstallIn64BitMode=x64compatible
UninstallDisplayIcon={sys}\\wscript.exe

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Additional shortcuts:"; Flags: unchecked

[Files]
Source: ${innoQuote(path.join(portableDir, '*'))}; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\\ComfyFlow"; Filename: "${windowsScriptHostCommand()}"; Parameters: ${innoQuote(windowsScriptHostArgs('{app}\\ComfyFlow.vbs'))}; WorkingDir: "{app}"
Name: "{autodesktop}\\ComfyFlow"; Filename: "${windowsScriptHostCommand()}"; Parameters: ${innoQuote(windowsScriptHostArgs('{app}\\ComfyFlow.vbs'))}; WorkingDir: "{app}"; Tasks: desktopicon

[Run]
Filename: "${windowsScriptHostCommand()}"; Parameters: ${innoQuote(windowsScriptHostArgs('{app}\\ComfyFlow.vbs'))}; Description: "Launch ComfyFlow"; Flags: postinstall nowait skipifsilent
`
}

function psQuote(value) {
  return `'${value.replaceAll("'", "''")}'`
}

function innoQuote(value) {
  return `"${value.replaceAll('"', '""')}"`
}
