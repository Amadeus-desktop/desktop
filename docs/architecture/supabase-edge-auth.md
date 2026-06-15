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

## Deploy

```bash
supabase functions deploy llm-generate
supabase secrets set OPENAI_API_KEY=... OPENAI_MODEL=...
supabase secrets set GEMINI_API_KEY=... GEMINI_MODEL=...
supabase secrets set LLM_PROVIDER=openai
```

Use either `openai` or `gemini` for `LLM_PROVIDER`. If it is absent, the function prefers OpenAI when `OPENAI_API_KEY` exists, otherwise Gemini.
