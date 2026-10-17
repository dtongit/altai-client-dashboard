# Руководство для ИИ-агентов: `altai-client-dashboard` (Next.js Client Dashboard & Superadmin Console)

`altai-client-dashboard` — единое фронтенд-приложение платформы ALTAI Optima на **Next.js 16 (App Router, Turbopack) + React 19 + TypeScript + Tailwind CSS v4**. Оно объединяет:
1. **Личный кабинет клиента (B2B Portal)** для управления цифровым ИИ-штатом (ИИ-продавец Вера).
2. **Студию настройки и кода ИИ-сотрудника (`/knowledge`)** с чатом ИИ-Архитектора, версионированием промптов и IDE кастомных JS-навыков для песочницы `altai-sandboxd`.
3. **Суперадмин-консоль БД (`/admin`)**, полностью заменившую старую админку Python `SQLAdmin`.

---

## 🛠️ 1. Команды разработки и сборки

```bash
# Проверка типов TypeScript без генерации файлов
npx tsc --noEmit

# Продакшн-сборка (проверяет все роуты и статическую генерацию)
npm run build

# Запуск dev-сервера (по умолчанию http://localhost:3000)
NEXT_PUBLIC_API_URL="http://localhost:8000/api/v1/client" npm run dev
```

---

## 📂 2. Карта страниц и маршрутов (`src/app/`)

* [`src/app/layout.tsx`](file:///home/d/ALTAI/altai-client-dashboard/src/app/layout.tsx) — корневой макет: подключает шрифты `Geist`/`Geist_Mono`, `ThemeProvider`, `AuthProvider` и оболочку [`LayoutShell`](file:///home/d/ALTAI/altai-client-dashboard/src/components/layout-shell.tsx).
* [`src/app/page.tsx`](file:///home/d/ALTAI/altai-client-dashboard/src/app/page.tsx) — **Витрина ИИ-штата компании (`/`)**:
  * Отображает активного сотрудника **Веру** (с переходом в `/vera`) и карточки будущих сотрудников (Марк, Игорь, Антон), а также баннер привязки Telegram-бота для уведомлений.
* [`src/app/login/page.tsx`](file:///home/d/ALTAI/altai-client-dashboard/src/app/login/page.tsx) — страница входа (`/login`).
* [`src/app/vera/page.tsx`](file:///home/d/ALTAI/altai-client-dashboard/src/app/vera/page.tsx) — **Сводка и KPI Веры (`/vera`)**:
  * Дашборд конверсии, квалифицированных лидов, сэкономленного ФОТ, скорости ответа (TTFT) и графиков активности по дням.
* [`src/app/chats/page.tsx`](file:///home/d/ALTAI/altai-client-dashboard/src/app/chats/page.tsx) — **Живые диалоги (`/chats`)**:
  * Список диалогов из всех каналов (Telegram, WhatsApp, Web), карточка BANT-квалификации и кнопки перехвата управления оператором (**Human Takeover**: `pauseChat` / `resumeChat`).
* [`src/app/simulator/page.tsx`](file:///home/d/ALTAI/altai-client-dashboard/src/app/simulator/page.tsx) — **Тренажер Веры (`/simulator`)**:
  * Песочница для тестирования диалогов с Верой от лица покупателя с отображением статуса BANT-квалификации в реальном времени.
* [`src/app/settings/page.tsx`](file:///home/d/ALTAI/altai-client-dashboard/src/app/settings/page.tsx) — **Каналы и статус (`/settings`)**:
  * Статус подключения CRM (amoCRM / Битрикс24), мессенджеров и управление подписчиками Telegram-уведомлений.
* [`src/app/knowledge/page.tsx`](file:///home/d/ALTAI/altai-client-dashboard/src/app/knowledge/page.tsx) — **Студия настройки и кода Веры (`/knowledge`)**:
  * **Вкладка 1 — «ИИ-Архитектор (Чат)»:** диалог с мета-агентом (`POST /employees/vera/configurator/chat`), который по текстовому запросу клиента редактирует системный промпт или пишет/тестирует кастомный JS-инструмент, выводя интерактивные карточки изменений (unified diff промпта + результат теста в `altai-sandboxd`).
  * **Вкладка 2 — «Промпт и Версии»:** Markdown-редактор системного промпта и базы знаний (`PUT /knowledge`), журнал версий и откат к любой предыдущей версии в 1 клик (`POST /employees/vera/prompts/rollback`).
  * **Вкладка 3 — «JS-Навыки (Песочница)»:** полноценная IDE кастомных инструментов (`POST /employees/vera/tools`, `POST /employees/vera/tools/{id}/test`): редактор кода `async function execute(args, ctx)`, редактор JSON Schema аргументов, консоль тестового запуска в `altai-sandboxd` (время выполнения, `console.log`, результат JSON) и история версий кода инструмента.
  * **Вкладка 4 — «Секреты»:** управление зашифрованными ключами тенанта (`ctx.secrets.KEY_NAME`), передаваемыми в песочницу.
* [`src/app/admin/page.tsx`](file:///home/d/ALTAI/altai-client-dashboard/src/app/admin/page.tsx) — **Суперадмин-консоль БД (`/admin`)**:
  * Полная замена Python `SQLAdmin`. Доступна пользователям с `user.is_admin === true`.
  * Боковая панель со всеми 12 таблицами БД (`tenants`, `users`, `openrouter-models`, `prompts`, `prompt-versions`, `custom-tools`, `interaction-logs`, `campaigns`, `feedbacks`, `training-runs`, `tester-templates`, `emulation-results`), верхняя панель системной телеметрии (`/api/v1/admin/stats`), поиск, создание, JSON-редактирование и удаление записей.

---

## 🧩 3. Ключевые модули и компоненты (`src/lib/`, `src/components/`, `src/types/`)

* [`src/types/index.ts`](file:///home/d/ALTAI/altai-client-dashboard/src/types/index.ts) — все TypeScript-интерфейсы API (включая `EmployeeConfigResponse`, `CustomToolItem`, `SandboxExecutionResult`, `ConfiguratorChatResponse`, `AdminCrudResourceSchema`).
* [`src/lib/api.ts`](file:///home/d/ALTAI/altai-client-dashboard/src/lib/api.ts) — HTTP-клиент к `altai-core`:
  * `API_BASE_URL` указывает на `/api/v1/client` (по умолчанию `https://api.optima.altaiweb.online/api/v1/client`).
  * `ADMIN_API_BASE_URL` автоматически вычисляется заменой `/api/v1/client` на `/api/v1/admin`.
  * Автоматически прокидывает заголовки `Authorization: Bearer <token>` и `X-Tenant-ID: <tenantId>` из `localStorage`.
* [`src/lib/auth-context.tsx`](file:///home/d/ALTAI/altai-client-dashboard/src/lib/auth-context.tsx) — контекст авторизации (`useAuth()`), хранящий `user`, `tenant`, `availableTenants`, метод `switchTenant(tenantId)` (для переключения активной компании суперадмином) и `toggleActive()` (Master Kill Switch).
* [`src/components/navbar.tsx`](file:///home/d/ALTAI/altai-client-dashboard/src/components/navbar.tsx) — верхняя панель:
  * Отображает логотип ALTAI Optima + имя компании (или селектор переключения тенанта для суперадмина).
  * Кнопка перехода в **«СУПЕРАДМИН / БД» (`/admin`)** для администраторов.
  * Глобальный рубильник **«Вера активна / ИИ на паузе»** с модальным подтверждением.
* [`src/components/sidebar.tsx`](file:///home/d/ALTAI/altai-client-dashboard/src/components/sidebar.tsx) — левое меню разделов конкретного ИИ-сотрудника (`/vera`, `/chats`, `/simulator`, `/settings`, `/knowledge`). Скрывается на страницах `/`, `/login` и `/admin` (управляется в [`src/components/layout-shell.tsx`](file:///home/d/ALTAI/altai-client-dashboard/src/components/layout-shell.tsx)).

---

## 🎨 4. Правила стилизации и разработки для агентов

1. **Поддержка светлой и темной тем:** Все компоненты обязаны иметь корректные классы как для светлой темы (`bg-white`, `text-zinc-900`, `border-zinc-200`), так и для темной (`dark:bg-zinc-900`, `dark:text-white`, `dark:border-zinc-800`) с фирменным золотисто-янтарным акцентом (`amber-500`).
2. **Язык интерфейса:** Весь пользовательский текст в кабинете клиента должен быть на грамотном деловом русском языке.
3. **Обязательная проверка сборки:** После любых изменений в компонентах или типах выполняй `npx tsc --noEmit` или `npm run build`.
