# Agent Guide: `altai-client-dashboard` (Next.js 16 Client Dashboard & Studio)

`altai-client-dashboard` is the unified frontend web application of the ALTAI Optima platform built on **Next.js 16 (App Router, Turbopack) + React 19 + TypeScript + Tailwind CSS v4**. It encompasses:
1. **Client B2B Portal** for managing the autonomous digital workforce (AI SDR Vera).
2. **Employee Studio (`/knowledge`)** featuring the Modular Prompts Studio, Dynamic Knowledge Mind-Map (L0/L1/L2), Universal Product Catalog & Live Inventory, JS Skills IDE for `altai-sandboxd`, and Secrets Vault.
3. **Superadmin Database Console (`/admin`)**, a high-performance modern replacement for legacy Python SQLAdmin.

---

## 🛠️ 1. Build and Development Commands

```bash
# Type check without file emission
npx tsc --noEmit

# Production build (validates Turbopack bundling, all 33 routes, and SSG generation)
npm run build

# Start local dev server (default: http://localhost:3000)
NEXT_PUBLIC_API_URL="http://localhost:8000/api/v1/client" npm run dev
```

---

## 📂 2. Route & Page Architecture (`src/app/`)

* [`src/app/layout.tsx`](file:///home/d/ALTAI/altai-client-dashboard/src/app/layout.tsx) — Root layout: injects `Geist` and `Geist_Mono` typography, `ThemeProvider`, `AuthProvider`, and [`LayoutShell`](file:///home/d/ALTAI/altai-client-dashboard/src/components/layout-shell.tsx).
* [`src/app/page.tsx`](file:///home/d/ALTAI/altai-client-dashboard/src/app/page.tsx) — **Digital Workforce Showcase (`/`)**:
  * Displays active employee **Vera** (with direct navigation to `/vera`), upcoming digital staff cards (Mark, Igor, Anton), and Telegram bot connection banner.
* [`src/app/login/page.tsx`](file:///home/d/ALTAI/altai-client-dashboard/src/app/login/page.tsx) — Authentication portal (`/login`).
* [`src/app/vera/page.tsx`](file:///home/d/ALTAI/altai-client-dashboard/src/app/vera/page.tsx) — **Vera Performance & KPIs (`/vera`)**:
  * Real-time metrics: conversion rate, BANT-qualified leads, estimated payroll saved, average response latency (TTFT), and daily conversation volume charts.
* [`src/app/chats/page.tsx`](file:///home/d/ALTAI/altai-client-dashboard/src/app/chats/page.tsx) — **Live Omnichannel Conversations (`/chats`)**:
  * Omnichannel message feed (Telegram, WhatsApp, Web, Instagram), structured BANT qualification badge, and **Operator Takeover** controls (`pauseChat` / `resumeChat`).
* [`src/app/simulator/page.tsx`](file:///home/d/ALTAI/altai-client-dashboard/src/app/simulator/page.tsx) — **Interactive Sales Simulator (`/simulator`)**:
  * Interactive dialogue testing arena with Vera from a customer's perspective, providing real-time visual inspection of the BANT state machine.
* [`src/app/settings/page.tsx`](file:///home/d/ALTAI/altai-client-dashboard/src/app/settings/page.tsx) — **Channel & Integration Settings (`/settings`)**:
  * Connection health for CRM systems (amoCRM / Bitrix24), messenger channels, and Telegram notification subscriber lists.
* [`src/app/knowledge/page.tsx`](file:///home/d/ALTAI/altai-client-dashboard/src/app/knowledge/page.tsx) — **Employee Studio (`/knowledge`)**:
  * **Tab 1: "Instructions" (`prompt`):** View active system prompt text, review version history journal, and rollback to any previous version with a single click.
  * **Tab 2: "Prompt Layers" (`modules`):** Manage modular system prompt layers: filter by scope (Global vs Tenant), category (`personality`, `safety`, `sales_playbook`, `objections`, `role_boss`), override mode (`replace`, `append`, `prepend`, `disabled`), priority order, and active status toggle.
  * **Tab 3: "Knowledge Base" (`kb`):** Dynamic Mind-Map tree view with tier badges (`L0` Core, `L1` Index, `L2` On-Demand), high-confidence trigger tags, attached media image previews, and full Markdown editing.
  * **Tab 4: "Catalog & Inventory" (`catalog`):** Product catalog cards with SKU, category, price, and **Live Inventory Matrix** (interactive variant/size availability buttons that toggle stock in real time).
  * **Tab 5: "Skills" (`tools`):** IDE for custom JavaScript tools executed in `altai-sandboxd`: code editor, JSON Schema parameters, version journal, and real-time sandbox test runner.
  * **Tab 6: "Secrets" (`secrets`):** Secure storage for encrypted API keys and tokens injected into the isolated sandbox (`ctx.secrets`).
* [`src/app/admin/page.tsx`](file:///home/d/ALTAI/altai-client-dashboard/src/app/admin/page.tsx) — **Superadmin Database Console (`/admin`)**:
  * Full modern replacement for Python `SQLAdmin`. Accessible to users with `user.is_admin === true`.
  * Sidebar navigation for all database resources (`tenants`, `users`, `openrouter-models`, `prompts`, `prompt-versions`, `custom-tools`, `interaction-logs`, `campaigns`, `feedbacks`, `training-runs`, `tester-templates`, `emulation-results`), system telemetry cards, full-text search, inline record creation, JSON editors, and deletion.

---

## 🧩 3. Key Libraries, State, and API Services

* [`src/types/index.ts`](file:///home/d/ALTAI/altai-client-dashboard/src/types/index.ts) — TypeScript interfaces for all platform entities:
  * `KnowledgeNode`: path, parent_path, tier (`L0`|`L1`|`L2`), high_confidence_triggers, media_attachments, summary, content.
  * `CatalogItem` and `CatalogInventory`: SKU, title, category, price, variant_key, is_available, quantity.
  * `PromptModule`: slug, scope (`global`|`tenant`), override_mode (`replace`|`append`|`prepend`|`disabled`), priority_order, allowed_roles.
  * `EmployeeConfigResponse`, `CustomToolItem`, `SandboxExecutionResult`, `AdminCrudResourceSchema`.
* [`src/lib/api.ts`](file:///home/d/ALTAI/altai-client-dashboard/src/lib/api.ts) — Typed HTTP client for `altai-core`:
  * Base URL points to `/api/v1/client` (defaults to `https://api.optima.altaiweb.online/api/v1/client`).
  * Admin base URL points to `/api/v1/admin`.
  * Automatically injects `Authorization: Bearer <token>` and `X-Tenant-ID: <tenantId>` headers from client storage.
* [`src/lib/auth-context.tsx`](file:///home/d/ALTAI/altai-client-dashboard/src/lib/auth-context.tsx) — Authentication state provider (`useAuth()`): manages `user`, active `tenant`, available tenant list, `switchTenant(tenantId)` (for superadmin impersonation), and master platform pause switch.

---

## 🎨 4. Frontend Design & Development Invariants

1. **Dark & Light Mode Support:** Every component must include explicit, robust Tailwind styling for both light (`bg-white`, `text-zinc-900`, `border-zinc-200`) and dark modes (`dark:bg-zinc-900`, `dark:text-white`, `dark:border-zinc-800`), accented with the brand's signature amber highlight (`amber-500`).
2. **User Interface Language:** All user-facing copy, labels, tooltips, and explanations in the client dashboard must be written in polished, business-grade Russian.
3. **Build Integrity:** Prior to committing any frontend changes, verify that `npm run build` completes with zero TypeScript or Turbopack errors.
