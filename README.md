# CareerForge AI

Responsive web workspace for generating job-specific resumes, cover letters, match briefs, and application follow-ups from reusable profiles, templates, skills, and BYOK LLM providers.

## Runtime

Use Node `20.19.0` or newer. Next 16, Vitest 4, Supabase JS, and the PDF tooling do not run reliably on Node 18.

```bash
nvm use
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Required Services

- Supabase Auth, Postgres, Storage, and the migrations in `supabase/migrations`.
- Redis for BullMQ generation, document, and scheduler workers.
- A stable `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` for horizontally scaled Next instances.
- `KEY_ENCRYPTION_SECRET` for BYOK provider key encryption.

## Production Processes

```bash
npm run build
npm run start:web
npm run worker:generation
npm run worker:documents
npm run worker:scheduler
```

For a tiny free worker host, run the combined supervisor instead:

```bash
npm run worker:all
```

Or use Docker Compose for a local production-like topology:

```bash
docker compose up --build
```

Prometheus metrics are exposed at `/api/metrics`. Queue health is available at `/admin/queues` for users whose email is listed in `ADMIN_EMAILS`.

## Product Flow

1. Import a master profile and DOCX template in `/templates`.
2. Save at least one provider key in `/settings`.
3. Open `/app` from phone or desktop, paste a job description, choose the saved setup, and queue generation.
4. Workers create the match brief, generation run, and DOCX export when the template constraints pass.

## LLM Providers

The provider registry supports native OpenAI, Anthropic, Gemini, and OpenAI-compatible providers including DeepSeek, OpenRouter, Groq, Mistral, Together, Fireworks, Cerebras, Perplexity, xAI, Ollama, and vLLM-compatible endpoints. Keys are encrypted with AES-GCM and never returned through public APIs.

## Desktop

Tauri is now a hosted-web shell. Desktop packages load the production web app from `src-tauri/tauri.conf.json` instead of trying to statically export authenticated Next routes into `out/`.

For a real release, update `build.frontendDist` in `src-tauri/tauri.conf.json` to the deployed app URL before signing.

```bash
npm run tauri:dev
npm run tauri:build
```

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Security Notes

- Do not commit `.env*`; `.gitignore` blocks them.
- Rotate any API key pasted into chat or logs before production use.
- Keep worker payloads ID-only; workers decrypt provider keys server-side.
- Use reverse-proxy request limits in production in addition to app-level rate limits.
