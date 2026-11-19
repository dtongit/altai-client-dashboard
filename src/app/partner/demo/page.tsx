"use client";

import React, { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Card, Label, PageTitle } from "@/components/partner/ui";

/** The private repo with the build-demo skill (Claude Code plugin + AGENTS.md for Codex and Antigravity). */
const REPO = "dtongit/altai-demo-builder";
const TELEGRAM = "https://t.me/altaioptima";

function CopyBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked: the text stays selectable */
    }
  };
  return (
    <div className="relative mt-2 rounded-xl border border-[var(--pp-line)] bg-[var(--pp-bg)]">
      <pre className="overflow-x-auto px-3 py-2.5 pr-11 text-[12px] leading-relaxed font-mono text-[var(--pp-text)] whitespace-pre">{code}</pre>
      <button
        type="button"
        onClick={copy}
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

const TOOLS = {
  claude: {
    label: "Claude Code",
    intro: "Подключите репозиторий как плагин: в Claude Code выполните две команды.",
    code: `/plugin marketplace add ${REPO}\n/plugin install altai-demo-builder`,
    after: "Дальше работайте в любой пустой папке: плагин доступен везде.",
  },
  codex: {
    label: "Codex",
    intro: "Склонируйте репозиторий и запустите Codex в его папке.",
    code: `git clone https://github.com/${REPO}.git\ncd altai-demo-builder\ncodex`,
    after: "Codex прочитает AGENTS.md из репозитория и будет работать по той же инструкции.",
  },
  antigravity: {
    label: "Antigravity",
    intro: "Склонируйте репозиторий и откройте его папку в Antigravity (File -> Open Folder).",
    code: `git clone https://github.com/${REPO}.git`,
    after: "Агент прочитает AGENTS.md. Если он не подхватил инструкцию сам, начните просьбу словами «Следуй skills/build-demo/SKILL.md».",
  },
} as const;
type Tool = keyof typeof TOOLS;

export default function PartnerDemoPage() {
  const [tool, setTool] = useState<Tool>("claude");
  const t = TOOLS[tool];
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

      <Step n={1} title="Что понадобится">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            ИИ-агент на компьютере: <b>Claude Code</b>, <b>Codex</b> или <b>Antigravity</b>. Подписку на него оплачиваете вы.
          </li>
          <li>Python 3 (на macOS и Linux обычно уже есть).</li>
          <li>
            Доступ к нашему закрытому репозиторию со скилом <span className="font-mono text-[13px]">{REPO}</span>: напишите нам ваш логин GitHub.
          </li>
          <li>
            Личный ключ демо (начинается с <span className="font-mono text-[13px]">dmk_</span>): выдаём по запросу, один на партнёра.
          </li>
        </ul>
        <a href={TELEGRAM} target="_blank" rel="noopener noreferrer" className="inline-block font-semibold text-[var(--pp-accent)]">
          Запросить доступ и ключ в Telegram
        </a>
      </Step>

      <Step n={2} title="Сохраните ключ">
        <p>Ключ хранится в файле на вашем компьютере. Не пересылайте его и не вставляйте в чат с агентом.</p>
        <CopyBlock code={`mkdir -p ~/.config/altai && chmod 700 ~/.config/altai\nprintf '%s' 'ВАШ_КЛЮЧ' > ~/.config/altai/demo_api_key && chmod 600 ~/.config/altai/demo_api_key`} />
      </Step>

      <Step n={3} title="Подключите скил">
        <div className="flex flex-wrap gap-2" role="tablist">
          {(Object.keys(TOOLS) as Tool[]).map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={tool === k}
              onClick={() => setTool(k)}
              className={`rounded-xl border px-3 py-1.5 text-sm font-semibold transition ${
                tool === k ? "border-[var(--pp-accent)] bg-[var(--pp-accent)] text-white" : "border-[var(--pp-line)] text-[var(--pp-text)] hover:bg-[var(--pp-accent-soft)]"
              }`}
            >
              {TOOLS[k].label}
            </button>
          ))}
        </div>
        <p>{t.intro}</p>
        <CopyBlock code={t.code} />
        <p className="text-[var(--pp-muted)]">{t.after}</p>
      </Step>

      <Step n={4} title="Попросите агента собрать демо">
        <p>Напишите агенту одну фразу с адресом сайта клиента:</p>
        <CopyBlock code="Сделай демо для https://сайт-клиента.ru" />
        <p>Агент сам:</p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>прочитает сайт;</li>
          <li>напишет базу знаний только по фактам с сайта: чего там нет, Вера передаст менеджеру;</li>
          <li>проверит её автоматическим контролем качества и исправит ошибки;</li>
          <li>создаст демо и задаст Вере проверочные вопросы;</li>
          <li>пришлёт ссылку и короткий отчёт.</li>
        </ol>
        <p className="text-[var(--pp-muted)]">
          На сайте мало текста или нет цен? Дайте агенту прайс или описание услуг текстом: они тоже считаются источником.
        </p>
      </Step>

      <Step n={5} title="Отправьте ссылку клиенту">
        <p>
          Ссылка выглядит так: <span className="font-mono text-[13px] break-all">https://optima.altaiweb.online/demo/?t=название</span>. Её можно сразу переслать клиенту в мессенджер.
        </p>
        <p>Поправить демо: «Обнови демо название: добавь …». Список ваших демо: «Покажи мои демо».</p>
      </Step>

      <Card className="flex items-center gap-4 !bg-[var(--pp-accent-soft)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/partner/vera-okay.webp" alt="Вера показывает «окей»" className="h-20 w-20 shrink-0 rounded-2xl object-cover object-top" />
        <div className="text-sm leading-relaxed">
          <Label>Клиенту понравилось?</Label>
          Сообщите нам: мы закрепим клиента за вами, подключим его каналы и CRM после оплаты. Если демо показывали вы и вы согласовали тариф, клиент идёт по ставкам Хедхантера.
        </div>
      </Card>
    </div>
  );
}
