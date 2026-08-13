/**
 * Electron 43+ ships without a `postinstall` hook: its binary is downloaded
 * lazily the first time something does `require('electron')`. pnpm never
 * triggers that path, and electron-vite resolves the executable by reading
 * `path.txt` directly (throwing `Electron uninstall` when it is absent), so the
 * binary is never fetched on a fresh install. Run the Electron installer
 * explicitly on every install so the executable is always present.
 */
const { spawnSync } = require('node:child_process')

const installScript = require.resolve('electron/install.js')
const result = spawnSync(process.execPath, [installScript], { stdio: 'inherit' })

process.exit(result.status ?? 1)
