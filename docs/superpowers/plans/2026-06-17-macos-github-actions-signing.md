# macOS GitHub Actions Signing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a macOS-only GitHub Actions workflow for signed and notarized Tauri builds.

**Architecture:** Create one workflow at `.github/workflows/macos-release.yml`. Keep signing and notarization credentials in GitHub Actions secrets, import the certificate into a temporary keychain, then run `tauri-apps/tauri-action@v0`.

**Tech Stack:** GitHub Actions, macOS runner, pnpm, Rust stable, Tauri v2, Apple Developer ID signing, Apple notarization.

---

### Task 1: Add macOS Release Workflow

**Files:**

- Create: `.github/workflows/macos-release.yml`

- [x] **Step 1: Create workflow triggers**

Use `workflow_dispatch`, `main` branch pushes, and `v*` tag pushes.

- [x] **Step 2: Configure macOS-only build matrix**

Build `aarch64-apple-darwin` and `x86_64-apple-darwin` on `macos-latest`.

- [x] **Step 3: Import Apple certificate**

Decode `APPLE_CERTIFICATE_BASE64`, import it into a temporary keychain, and export `APPLE_SIGNING_IDENTITY`.

- [x] **Step 4: Build and notarize with Tauri**

Map secrets to Tauri's expected environment variables:

- `APP_PASSWD` -> `APPLE_PASSWORD`
- `APPLE_CERTIFICATE_BASE64` -> `APPLE_CERTIFICATE`
- `APPLE_CERTIFICATE_PASSWORD` -> `APPLE_CERTIFICATE_PASSWORD`

- [x] **Step 5: Upload artifacts and create draft release for tags**

Upload bundle outputs for all successful runs. Use `tauri-action` release creation only for `refs/tags/v*`.

- [x] **Step 6: Verify YAML syntax and project checks**

Run:

```bash
pnpm run typecheck
```

Expected: TypeScript exits successfully.
