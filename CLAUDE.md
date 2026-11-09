# CLAUDE.md — altai-client-dashboard

Next.js 16 (App Router, Turbopack) + React 19 + TypeScript + Tailwind v4. Separate git repo (ignored by the root repo).
Verified 2026-10-31; replaces the old `AGENTS.md`.

## Design and development rules
0. Whenever the backend DB schema changes, `/admin` (`src/app/admin/page.tsx`, `src/types/index.ts`) must be updated in the same change (see `altai-core/CLAUDE.md` rule 0).
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
- Demos are **not** part of the dashboard any more (moved to the `optima` repo, 2026-11-01). `public/_redirects` sends `/demo/*` to `https://optima.altaiweb.online/demo/?t=<tenant>`.

## Structure
- `src/lib/api.ts` — the only HTTP client. Base URL from `NEXT_PUBLIC_API_URL`; derives `/api/v1/admin`.
  Token + tenant kept in memory and `localStorage` (`altai_token`, `altai_tenant`); sends
  `Authorization: Bearer` and `X-Tenant-ID`.
- `src/lib/auth-context.tsx` (`useAuth`: `role` = global flag only `superadmin|demo_manager|null`, `permissions`, `allowedEmployees`, `can(cap)`, `hasEmployee(id)`, `availableTenants`, `switchTenant`; permissions and AI-employee access are per company (epic #324 memberships); if `/auth/me` has no `permissions` (old backend) `legacyCaps` in `lib/permissions.ts` is the fallback), `src/lib/permissions.ts` (cap ids, Russian labels, AI employee list, `ROLE_LABELS` only «Администратор»/«Демо-менеджер»; no role presets any more), `src/lib/toast-context.tsx` (`useToast`), `src/lib/theme-context.tsx`.
- `src/types/index.ts` — keep in sync with Rust DTOs in `altai-core/src/models/mod.rs` and handler JSON in
  `altai-core/src/api/*.rs`.
- Access control (#80/#81): caps `master_switch|settings|instructions|manage_users|audit_log|alerts|bot_changes`, no role presets: a membership is a plain permission list. `components/layout-shell.tsx` is the single page guard (`/settings` needs `settings`, `/knowledge` `instructions`, `/team` `manage_users`, `/vera` `/chats` `/simulator` access to AI employee `vera`; denied = toast + redirect to `/vera` or `/`). Sidebar (plus the phone strip `MobileNav`; the sidebar is hidden below `md`) and the navbar (company switcher `<select>` for ANY user with `available_tenants.length > 1`, shown via `X-Tenant-ID`; label only for admin/demo manager; «Команда и доступы» link, master switch only with `master_switch`, hint «Остановлена: …» from `/audit-log?action=vera.paused&limit=1` when the user has `audit_log`) filter by the same helpers. `/` lists only allowed AI employees, empty state otherwise.
- `/team` «Команда и доступы» (`app/team/page.tsx`): the list is the current company's memberships. API `GET /users` (`membership{permissions,employee_ids "*"|[...],is_active}`, `telegram{...,bot_username}`), `POST /users` (`permissions`, `employee_ids`, optional `password`; `existing_account: true` -> toast «Пользователь уже существует — добавлен в компанию»), `PATCH /users/{id}` (permissions, employee_ids, is_active, password: only an administrator may change another account's password, so the password field of the edit form is hidden for everybody else except on their own row; the API's 403 text is shown in the form), `DELETE /users/{id}` = «Убрать из компании» (membership only), `POST /users/{id}/telegram-invite` (the toast names the bot of the link; 409 text when no global bot is free), `GET /audit-log`. Caps/employees the editor lacks are disabled; own row = password only. The legacy `/team/members` list shows only rows without `user_id` (removable). `/team/invite` takes no role.
- Pages: `/` showcase, `/login`, `/vera` KPIs, `/chats` live dialogs + takeover, `/simulator`, `/settings`,
  `/knowledge` Employee Studio (**3 tabs**: `prompts`, `kb`, `skills` — ~107 KB single file), `/admin` (+ `/admin/chats`,
  `/admin/team-chats`). `/admin` also manages `kind`/`source_tenant_id`/`demo_config` of tenants and the one-time issuing of demo API keys (resource `api-keys`) and the read-only `knowledge-node-versions` (KB history, #185); new `tenant-memberships` resource (`permissions`, `employee_ids`, `is_active` per user and tenant, #324) and `tenant_team_members.bot_id`. In `/knowledge` kb tab a node has «История» / «Восстановить» (versions API in `altai-core/CLAUDE.md`). KB node photos (#147): `components/knowledge/KbMediaEditor.tsx` uploads via `api.uploadKnowledgeMedia` (multipart `POST /knowledge/media`, max 10 photos, https only, id/caption preserved on save).
- `/admin/team-chats` has a «Чат» | «Трейс» switch in the conversation header. «Трейс» (`team-chats/trace-view.tsx`, API `getTeamChatTrace`, types `TeamTrace*`) is the debug view of a manager's conversation with Vera: totals + per-model chips, turns newest first (collapsed row, expanded numbered steps: prompt, LLM, tool, reviewer, changeset with diffs), standalone changeset events. Backend in `altai-core/CLAUDE.md` (`services/team_trace.rs`); `/admin` shows the read-only resources `team-trace-steps` and `team-bot-messages` (#309: every team-bot message a member can reply to, with its kind and reference; type `TeamBotMessage`). Changeset status may also be `superseded` (#312).
- `/settings` («Выключатели», #242): `page.tsx` holds state; components in `src/app/settings/`: `ChannelModeToggle` (Выкл / Пре-модерация / Автопилот, modes `off|hitl|auto`), `ChannelCard`, `InstagramCard` (Direct + Комментарии), `UmnicoCard` (shown only when Umnico has a token or serves a listed channel; otherwise staff get a «Подключить Umnico» link; status for all, token form/webhook only for `user.is_admin`), `TeamBotCard` (superadmin «Telegram-бот команды»: `POST/DELETE /api/v1/admin/tenants/{id}/team-bot`, current own bot read from `crm_credentials.team_bot.username` of the tenant via admin CRUD, empty = shared bot), `channel-meta.ts` (labels, order, line status texts). The channel list comes only from `GET /channels`; the mode is changed with `POST /channels/{id}/mode` (no optimistic UI, server mode shown, error `detail` inline). Autopilot is greyed out when `auto_allowed=false` (tenant flag `ready_for_auto`, editable in `/admin` tenant form checkbox). Bottom section «Интеграции» = Umnico + CRM cards.
- `/admin` resource `prompt-modules`: rows with `scope=global` are read-only (JSON view, no save or delete; the API answers 403, #246). Their text comes from `altai-core/seeds/global_prompt_modules.json`.
- Accounts with the global `demo_manager` flag have no membership: the backend limits them to `kind=demo` tenants (picker comes from `available_tenants`).
- Big single-file pages (`knowledge/page.tsx`, `admin/chats/page.tsx`): prefer targeted edits; extract components
  only when asked.

## Known issues (review 2026-10-31)
- Dead `/catalog/*` API calls and types were removed (2026-10-31). `/admin` create templates (`DEFAULT_TEMPLATES`) only exist for resources whose backend `crud_create` is implemented (tenants, users, prompt-modules, knowledge-nodes, tenant-secrets, tenant-employees, campaigns, openrouter-models).
- Auth token in `localStorage` is readable by any XSS; the backend also sets an HttpOnly cookie, so one of the two is
  redundant.
- Markdown/link renderers (`components/markdown-view.tsx`, `formatted-message-text.tsx`) put LLM/customer-provided URLs
  straight into `href`; React 19 blocks `javascript:` but add an explicit http(s)-only allowlist.
- `/admin` is only hidden client-side; real protection must come from the backend (which currently has auth bypasses,
  see `altai-core/CLAUDE.md`).
