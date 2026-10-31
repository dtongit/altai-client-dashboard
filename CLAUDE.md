# CLAUDE.md — altai-client-dashboard

Next.js 16 (App Router, Turbopack) + React 19 + TypeScript + Tailwind v4. Separate git repo (ignored by the root repo).
Verified 2026-10-31; replaces the old `AGENTS.md`.

## Design and development rules
1. Every component must style both light (`bg-white text-zinc-900 border-zinc-200`) and dark (`dark:bg-zinc-900 dark:text-white dark:border-zinc-800`) modes; brand accent is amber-500.
2. All user-facing copy is polished business Russian.
3. Before committing frontend changes `npm run build` must pass with zero TypeScript/Turbopack errors.

## Build & deploy (what actually happens)
```bash
npx tsc --noEmit
npm run build                      # next.config.ts: output: "export", trailingSlash -> static site in ./out
NEXT_PUBLIC_API_URL="http://localhost:8000/api/v1/client" npm run dev
```
- Deployed as a **static export** to Cloudflare Pages by `.github/workflows/deploy.yml`:
  push `main` -> project `altai-client-dashboard` (my.altaiweb.online, API `api.optima.altaiweb.online`);
  push `stage` -> `altai-stage-dashboard` (stage.altaiweb.online, API `stage-api.optima.altaiweb.online`).
  `scripts/deploy.py` in the root repo pushes this repo's HEAD to those branches.
- The stale `Dockerfile`/`docker-compose.yml` were removed (2026-10-31); a static export can't run in them.
- Static export => no server code, no middleware, no API routes, no runtime env. `NEXT_PUBLIC_*` are baked at build.
- `/demo/[tenant]` is pre-rendered only for the ids in `generateStaticParams` (`src/app/demo/[tenant]/page.tsx`);
  other tenants fall back via `public/_redirects` to `/demo/` (generic page reads tenant from the URL client-side).
  Adding a tenant with its own OG metadata = add it to `generateStaticParams` + `src/lib/tenants.ts`.

## Structure
- `src/lib/api.ts` — the only HTTP client. Base URL from `NEXT_PUBLIC_API_URL`; derives `/api/v1/admin` and
  `/api/v1/demo`. Token + tenant kept in memory and `localStorage` (`altai_token`, `altai_tenant`); sends
  `Authorization: Bearer` and `X-Tenant-ID`.
- `src/lib/auth-context.tsx` (`useAuth`), `src/lib/theme-context.tsx`, `src/lib/tenants.ts` (display names / brand
  configs per demo tenant — the one sanctioned place for tenant branding in the frontend).
- `src/types/index.ts` — keep in sync with Rust DTOs in `altai-core/src/models/mod.rs` and handler JSON in
  `altai-core/src/api/*.rs`.
- Pages: `/` showcase, `/login`, `/vera` KPIs, `/chats` live dialogs + takeover, `/simulator`, `/settings`,
  `/knowledge` Employee Studio (**3 tabs**: `prompts`, `kb`, `skills` — ~107 KB single file), `/admin` (+ `/admin/chats`,
  `/admin/team-chats`), `/demo`, `/demo/[tenant]`.
- Big single-file pages (`knowledge/page.tsx`, `admin/chats/page.tsx`): prefer targeted edits; extract components
  only when asked.

## Known issues (review 2026-10-31)
- Dead `/catalog/*` API calls and types were removed (2026-10-31).
- Auth token in `localStorage` is readable by any XSS; the backend also sets an HttpOnly cookie, so one of the two is
  redundant.
- Markdown/link renderers (`components/markdown-view.tsx`, `formatted-message-text.tsx`) put LLM/customer-provided URLs
  straight into `href`; React 19 blocks `javascript:` but add an explicit http(s)-only allowlist.
- `/admin` is only hidden client-side; real protection must come from the backend (which currently has auth bypasses,
  see `altai-core/CLAUDE.md`).
