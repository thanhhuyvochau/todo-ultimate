# Electron Packaging

## Overview
Package the application for distribution on Windows, macOS, and Linux using electron-builder. Produce installable executables with auto-update support (future), proper code signing (future), and platform-specific optimizations.

## Requirements
- Use `electron-builder` configured via `electron-builder.json5`.
- Build command: `npm run build` (compiles TS + bundles renderer) then `npm run package` (electron-builder).
- Target formats:
  - **Windows**: NSIS installer (`.exe`), portable (`.exe`).
  - **macOS**: DMG (`.dmg`), optionally MAS (`.pkg`).
  - **Linux**: AppImage (`.AppImage`), Debian (`.deb`).
- App ID: `com.ai-task-planner.app`.
- Product name: "AI Task Planner".
- Icon for all platforms (`.ico` for Windows, `.icns` for macOS, `.png` for Linux).

## Configuration (`electron-builder.json5`)

```json5
{
  appId: 'com.ai-task-planner.app',
  productName: 'AI Task Planner',
  directories: { output: 'dist' },
  files: ['out/**/*'],
  extraResources: [
    { from: 'node_modules/sql.js/dist/sql-wasm.wasm', to: 'sql-wasm.wasm' }
  ],
  win: {
    target: [
      { target: 'nsis', arch: ['x64'] },
      { target: 'portable', arch: ['x64'] }
    ],
    icon: 'build/icon.ico'
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true
  },
  mac: {
    target: ['dmg'],
    category: 'public.app-category.productivity',
    icon: 'build/icon.icns',
    hardenedRuntime: true
  },
  linux: {
    target: ['AppImage', 'deb'],
    category: 'Office',
    icon: 'build/icon.png'
  }
}
```

## Build Scripts

```json
{
  "build": "electron-vite build",
  "package": "electron-builder --config electron-builder.json5",
  "package:win": "electron-builder --win",
  "package:mac": "electron-builder --mac",
  "package:linux": "electron-builder --linux"
}
```

## Package Size Optimization
- Externalize native modules via `electron-vite`'s `externalizeDepsPlugin`.
- `sql.js` WASM file: ~1.2 MB (included as extra resource).
- Exclude devDependencies from packaged app automatically (electron-builder default).
- Final package size estimate: ~100 MB (Electron + Chromium + app code).

## Platform-Specific Notes
- **Windows**: NSIS installer with custom install path option.
- **macOS**: DMG with drag-to-Applications folder. Requires code signing for distribution (Apple notarization).
- **Linux**: AppImage for universal compatibility, `.deb` for Debian/Ubuntu users.

## Security
- ASAR packaging: app code bundled into `app.asar`.
- `contextIsolation: true` and `nodeIntegration: false` maintained in production.
- Content Security Policy (CSP) in renderer HTML header.

## Testing
- Test packaged builds on all target platforms before release.
- Verify WASM file loads correctly from extra resources path.
- Test fresh install (no prior data) and upgrade scenarios.

## Dependencies
- All features (final step before distribution)

## Acceptance Criteria
- [ ] `npm run build` + `npm run package` produces installable output.
- [ ] Windows `.exe` installer works.
- [ ] macOS `.dmg` works (when built on macOS).
- [ ] Linux `.AppImage` / `.deb` works.
- [ ] SQLite WASM file bundled and loads.
- [ ] App icon displays correctly.
- [ ] Fresh install creates database cleanly.
- [ ] Context isolation maintained in production.
