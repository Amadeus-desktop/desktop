# macOS GitHub Actions Signing Design

## Goal

Add a macOS-only GitHub Actions workflow that builds the Tauri app, signs it with an Apple Developer certificate, notarizes it with Apple, uploads build artifacts, and creates a GitHub Release for `v*` tag pushes.

## Triggers

The workflow runs for:

- Manual `workflow_dispatch`
- Pushes to `main`
- Pushes to tags matching `v*`

Tag pushes are the release path. For example:

```bash
git tag v0.1
git push origin v0.1
```

## Secrets

Use these GitHub Actions secrets:

- `APP_NAME`: display name for artifacts and releases
- `APP_PASSWD`: Apple ID app-specific password for notarization
- `APPLE_ID`: Apple ID email
- `APPLE_TEAM_ID`: Apple Developer Team ID
- `APPLE_CERTIFICATE_BASE64`: base64-encoded `.p12` Developer ID Application certificate
- `APPLE_CERTIFICATE_PASSWORD`: password used when exporting the `.p12` certificate

`APP_PASSWD` and `APPLE_CERTIFICATE_PASSWORD` are intentionally separate. Apple notarization and `.p12` import use different credentials.

## Build Strategy

The workflow uses `macos-latest` only and builds both Apple Silicon and Intel targets:

- `aarch64-apple-darwin`
- `x86_64-apple-darwin`

It installs dependencies with `pnpm`, uses the project `beforeBuildCommand` from `src-tauri/tauri.conf.json`, imports the `.p12` certificate into a temporary keychain, then runs Tauri's GitHub action.

## Release Behavior

Every successful run uploads artifacts. Only `refs/tags/v*` runs create a draft GitHub Release using the pushed tag name.

## References

- Tauri macOS signing and notarization: https://v2.tauri.app/distribute/sign/macos/
- Tauri GitHub Actions pipeline: https://v2.tauri.app/distribute/pipelines/github/
