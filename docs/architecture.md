# CareerForge AI Architecture

## Stack

- App shell: Next.js App Router, TypeScript, Tailwind CSS v4, shadcn/ui, Framer Motion, Recharts.
- Desktop: Tauri v2 hosted-web shell loading the production web app. Static export is not used because authenticated Next routes, middleware/proxy, cookies, route handlers, and Server Actions require a server.
- PWA: Next metadata manifest, installable web shell, later service worker for offline drafts.
- Backend: Supabase Auth, Postgres, Storage, Row Level Security, Redis-backed BullMQ workers, and encrypted key handling.
- AI providers: OpenAI, Anthropic Claude, Google Gemini, DeepSeek, and OpenAI-compatible providers through a provider registry.
- Documents: ATS-friendly DOCX placeholder rendering with flat paragraphs/lists only; no nested tables, text boxes, columns, or absolute-positioned shapes.
- Tests: Vitest for ATS scoring, spatial constraints, provider registry/adapters, generation job request validation, and DOCX rendering.

## Production Runtime

- `web`: Next.js App Router server, mobile-first UI, auth, public APIs, and metrics.
- `worker:generation`: BullMQ worker for JD analysis, content generation, ATS scoring, generation run persistence, and DOCX rendering.
- `worker:documents`: reserved heavy export queue for PDF conversion and post-processing.
- `worker:scheduler`: repeatable maintenance queue for stalled jobs and scheduled reminders.
- Redis stores queue state, retries, delayed jobs, and provider/user/key rate-limit buckets.
- Prometheus scrapes `/api/metrics`; `/admin/queues` gives an authenticated queue dashboard.

## Git Workflow

From a brand-new folder:

```bash
git init
git branch -M main
npx create-next-app@latest careerforge-ai --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes
cd careerforge-ai
npx shadcn@latest init --defaults --yes
npm install zod docxtemplater pizzip openai @anthropic-ai/sdk @google/genai @supabase/ssr @supabase/supabase-js recharts framer-motion lucide-react
npm install -D vitest @tauri-apps/cli
git checkout -b codex/setup-core
git add .
git commit -m "Commit 1: scaffold app shell and ATS core"
git push -u origin codex/setup-core
```

Recommended branch cadence:

- `codex/setup-core`: framework scaffold, docs, ATS/spatial/docx core, first tests.
- `codex/auth-sync`: Supabase Auth, profile sync, RLS integration tests.
- `codex/key-vault`: provider key vault UI, local desktop keychain integration, Edge Function encryption.
- `codex/generator-workspace`: split-pane JD/profile/generation flow.
- `codex/tracker-dashboard`: application tracker, stats hub, search, charts.
- `codex/export-pipeline`: DOCX/PDF export, storage upload, PDF previews.
- `codex/tauri-release`: hosted desktop hardening, signing, updater, and production URL management.

Push each branch after every coherent commit, open a draft PR early, and merge only after `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` pass.

## Core Data Model

- `profiles`: one row per user account.
- `master_profiles`: reusable source-of-truth resume/profile data.
- `docx_templates`: uploaded ATS-friendly base templates with placeholder metadata.
- `presets`: master profile + DOCX template + tone rules + provider preferences.
- `llm_key_vault_entries`: encrypted user provider keys, never plaintext.
- `applications`: job/application tracker root entity.
- `generation_runs`: JD analysis, prompt versions, generated JSON, match score, constraint warnings.
- `generation_jobs`: queued/running/final status, BullMQ job IDs, progress, retries, safe errors, token/cost accounting, and result document IDs.
- `documents`: generated resume/cover letter DOCX/PDF storage objects.
- `application_events`: chronological tracker events for statuses and notes.
- `provider_preferences`: user defaults for provider/model/key selection.
- `scheduled_reminders`: delayed follow-ups and stale-application nudges.
- `audit_events`: safe operational events without secrets.

## ATS Three-Step Engine

1. JD analysis extracts role title, company, primary keywords, hard skills, soft skills, responsibilities, and tone.
2. Content generation rewrites master profile blocks into flat placeholder values using JD keywords, action verbs, and metric-forward X-Y-Z bullets.
3. Match verification deterministically compares generated content against extracted keywords, returning percentage, keywords hit, and keywords missed.

The LLM is asked for JSON only. The renderer accepts only placeholder-to-plain-text mappings so generated content drops cleanly into DOCX templates.

## Spatial Constraints

Each DOCX placeholder can define `maxChars`, `maxWords`, and `required`. The generation prompt injects those limits. The app evaluates output before export and blocks DOCX/PDF generation unless the user edits, regenerates, or explicitly allows constraint violations.
