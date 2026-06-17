# Supabase Auth And Edge Function Setup

## Client Environment

The Tauri React client may read only public Supabase values:

- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_ANON_KEY` or `PUBLIC_SUPABASE_PUBLISHABLE_KEY`

The client must not read provider secrets, service-role tokens, or Google client secrets.

## Supabase Secrets

Store these as Supabase Edge Function secrets, not in the client bundle:

- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `LLM_PROVIDER`

The `llm-generate` Edge Function uses those secrets to call OpenAI or Gemini.

## Google Login

Configure Google as a Supabase Auth provider using:

- `GCP_ID`
- `GCP_SECRET`

Those values belong in Supabase Auth provider configuration. They are not read by the Tauri client.

OAuth redirects are split across Google and Supabase:

- Google Cloud Console authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
- Supabase Auth redirect URL for installed app builds: `https://amadeus0.kro.kr/auth/callback`
- Supabase Auth redirect URL for Tauri dev builds: `http://127.0.0.1:17421/auth/callback`
- Supabase Auth redirect URL for browser-only local development: `http://localhost:1420`

The Tauri app starts Google OAuth in the system browser and uses `https://amadeus0.kro.kr/auth/callback` as the Supabase redirect target for installed builds. That web callback must hand the OAuth callback back to the installed app, normally by opening `amadeus://auth/callback?...` with the original query string. The app then exchanges the PKCE `code` for a Supabase session.

In Tauri dev builds, macOS cannot runtime-register a dev deep link handler. The app starts a loopback callback server on `127.0.0.1:17421` (separate from Vite HMR port `1421`), receives the OAuth `code`, and exchanges it from the same Tauri WebView session that created the PKCE verifier.

On macOS, the `amadeus://` handler is registered from the app bundle `Info.plist`. If Chrome reports that `amadeus://` has no registered handler, build or launch the bundled `.app` once so LaunchServices can see the scheme registration.

## Deploy

```bash
supabase functions deploy llm-generate
supabase secrets set OPENAI_API_KEY=... OPENAI_MODEL=...
supabase secrets set GEMINI_API_KEY=... GEMINI_MODEL=...
supabase secrets set LLM_PROVIDER=openai
```

Use either `openai` or `gemini` for `LLM_PROVIDER`. If it is absent, the function prefers OpenAI when `OPENAI_API_KEY` exists, otherwise Gemini.
