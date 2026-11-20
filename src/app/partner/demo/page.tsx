"use client";

import React, { useState } from "react";
import { Check, ChevronDown, Copy, ExternalLink, Eye, EyeOff, MessagesSquare, Plus, RefreshCw, X } from "lucide-react";
import { api, API_BASE_URL } from "@/lib/api";
import { PartnerDemo } from "@/types";
import { formatDate, formatDayMonth } from "@/lib/partner-format";
import { safeHttpUrl } from "@/lib/safe-url";
import { Card, Chip, Empty, ErrorBox, Label, PageTitle, Spinner, btnGhost, btnPrimary, useLoad } from "@/components/partner/ui";

/** Public S3 folder with the build-demo skill (source: root repo `demo-builder/`, `publish.py`). */
const SKILL_START = "https://altai-optima-media.s3.eu-north-1.amazonaws.com/partners/demo-builder/START.md";
const TELEGRAM = "https://t.me/altaioptima";
/** A demo key works only on the environment that issued it; the skill scripts take `--env stage` for stage. */
const ENV = /stage-api\./.test(API_BASE_URL) ? "stage" : "prod";
/** The MCP connector of the same API host (#463): `POST /mcp`, key in the `Authorization` header. */
const MCP_URL = API_BASE_URL.replace(/\/api\/v1\/client\/?$/, "/mcp");
const CONNECTOR_NAME = "ALTAI Optima";

const AGENTS = [
  { name: "Claude Code", href: "https://claude.com/claude-code", note: "в приложении Claude откройте вкладку Code и выберите папку на своём компьютере (Local, не облако)" },
  { name: "Codex", href: "https://openai.com/codex", note: "приложение Codex или Codex CLI, не обычный чат ChatGPT" },
  { name: "Antigravity", href: "https://antigravity.google", note: "агент в редакторе Antigravity" },
];

function useCopy() {
  const [copied, setCopied] = useState(false);
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked: the text stays selectable */
    }
  };
  return { copied, copy };
}

function CopyButton({ text }: { text: string }) {
  const { copied, copy } = useCopy();
  return (
    <button
      type="button"
      onClick={() => copy(text)}
      aria-label="Скопировать"
      className="shrink-0 rounded-lg p-1.5 text-[var(--pp-muted)] hover:bg-[var(--pp-accent-soft)] hover:text-[var(--pp-accent)]"
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

function CopyBlock({ code, display }: { code: string; display?: string }) {
  return (
    <div className="relative mt-2 rounded-xl border border-[var(--pp-line)] bg-[var(--pp-bg)]">
      <pre className="overflow-x-auto px-3 py-2.5 pr-11 text-[12px] leading-relaxed font-mono text-[var(--pp-text)] whitespace-pre-wrap break-words">{display ?? code}</pre>
      <div className="absolute right-1.5 top-1.5">
        <CopyButton text={code} />
      </div>
    </div>
  );
}

/** One field of Claude's «Add custom connector» form: what to type there, with a copy button. */
function Field({ label, value, display }: { label: string; value: string; display?: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-[var(--pp-line)] bg-[var(--pp-bg)] py-1.5 pl-3 pr-1.5">
      <span className="w-24 shrink-0 text-xs text-[var(--pp-muted)] sm:w-28">{label}</span>
      <code className="min-w-0 flex-1 truncate font-mono text-[12px] text-[var(--pp-text)]">{display ?? value}</code>
      <CopyButton text={value} />
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <Card className="flex gap-3 sm:gap-4">
      <div className="pp-head flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--pp-accent)] text-xs text-white">{n}</div>
      <div className="min-w-0 flex-1">
        <h2 className="pp-head text-[13px] sm:text-sm text-[var(--pp-text)]">{title}</h2>
        <div className="mt-2 space-y-2 text-sm leading-relaxed">{children}</div>
      </div>
    </Card>
  );
}

const mask = (key: string) => (key.length > 12 ? `${key.slice(0, 8)}${"•".repeat(12)}${key.slice(-4)}` : key);

function teachText(key: string) {
  return [
    "Научись собирать демо Веры (ИИ-менеджера ALTAI Optima) для моих клиентов.",
    "0. Это работает только в агенте с терминалом на моём компьютере. Если ты в облачной песочнице или в чате без терминала, ничего не устанавливай и не сохраняй ключ: сразу скажи мне, где открыть агента (раздел «First: check where you run» в инструкции).",
    `1. Прочитай инструкцию и выполни раздел «Install»: ${SKILL_START}`,
    `2. Мой личный ключ демо: ${key} (окружение: ${ENV}). Сохрани его, как сказано в инструкции, и больше нигде не показывай.`,
    "3. Перед каждым новым демо обновляй скил до последней версии (раздел «Sync»).",
    "Когда закончишь, напиши «Готово» и коротко, как попросить тебя собрать демо.",
  ].join("\n");
}

const EXAMPLE = `Сделай демо Веры через ${CONNECTOR_NAME} для кофейни «Зерно»:
- сайт: https://zerno-coffee.ru
- меню и цены: https://zerno-coffee.ru/menu
- доставка: https://zerno-coffee.ru/delivery
Прайс на зерно и условия для офисов в приложенном файле.`;

/** The partner's demo key with show / copy / regenerate; children get the current key. */
function useDemoKey() {
  const { data, error, loading, reload } = useLoad(() => api.partnerDemoKey());
  const [key, setKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [regenError, setRegenError] = useState<string | null>(null);
  const regenerate = async () => {
    if (!window.confirm("Старый ключ перестанет работать сразу. В коннекторе Claude нужно будет заменить заголовок Authorization на новый. Продолжить?")) return;
    setBusy(true);
    setRegenError(null);
    try {
      setKey((await api.partnerRegenerateDemoKey()).key);
    } catch (e) {
      setRegenError((e as { detail?: string })?.detail || "Не удалось выпустить новый ключ. Попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  };
  return { current: key ?? data?.key ?? null, error, loading, reload, busy, regenError, regenerate };
}

function ConnectorStep({ demoKey }: { demoKey: ReturnType<typeof useDemoKey> }) {
  const [shown, setShown] = useState(false);
  const { current, error, loading, reload, busy, regenError, regenerate } = demoKey;
  if (loading && !current) return <Spinner />;
  if (error && !current) return <ErrorBox text={error} onRetry={reload} />;
  if (!current) return null;
  const header = `Bearer ${current}`;
  return (
    <>
      <p>Это делается один раз. Подойдёт любой тариф Claude: на бесплатном можно добавить один такой коннектор.</p>
      <ol className="list-decimal space-y-2 pl-5">
        <li>
          Откройте Claude (сайт claude.ai или приложение на компьютере) и перейдите в <b>Customize → Connectors</b>, затем нажмите{" "}
          <b>Add custom connector</b>. В русском интерфейсе пункты могут называться «Настроить» и «Коннекторы».
        </li>
        <li>
          Заполните поля:
          <div className="mt-2 space-y-1.5">
            <Field label="Название" value={CONNECTOR_NAME} />
            <Field label="URL" value={MCP_URL} />
          </div>
        </li>
        <li>
          Вход: выберите <b>No sign in</b> («Без входа»). В разделе <b>Request headers</b> добавьте заголовок:
          <div className="mt-2 space-y-1.5">
            <Field label="Имя" value="Authorization" />
            <Field label="Значение" value={header} display={`Bearer ${shown ? current : mask(current)}`} />
          </div>
        </li>
        <li>
          Нажмите <b>Add</b>, затем <b>Connect</b>. В списке коннекторов появится {CONNECTOR_NAME}.
        </li>
      </ol>
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button type="button" onClick={() => setShown((s) => !s)} className={btnGhost + " !px-3"}>
          {shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          <span>{shown ? "Скрыть ключ" : "Показать ключ"}</span>
        </button>
        <button type="button" onClick={regenerate} disabled={busy} className={btnGhost + " !px-3"}>
          <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
          <span>Новый ключ</span>
        </button>
      </div>
      {regenError && <p className="text-xs text-red-500">{regenError}</p>}
      <p className="text-[var(--pp-muted)]">
        В значении заголовка ваш личный ключ демо: не пересылайте его другим людям. Ключ видит и меняет только ваши демо. Если ключ попал не туда, нажмите «Новый ключ» и замените значение в коннекторе.
      </p>
    </>
  );
}

function TerminalOption({ current }: { current: string | null }) {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-3 text-left" aria-expanded={open}>
        <span>
          <span className="pp-head block text-[13px] sm:text-sm text-[var(--pp-text)]">Другой способ: агент с терминалом</span>
          <span className="mt-1 block text-sm text-[var(--pp-muted)]">Claude Code, Codex или Antigravity на вашем компьютере, если вы уже работаете в них.</span>
        </span>
        <ChevronDown className={`h-5 w-5 shrink-0 text-[var(--pp-muted)] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="mt-3 space-y-2 text-sm leading-relaxed">
          <ul className="list-disc space-y-1 pl-5">
            {AGENTS.map((a) => (
              <li key={a.name}>
                <a href={a.href} target="_blank" rel="noopener noreferrer" className="font-semibold text-[var(--pp-accent)]">
                  {a.name}
                </a>{" "}
                <span className="text-[var(--pp-muted)]">({a.note})</span>
              </li>
            ))}
          </ul>
          <p className="text-[var(--pp-muted)]">Агенту нужен терминал и Python 3 (на macOS и Linux он обычно уже есть). Вставьте этот текст в чат с агентом один раз:</p>
          {current && <CopyBlock code={teachText(current)} display={teachText(mask(current))} />}
          <p className="text-[var(--pp-muted)]">Дальше пишите агенту так же, как в шаге 2, только без «через {CONNECTOR_NAME}».</p>
        </div>
      )}
    </Card>
  );
}

/** How to build a demo: the hero, the connector steps, the terminal option and «Клиенту понравилось?». */
function DemoGuide() {
  const demoKey = useDemoKey();
  return (
    <div id="demo-guide" className="space-y-4">

      <section
        className="relative overflow-hidden rounded-2xl p-5 sm:p-6 text-white"
        style={{ background: "linear-gradient(135deg, var(--pp-hero-from) 0%, var(--pp-hero-to) 100%)" }}
      >
        <div className="relative z-10 sm:max-w-[58%]">
          <span className="pp-head inline-block rounded-full bg-white/15 px-3 py-1 text-[10px]">Демо по сайту клиента</span>
          <p className="pp-head mt-4 text-lg sm:text-2xl leading-snug">Покажите клиенту Веру, которая уже знает его бизнес</p>
          <p className="mt-3 text-sm text-white/85 leading-relaxed">
            Вы пишете в обычном чате Claude, для кого нужно демо. Claude читает сайт клиента, пишет для Веры базу знаний, ALTAI проверяет каждый факт, и вы получаете готовую ссылку. Клиент пишет Вере сам и видит ответы о своих товарах и услугах.
          </p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/partner/vera-laptop.webp"
          alt="Вера за ноутбуком"
          className="pointer-events-none absolute bottom-0 right-0 hidden h-full w-auto object-contain sm:block"
          style={{ maskImage: "linear-gradient(to left, black 65%, transparent)", WebkitMaskImage: "linear-gradient(to left, black 65%, transparent)" }}
        />
      </section>

      <Step n={1} title={`Подключите ${CONNECTOR_NAME} к Claude`}>
        <ConnectorStep demoKey={demoKey} />
      </Step>

      <Step n={2} title="Создайте демо">
        <p>
          Откройте новый чат в Claude. Проверьте, что {CONNECTOR_NAME} включён: кнопка «+» или меню инструментов в поле ввода. Напишите, для кого демо, и дайте ссылки. Прайс, меню или описание услуг можно приложить файлом: это тоже источник фактов.
        </p>
        <CopyBlock code={EXAMPLE} />
        <p>
          Слова «через {CONNECTOR_NAME}» важны: без них Claude может начать рисовать свою страницу вместо демо. Если так случилось, напишите ему: «Используй коннектор {CONNECTOR_NAME}».
        </p>
        <p>
          Claude прочитает сайт, напишет базу знаний только по фактам (чего нет, Вера передаст менеджеру), проверит её, задаст Вере проверочные вопросы и пришлёт ссылку вида{" "}
          <span className="font-mono text-[13px] break-all">https://optima.altaiweb.online/demo/?t=название</span>. Её можно сразу переслать клиенту.
        </p>
        <p className="text-[var(--pp-muted)]">
          Поправить демо: «Обнови демо название через {CONNECTOR_NAME}: добавь …». Список ваших демо: «Покажи мои демо в {CONNECTOR_NAME}».
        </p>
      </Step>

      <TerminalOption current={demoKey.current} />

      <Card className="flex items-center gap-4 !bg-[var(--pp-accent-soft)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/partner/vera-okay.webp" alt="Вера показывает «окей»" className="h-20 w-20 shrink-0 rounded-2xl object-cover object-top" />
        <div className="text-sm leading-relaxed">
          <Label>Клиенту понравилось?</Label>
          Сообщите нам: мы закрепим клиента за вами, подключим его каналы и CRM после оплаты. Если демо показывали вы и вы согласовали тариф, клиент идёт по ставкам Хедхантера.{" "}
          <a href={TELEGRAM} target="_blank" rel="noopener noreferrer" className="font-semibold text-[var(--pp-accent)]">
            Написать в Telegram
          </a>
        </div>
      </Card>
    </div>
  );
}

// ---------- the partner's demo stands ----------

const PERIODS = [7, 30, 90] as const;

/** «1 чат», «2 чата», «5 чатов» */
function chats(n: number): string {
  const m10 = n % 10, m100 = n % 100;
  const w = m10 === 1 && m100 !== 11 ? "чат" : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? "чата" : "чатов";
  return `${n} ${w}`;
}

/** Chats per day as bars; every day of the period has a slot, the tooltip names the day. */
function DailyBars({ daily, tall = false }: { daily: PartnerDemo["daily"]; tall?: boolean }) {
  const max = Math.max(1, ...daily.map((d) => d.chats));
  const step = daily.length > 31 ? 14 : daily.length > 10 ? 7 : 1;
  return (
    <div>
      <div className={`flex items-end ${daily.length > 31 ? "gap-px" : "gap-0.5 sm:gap-1"} ${tall ? "h-32 sm:h-40" : "h-12"}`}>
        {daily.map((d) => (
          <div key={d.date} className="group relative flex h-full min-w-0 flex-1 flex-col justify-end" title={`${formatDayMonth(d.date)}: ${chats(d.chats)}`}>
            <div
              className={`w-full rounded-t-[3px] ${d.chats ? "bg-[var(--pp-accent)] group-hover:brightness-125" : "bg-[var(--pp-line)]"}`}
              style={{ height: d.chats ? `${Math.max((d.chats / max) * 100, 6)}%` : "2px" }}
            />
          </div>
        ))}
      </div>
      {tall && (
        <div className="mt-1 flex text-[9px] sm:text-[10px] text-[var(--pp-muted)]">
          {daily.map((d, i) => (
            <div key={d.date} className="min-w-0 flex-1 overflow-visible whitespace-nowrap">
              {(daily.length - 1 - i) % step === 0 ? d.date.slice(8, 10) + "." + d.date.slice(5, 7) : ""}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CopyLink({ link }: { link: string }) {
  const { copied, copy } = useCopy();
  return (
    <button type="button" onClick={() => copy(link)} className={btnGhost + " !px-3 !py-2"}>
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      <span>{copied ? "Скопировано" : "Ссылка"}</span>
    </button>
  );
}

function DemoCard({ d, days }: { d: PartnerDemo; days: number }) {
  const href = safeHttpUrl(d.link);
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="pp-head truncate text-[13px] sm:text-sm text-[var(--pp-text)]">{d.business_name || d.tenant_id}</h3>
            {d.is_active ? <Chip tone="good">Работает</Chip> : <Chip tone="mute">Выключено</Chip>}
          </div>
          <p className="mt-1 text-xs text-[var(--pp-muted)]">
            Создано {formatDate(d.created_at)}
            {d.last_chat_at ? ` · последний чат ${formatDayMonth(d.last_chat_at)}` : " · чатов пока не было"}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <CopyLink link={d.link} />
          {href && (
            <a href={href} target="_blank" rel="noopener noreferrer" className={btnGhost + " !px-3 !py-2"} aria-label="Открыть демо">
              <ExternalLink className="h-4 w-4" />
              <span className="hidden sm:inline">Открыть</span>
            </a>
          )}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-[auto_1fr] items-end gap-4">
        <div className="space-y-2">
          <div>
            <div className="pp-num text-xl font-bold text-[var(--pp-text)]">{d.chats_period}</div>
            <div className="text-[11px] text-[var(--pp-muted)]">за {days} дн.</div>
          </div>
          <div className="text-[11px] text-[var(--pp-muted)]">
            всего <span className="pp-num font-semibold text-[var(--pp-text)]">{d.chats_total}</span>
          </div>
        </div>
        <DailyBars daily={d.daily} />
      </div>
    </Card>
  );
}

function DemoStands({ onEmpty }: { onEmpty: (empty: boolean) => void }) {
  const [days, setDays] = useState<number>(30);
  const { data, error, loading, reload } = useLoad(() => api.partnerDemos(days), [days]);
  const items = data?.items;
  React.useEffect(() => {
    if (items) onEmpty(items.length === 0);
  }, [items, onEmpty]);
  if (loading && !data) return <Spinner label="Загружаем ваши демо" />;
  if (error && !data) return <ErrorBox text={error} onRetry={reload} />;
  if (!items) return null;
  if (items.length === 0)
    return (
      <Empty title="Демо пока нет">
        Соберите первое демо по сайту клиента: инструкция ниже. Здесь появятся все ваши демо и сколько чатов с Верой в каждом.
      </Empty>
    );
  const total = items[0].daily.map((d, i) => ({ date: d.date, chats: items.reduce((s, x) => s + (x.daily[i]?.chats ?? 0), 0) }));
  const totalPeriod = items.reduce((s, x) => s + x.chats_period, 0);
  const active = items.filter((x) => x.is_active).length;
  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Label>Чаты с Верой во всех демо</Label>
            <div className="flex items-baseline gap-2">
              <span className="pp-num text-2xl sm:text-3xl font-bold text-[var(--pp-text)]">{totalPeriod}</span>
              <span className="text-xs text-[var(--pp-muted)]">за {days} дн. · демо: {items.length}{active !== items.length ? `, работают ${active}` : ""}</span>
            </div>
          </div>
          <div className="flex rounded-xl border border-[var(--pp-line)] p-0.5 text-xs font-semibold" role="group" aria-label="Период">
            {PERIODS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setDays(p)}
                aria-pressed={days === p}
                className={`rounded-lg px-3 py-1.5 transition ${days === p ? "bg-[var(--pp-accent)] text-white" : "text-[var(--pp-muted)] hover:text-[var(--pp-text)]"}`}
              >
                {p} дн.
              </button>
            ))}
          </div>
        </div>
        <div className={`mt-4 ${loading ? "opacity-50" : ""}`}>
          <DailyBars daily={total} tall />
        </div>
        <p className="mt-3 text-[11px] text-[var(--pp-muted)]">
          Чат = посетитель демо, который написал Вере хотя бы одно сообщение в этот день. Проверочные вопросы при сборке демо не считаются. Дни по московскому времени.
        </p>
      </Card>
      <div className={`space-y-3 ${loading ? "opacity-50" : ""}`}>
        {items.map((d) => (
          <DemoCard key={d.tenant_id} d={d} days={days} />
        ))}
      </div>
    </div>
  );
}

export default function PartnerDemoPage() {
  // null until the list answers: then the guide opens by itself only when there are no demos yet.
  const [guideOpen, setGuideOpen] = useState<boolean | null>(null);
  const onEmpty = React.useCallback((empty: boolean) => setGuideOpen((o) => (o === null ? empty : o)), []);
  const open = guideOpen === true;
  const toggle = () => {
    const next = !open;
    setGuideOpen(next);
    if (next) setTimeout(() => document.getElementById("demo-guide")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageTitle hint="Ваши демо Веры и сколько чатов в каждом. Новое демо собирается в чате Claude по сайту клиента.">Мои демо</PageTitle>
        <button type="button" onClick={toggle} className={(open ? btnGhost : btnPrimary) + " shrink-0"} aria-expanded={open} aria-controls="demo-guide">
          {open ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          <span>{open ? "Скрыть инструкцию" : "Как создать демо"}</span>
        </button>
      </div>
      <DemoStands onEmpty={onEmpty} />
      {open && <DemoGuide />}
      {!open && (
        <p className="flex items-center gap-2 text-xs text-[var(--pp-muted)]">
          <MessagesSquare className="h-4 w-4 shrink-0" />
          Клиенту понравилось демо? Напишите нам в{" "}
          <a href={TELEGRAM} target="_blank" rel="noopener noreferrer" className="font-semibold text-[var(--pp-accent)]">
            Telegram
          </a>
          : закрепим клиента за вами.
        </p>
      )}
    </div>
  );
}
