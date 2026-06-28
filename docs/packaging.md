# Packaging And Installation

## Portable Package

Build a portable runtime package:

```bash
pnpm package:portable
```

The output is platform-specific:

```text
dist/comfyflow-darwin-arm64/
```

Run it without installing Node.js:

```bash
./dist/comfyflow-darwin-arm64/comfyflow
```

The portable package includes a bundled Node runtime, backend build output, frontend static files, and production dependencies.

## macOS Installer

Build the macOS installer package:

```bash
pnpm package:macos
```

The output is:

```text
dist/ComfyFlow-1.0.0-darwin-arm64-portable.zip
dist/ComfyFlow-1.0.0-darwin-arm64.pkg
```

The installer writes the app directly to:

```text
/Applications/ComfyFlow.app
```

Install from Finder by opening the `.pkg`, or from the terminal:

```bash
sudo installer -pkg dist/ComfyFlow-1.0.0-darwin-arm64.pkg -target /
```

If a previous broken receipt exists but the app is missing, forget the receipt and reinstall:

```bash
sudo pkgutil --forget com.comfyflow.app
sudo installer -pkg dist/ComfyFlow-1.0.0-darwin-arm64.pkg -target /
```

Open the installed app:

```bash
open /Applications/ComfyFlow.app
```

## Windows Installer

Build the Windows portable zip and installer on Windows:

```powershell
pnpm package:windows
```

The command first builds the Windows portable package:

```text
dist/comfyflow-win32-x64/
```

It then writes a portable zip:

```text
dist/ComfyFlow-1.0.0-win32-x64-portable.zip
```

It also builds an Inno Setup installer:

```text
dist/ComfyFlow-1.0.0-win32-x64-setup.exe
```

The installer requires Inno Setup 6. Install it normally, make sure `ISCC.exe` is on `PATH`, or point to it explicitly:

```powershell
$env:INNO_SETUP_COMPILER = 'C:\Program Files (x86)\Inno Setup 6\ISCC.exe'
pnpm package:windows
```

The Windows installer writes the app to:

```text
C:\Program Files\ComfyFlow
```

It creates a Start Menu shortcut and can optionally create a desktop shortcut. The shortcut launches ComfyFlow hidden and opens the browser automatically.

## GitHub Release Automation

Publishing a GitHub Release triggers `.github/workflows/release-packages.yml`.

The workflow builds and uploads these assets to the release:

```text
ComfyFlow-<version>-darwin-arm64-portable.zip
ComfyFlow-<version>-darwin-arm64.pkg
ComfyFlow-<version>-win32-x64-portable.zip
ComfyFlow-<version>-win32-x64-setup.exe
```

The workflow uses the release tag as `COMFYFLOW_VERSION`. A tag like `v1.2.3` becomes `1.2.3` in the asset filenames.

## Data Locations

Packaged production data is stored outside the install directory so app updates do not overwrite user data.

Default macOS production data directory:

```text
~/Library/Application Support/ComfyFlow
```

Default Windows production data directory:

```text
%APPDATA%\ComfyFlow
```

Production database on macOS:

```text
~/Library/Application Support/ComfyFlow/db.sqlite3
```

Production database on Windows:

```text
%APPDATA%\ComfyFlow\db.sqlite3
```

Production media files on macOS:

```text
~/Library/Application Support/ComfyFlow/storage/images
```

Production media files on Windows:

```text
%APPDATA%\ComfyFlow\storage\images
```

Framework app key on macOS:

```text
~/Library/Application Support/ComfyFlow/app.key
```

Framework app key on Windows:

```text
%APPDATA%\ComfyFlow\app.key
```

Override the data directory when running manually:

```bash
COMFYFLOW_DATA_DIR=/path/to/data ./comfyflow
```

Development and test database paths:

```text
packages/backend/storage/db.sqlite3
packages/backend/db.sqlite3
```

No old `tmp/db.sqlite3` path compatibility or migration is provided.

## Port Behavior

The packaged launcher defaults to `localhost:3333`.

If port `3333` is already in use and `PORT` is not explicitly set, the launcher automatically tries the next available port from `3334` upward. It checks up to 20 ports.

The packaged frontend uses same-origin API and WebSocket URLs in production, so it continues to work when the backend falls back to another port.

When launched as `/Applications/ComfyFlow.app`, the app opens the browser automatically.

To inspect a port conflict:

```bash
lsof -nP -iTCP:3333 -sTCP:LISTEN
```

To force a specific port when running the portable package manually:

```bash
PORT=4444 ./comfyflow
```

If an explicit `PORT` is occupied, startup fails instead of falling back, because the user-provided port is treated as intentional.
