"use client";

import React, { useState } from "react";
import { Check, Copy, Eye, EyeOff, RefreshCw } from "lucide-react";
import { api, API_BASE_URL } from "@/lib/api";
import { Card, ErrorBox, Label, PageTitle, Spinner, btnGhost, useLoad } from "@/components/partner/ui";

/** Public S3 folder with the build-demo skill (source: private repo dtongit/altai-demo-builder, `publish.py`). */
const SKILL_START = "https://altai-optima-media.s3.eu-north-1.amazonaws.com/partners/demo-builder/START.md";
const TELEGRAM = "https://t.me/altaioptima";
/** A demo key works only on the environment that issued it; the skill scripts take `--env stage` for stage. */
const ENV = /stage-api\./.test(API_BASE_URL) ? "stage" : "prod";

const AGENTS = [
  { name: "Claude Code", href: "https://claude.com/claude-code", note: "в приложении Claude откройте вкладку Code, не обычный чат" },
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

function CopyBlock({ code, display }: { code: string; display?: string }) {
  const { copied, copy } = useCopy();
  return (
    <div className="relative mt-2 rounded-xl border border-[var(--pp-line)] bg-[var(--pp-bg)]">
      <pre className="overflow-x-auto px-3 py-2.5 pr-11 text-[12px] leading-relaxed font-mono text-[var(--pp-text)] whitespace-pre-wrap break-words">{display ?? code}</pre>
      <button
        type="button"
        onClick={() => copy(code)}
        aria-label="Скопировать"
        className="absolute right-1.5 top-1.5 rounded-lg p-1.5 text-[var(--pp-muted)] hover:bg-[var(--pp-accent-soft)] hover:text-[var(--pp-accent)]"
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </button>
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
    `1. Прочитай инструкцию и выполни раздел «Install»: ${SKILL_START}`,
    `2. Мой личный ключ демо: ${key} (окружение: ${ENV}). Сохрани его, как сказано в инструкции, и больше нигде не показывай.`,
    "3. Перед каждым новым демо обновляй скил до последней версии (раздел «Sync»).",
    "Когда закончишь, напиши «Готово» и коротко, как попросить тебя собрать демо.",
  ].join("\n");
}

const EXAMPLE = `Сделай демо для кофейни «Зерно»:
- сайт: https://zerno-coffee.ru
- меню и цены: https://zerno-coffee.ru/menu
- доставка: https://zerno-coffee.ru/delivery
Прайс на зерно и условия для офисов в приложенном файле.`;

function KeyPanel() {
  const { data, error, loading, reload } = useLoad(() => api.partnerDemoKey());
  const [key, setKey] = useState<string | null>(null);
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [regenError, setRegenError] = useState<string | null>(null);
  const { copied, copy } = useCopy();
  const current = key ?? data?.key ?? null;

  const regenerate = async () => {
    if (!window.confirm("Старый ключ перестанет работать сразу. Агенту нужно будет заново вставить текст из шага 2. Продолжить?")) return;
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

  if (loading && !current) return <Spinner />;
  if (error && !current) return <ErrorBox text={error} onRetry={reload} />;
  if (!current) return null;
  return (
    <>
      <div>
        <Label>Ваш ключ демо</Label>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-xl border border-[var(--pp-line)] bg-[var(--pp-bg)] px-3 py-2 font-mono text-[12px]">
            {shown ? current : mask(current)}
          </code>
          <button type="button" onClick={() => setShown((s) => !s)} aria-label={shown ? "Скрыть ключ" : "Показать ключ"} className={btnGhost + " !px-3"}>
            {shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
          <button type="button" onClick={() => copy(current)} className={btnGhost + " !px-3"}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            <span className="hidden sm:inline">Скопировать</span>
          </button>
          <button type="button" onClick={regenerate} disabled={busy} className={btnGhost + " !px-3"}>
            <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Новый ключ</span>
          </button>
        </div>
        {regenError && <p className="mt-1 text-xs text-red-500">{regenError}</p>}
      </div>
      <p>Вставьте этот текст в чат с агентом и отправьте:</p>
      <CopyBlock code={teachText(current)} display={teachText(shown ? current : mask(current))} />
      <p className="text-[var(--pp-muted)]">
        В тексте ваш личный ключ: не пересылайте его другим людям. Ключ видит и меняет только ваши демо. Если ключ попал не туда, нажмите «Новый ключ»: старый сразу перестанет работать.
      </p>
    </>
  );
}

export default function PartnerDemoPage() {
  return (
    <div className="space-y-4">
      <PageTitle hint="Соберите Веру на сайте вашего клиента и отправьте ему ссылку: он увидит, как Вера отвечает про его бизнес.">Демо для клиента</PageTitle>

      <section
        className="relative overflow-hidden rounded-2xl p-5 sm:p-6 text-white"
        style={{ background: "linear-gradient(135deg, var(--pp-hero-from) 0%, var(--pp-hero-to) 100%)" }}
      >
        <div className="relative z-10 sm:max-w-[58%]">
          <span className="pp-head inline-block rounded-full bg-white/15 px-3 py-1 text-[10px]">Демо по сайту клиента</span>
          <p className="pp-head mt-4 text-lg sm:text-2xl leading-snug">Покажите клиенту Веру, которая уже знает его бизнес</p>
          <p className="mt-3 text-sm text-white/85 leading-relaxed">
            ИИ-агент на вашем компьютере читает сайт клиента, пишет для Веры базу знаний, проверяет её и присылает готовую ссылку. Клиент пишет Вере сам и видит ответы о своих товарах и услугах.
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

      <Step n={1} title="Установите ИИ-агента">
        <p>Подойдёт любой из трёх. Подписку на него оплачиваете вы.</p>
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
        <p className="text-[var(--pp-muted)]">
          Агенту нужен доступ к терминалу: он запускает наши скрипты на Python 3 (на macOS и Linux он обычно уже есть). Обычный чат с ИИ так не умеет.
        </p>
      </Step>

      <Step n={2} title="Научите агента собирать демо">
        <KeyPanel />
        <p className="text-[var(--pp-muted)]">
          Это делается один раз. Агент сохранит ключ и инструкцию и перед каждым новым демо сам проверит, нет ли новой версии.
        </p>
      </Step>

      <Step n={3} title="Создайте демо">
        <p>Напишите агенту, для кого демо, и дайте ссылки. Прайс, меню или описание услуг можно приложить файлом: это тоже источник фактов.</p>
        <CopyBlock code={EXAMPLE} />
        <p>
          Агент прочитает сайт, напишет базу знаний только по фактам (чего нет, Вера передаст менеджеру), проверит её, задаст Вере проверочные вопросы и пришлёт ссылку вида{" "}
          <span className="font-mono text-[13px] break-all">https://optima.altaiweb.online/demo/?t=название</span>. Её можно сразу переслать клиенту.
        </p>
        <p className="text-[var(--pp-muted)]">Поправить демо: «Обнови демо название: добавь …». Список ваших демо: «Покажи мои демо».</p>
      </Step>

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
