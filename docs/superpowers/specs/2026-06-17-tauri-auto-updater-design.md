# Tauri Auto Updater Design

## Goal

Add Electron-updater-like automatic updates for the macOS Tauri app using the official Tauri updater plugin and public GitHub Releases.

## Distribution Source

The updater checks this public endpoint:

```text
https://github.com/Amadeus-desktop/desktop/releases/latest/download/latest.json
```

The repository and release assets are expected to be publicly readable.

## Trust Model

Apple code signing and notarization remain responsible for macOS trust. Tauri updater signing is separate and verifies that downloaded updater bundles were produced by the trusted release pipeline.

Required GitHub Actions secrets:

- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` if the key has a password

The updater public key is committed in `src-tauri/tauri.conf.json`.

## Runtime Behavior

The React app checks for updates only in Tauri runtime. The check runs shortly after the main app mounts so startup UI is not blocked. If an update is found, the app downloads and installs it, then relaunches.

Failures are logged as warnings and do not block normal app use.

## Release Behavior

The macOS release workflow creates updater artifacts and uploads updater signatures. For tag releases, Tauri Action uploads `latest.json` so installed apps can discover new releases.

## References

- Tauri updater plugin: https://v2.tauri.app/plugin/updater/
- Tauri action updater JSON upload: https://github.com/tauri-apps/tauri-action
