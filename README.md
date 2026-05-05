# CareerForge AI

Cross-platform resume, cover letter, and application tracking workspace.

## Local Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Desktop builds use Tauri and require the Rust toolchain:

```bash
npm run tauri:dev
npm run tauri:build
```

## Git Cadence

```bash
git branch -M main
git checkout -b codex/setup-core
git add .
git commit -m "Commit 1: scaffold app shell and ATS core"
git push -u origin codex/setup-core
```

Next branches:

- `codex/auth-sync`
- `codex/key-vault`
- `codex/generator-workspace`
- `codex/tracker-dashboard`
- `codex/export-pipeline`
- `codex/tauri-release`

## First Core Files

The ATS engine starts in `src/lib/ats/schemas.ts` because every provider response, UI form, database payload, and DOCX render depends on those contracts. The orchestration lives in `src/lib/ats/engine.ts`, and DOCX rendering lives in `src/lib/docx/render-template.ts`.
