"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { ThemeToggle } from "@/components/theme-toggle";
import { getTenantDisplayName, getTenantBrand } from "@/lib/tenants";
import { FormattedMessageText } from "@/components/formatted-message-text";
import {
  Send,
  RotateCcw,
  Bot,
  BellRing,
  User as UserIcon,
  Clock,
  CheckCircle2,
} from "lucide-react";

interface Message {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
  escalation?: {
    escalated: boolean;
    reason: string;
    alert_preview?: string;
  } | null;
}

function BrandedWatermarkPattern({
  watermarkText,
  color,
}: {
  watermarkText: string;
  color: string;
}) {
  const rowText = Array(12).fill(`${watermarkText}     ✦     `).join("");
  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden select-none"
      style={{
        maskImage:
          "radial-gradient(ellipse 65% 55% at 50% 50%, transparent 20%, black 80%)",
        WebkitMaskImage:
          "radial-gradient(ellipse 65% 55% at 50% 50%, transparent 20%, black 80%)",
      }}
      aria-hidden="true"
    >
      <div className="absolute -inset-[50%] flex flex-col justify-around rotate-[-12deg] opacity-[0.045] dark:opacity-[0.065]">
        {Array.from({ length: 22 }).map((_, i) => (
          <div
            key={i}
            className={`whitespace-nowrap font-sans font-extrabold text-base sm:text-xl tracking-[0.22em] uppercase leading-none py-3 sm:py-3.5 ${
              i % 2 === 0 ? "translate-x-16" : "-translate-x-16"
            }`}
            style={{ color }}
          >
            {rowText}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DemoChatClient({ initialTenantId }: { initialTenantId?: string }) {
  const pathname = usePathname();

  const detectedTenant = (() => {
    if (initialTenantId && initialTenantId.trim()) {
      return initialTenantId.trim();
    }
    if (pathname) {
      const match = pathname.match(/\/demo\/([^/?#]+)/);
      if (match && match[1] && match[1] !== "demo") {
        return match[1];
      }
    }
    return "kostis";
  })();

  const [tenantId, setTenantId] = useState<string>(detectedTenant);
  const [businessName, setBusinessName] = useState<string>("Загрузка...");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const q = sp.get("tenant");
      if (q && q.trim() && q.trim() !== tenantId) {
        setTenantId(q.trim());
        return;
      }
    }
    if (detectedTenant && detectedTenant !== tenantId) {
      setTenantId(detectedTenant);
    }
  }, [detectedTenant, pathname]);

  useEffect(() => {
    setMessages([]);
  }, [tenantId]);

  const brand = getTenantBrand(tenantId, businessName);
  const displayTenant = brand.displayName;

  useEffect(() => {
    document.title = `Демо ALTAI Optima + ${displayTenant}`;
  }, [displayTenant]);

  // Lock document body scroll on mobile iOS/Android to guarantee zero outer page bouncing
  useEffect(() => {
    const origOverflow = document.body.style.overflow;
    const origPosition = document.body.style.position;
    const origWidth = document.body.style.width;
    const origHeight = document.body.style.height;

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.width = "100%";
    document.body.style.height = "100%";

    return () => {
      document.body.style.overflow = origOverflow;
      document.body.style.position = origPosition;
      document.body.style.width = origWidth;
      document.body.style.height = origHeight;
    };
  }, []);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Generate or restore session
  useEffect(() => {
    const storageKey = `altai_demo_session_${tenantId}`;
    let saved = "";
    if (typeof window !== "undefined") {
      saved = localStorage.getItem(storageKey) || "";
    }
    if (!saved) {
      saved = `demo_${tenantId}_${Math.random().toString(36).substring(2, 10)}`;
      if (typeof window !== "undefined") {
        localStorage.setItem(storageKey, saved);
      }
    }
    setSessionId(saved);

    // Load tenant config
    async function init() {
      try {
        const config = await api.getDemoConfig(tenantId);
        if (config?.business_name) {
          setBusinessName(config.business_name);
        } else {
          setBusinessName(tenantId === "kostis" ? "ООО «КОСТИС»" : tenantId);
        }
      } catch (err) {
        console.warn("Could not fetch remote demo config, using offline fallback:", err);
        setBusinessName(tenantId === "kostis" ? "ООО «КОСТИС»" : tenantId);
      }
    }

    init();
  }, [tenantId]);

  const handleSend = async (textToSend?: string) => {
    const raw = textToSend ?? input;
    const trimmed = raw.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = {
      id: `u_${Date.now()}`,
      sender: "user",
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await api.sendDemoChat({
        tenant_id: tenantId,
        message: trimmed,
        session_id: sessionId || undefined,
      });

      if (res.session_id) {
        setSessionId(res.session_id);
        if (typeof window !== "undefined") {
          localStorage.setItem(`altai_demo_session_${tenantId}`, res.session_id);
        }
      }

      const botMsg: Message = {
        id: `a_${Date.now()}`,
        sender: "assistant",
        text: res.assistant_response || "Спасибо за обращение! Менеджер свяжется с вами.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        escalation: res.escalation,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errMsg: Message = {
        id: `err_${Date.now()}`,
        sender: "assistant",
        text: err?.message || "Извините, произошла временная ошибка связи. Пожалуйста, попробуйте еще раз.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleReset = () => {
    const newSession = `demo_${tenantId}_${Math.random().toString(36).substring(2, 10)}`;
    setSessionId(newSession);
    if (typeof window !== "undefined") {
      localStorage.setItem(`altai_demo_session_${tenantId}`, newSession);
    }
    setMessages([]);
  };

  return (
    <div className="relative min-h-[100dvh] lg:h-[100dvh] lg:max-h-[100dvh] flex flex-col bg-[#F5F2EE] dark:bg-[#0f0e0d] text-[#1C1B1A] dark:text-[#F5F2EE] font-['Manrope',system-ui,sans-serif] transition-colors overflow-y-auto lg:overflow-hidden">
      {/* Giant & Watermark from template */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-[-40px] sm:right-[-60px] bottom-[-160px] sm:bottom-[-220px] text-[480px] sm:text-[700px] lg:text-[900px] font-extrabold leading-none select-none z-0"
        style={{ color: brand.primaryColor, opacity: 0.05 }}
      >
        &amp;
      </div>

      {/* Header */}
      <header className="relative flex-none z-20 w-full h-[76px] sm:h-[84px] px-4 sm:px-10 lg:px-16 border-b border-[#E4DED6] dark:border-zinc-800 bg-[#F5F2EE]/90 dark:bg-[#0f0e0d]/90 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-4 sm:gap-6 min-w-0">
          <img
            src={brand.logoShowroomUrl || brand.logoBadgeUrl || "/mobel_zeit_showroom.png"}
            alt={displayTenant}
            className="h-7 sm:h-9 w-auto object-contain shrink-0"
          />
        </div>

        <div className="flex items-center gap-4 sm:gap-6 shrink-0">
          <Link
            href="https://optima.altaiweb.online"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 sm:gap-2 text-[#6B645C] dark:text-zinc-400 hover:text-[#1C1B1A] dark:hover:text-white text-xs sm:text-[13px] font-medium transition-colors"
          >
            <span>powered by</span>
            <span className="font-extrabold tracking-wider text-[#14213D] dark:text-zinc-100 uppercase">
              ALTAI OPTIMA
            </span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Two-Column Layout */}
      <main className="relative z-10 flex-1 max-w-[1440px] mx-auto w-full flex flex-col lg:flex-row gap-8 lg:gap-14 px-4 sm:px-10 lg:px-16 py-6 sm:py-8 lg:py-10 min-h-0">
        {/* Left Column: Business & Integrations Info */}
        <section className="w-full lg:w-[500px] xl:w-[540px] shrink-0 flex flex-col gap-5 sm:gap-6">
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white dark:bg-zinc-900 border border-[#E4DED6] dark:border-zinc-800 text-xs sm:text-[13px] font-bold text-[#1C1B1A] dark:text-zinc-200 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-[#1F9D55]" />
              Ответ за 15 секунд
            </span>
            <span className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-white dark:bg-zinc-900 border border-[#E4DED6] dark:border-zinc-800 text-xs sm:text-[13px] font-bold text-[#1C1B1A] dark:text-zinc-200 shadow-2xs">
              24/7 без выходных
            </span>
            <span className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-white dark:bg-zinc-900 border border-[#E4DED6] dark:border-zinc-800 text-xs sm:text-[13px] font-bold text-[#1C1B1A] dark:text-zinc-200 shadow-2xs">
              Понимает голосовые
            </span>
          </div>

          {/* Heading */}
          <h1 className="text-3xl sm:text-4xl lg:text-[46px] xl:text-[50px] font-extrabold leading-[1.05] tracking-tight text-[#1C1B1A] dark:text-white">
            Вера уже изучила{" "}
            <span style={{ color: brand.primaryColor }}>вашу компанию</span>
          </h1>

          {/* Description */}
          <p className="text-sm sm:text-base lg:text-[17px] leading-relaxed text-[#3B3631] dark:text-zinc-300">
            Ваш новый любимый сотрудник. Обаяние живого эксперта, тонкий юмор уровня Довлатова и железная компьютерная дисциплина. Вера помнит каждого клиента, ведёт диалог как лучший менеджер салона и доводит его до реальной сделки в CRM с сервисом пятизвёздочного отеля.
          </p>

          {/* Cursive Handwriting Note */}
          <p
            className="font-['Caveat',cursive] text-2xl sm:text-[26px] leading-tight -mt-1 sm:-mt-2"
            style={{ color: brand.primaryColor }}
          >
            Напишите ей как покупатель, она уже ждёт в чате
          </p>

          {/* Messengers Block (As on site / attachment) */}
          <div className="space-y-2.5">
            <span className="text-[11px] font-bold tracking-[0.1em] uppercase text-[#8A8178] dark:text-zinc-400 block">
              Живёт там, где пишут ваши клиенты
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-[#E4DED6] dark:border-zinc-800 text-xs sm:text-sm font-bold text-[#1C1B1A] dark:text-zinc-100 shadow-2xs">
                <span className="w-2.5 h-2.5 rounded-full bg-[#25D366] shrink-0" />
                <span>WhatsApp</span>
              </div>
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-[#E4DED6] dark:border-zinc-800 text-xs sm:text-sm font-bold text-[#1C1B1A] dark:text-zinc-100 shadow-2xs">
                <span className="w-2.5 h-2.5 rounded-full bg-[#229ED9] shrink-0" />
                <span>Telegram</span>
              </div>
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-[#E4DED6] dark:border-zinc-800 text-xs sm:text-sm font-bold text-[#1C1B1A] dark:text-zinc-100 shadow-2xs">
                <span className="w-2.5 h-2.5 rounded-full bg-[#E1306C] shrink-0" />
                <span>Instagram</span>
              </div>
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-[#E4DED6] dark:border-zinc-800 text-xs sm:text-sm font-bold text-[#1C1B1A] dark:text-zinc-100 shadow-2xs">
                <span className="w-2.5 h-2.5 rounded-full bg-[#00AAFF] shrink-0" />
                <span>Авито Чат</span>
              </div>
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-[#E4DED6] dark:border-zinc-800 text-xs sm:text-sm font-bold text-[#1C1B1A] dark:text-zinc-100 shadow-2xs">
                <span className="w-2.5 h-2.5 rounded-full bg-[#7B3FF2] shrink-0" />
                <span>MAX</span>
              </div>
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-[#E4DED6] dark:border-zinc-800 text-xs sm:text-sm font-bold text-[#1C1B1A] dark:text-zinc-100 shadow-2xs">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0077FF] shrink-0" />
                <span>VK</span>
              </div>
            </div>
            <p className="text-xs sm:text-[13px] leading-snug text-zinc-600 dark:text-zinc-400">
              Вера подхватывает обращения в любых мессенджерах одновременно, отправляя в CRM готовые заказы
            </p>
          </div>

          {/* CRM Block (As on site / attachment: clean horizontal logos without black boxes) */}
          <div className="space-y-2 pt-1">
            <span className="text-[11px] font-bold tracking-[0.1em] uppercase text-[#8A8178] dark:text-zinc-400 block">
              Сама ведёт базу в любой CRM
            </span>
            <div className="flex flex-wrap items-center gap-3.5 sm:gap-5 py-1">
              <div className="flex items-center gap-2">
                <img
                  src="/logos/amocrm_logo.webp"
                  alt="amoCRM"
                  className="h-5 sm:h-6 w-auto object-contain"
                />
                <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">amoCRM</span>
              </div>
              <div className="flex items-center gap-2">
                <img
                  src="/logos/bitrix24_logo.webp"
                  alt="Битрикс24"
                  className="h-5 sm:h-6 w-auto object-contain"
                />
              </div>
              <div className="flex items-center gap-2">
                <img
                  src="/logos/1c_logo.webp"
                  alt="1С"
                  className="h-5 sm:h-6 w-auto object-contain"
                />
                <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">1С</span>
              </div>
              <div className="flex items-center gap-2">
                <img
                  src="/logos/moysklad_logo.svg"
                  alt="МойСклад"
                  className="h-5 sm:h-6 w-auto object-contain"
                />
                <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">МойСклад</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="h-5 sm:h-6 w-auto aspect-square shrink-0" viewBox="0 0 32 32" fill="none">
                  <rect x="2" y="4" width="28" height="24" rx="4" fill="#107C41" />
                  <rect x="18" y="9" width="9" height="14" fill="#185C37" opacity="0.3" />
                  <path d="M18 9h9v4h-9V9zm0 5h9v4h-9v-4zm0 5h9v4h-9v-4z" fill="#fff" opacity="0.25" />
                  <rect x="4" y="7" width="13" height="18" rx="2" fill="#107C41" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.25))" />
                  <path d="M7.8 11.5l2.2 3.5 2.2-3.5h2.3l-3.3 4.5 3.5 4.5h-2.3l-2.4-3.6-2.4 3.6H5.5l3.5-4.5-3.3-4.5h2.1z" fill="#fff" />
                </svg>
                <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">Excel</span>
              </div>
            </div>
          </div>

          {/* Footer Disclaimer */}
          <p className="mt-auto pt-4 border-t border-[#E4DED6] dark:border-zinc-800 text-xs text-[#6B645C] dark:text-zinc-400 leading-relaxed">
            Это демо-версия Веры на основе открытых материалов möbel&amp;zeit. Для точных ответов во всех сценариях нужна полноценная интеграция от{" "}
            <Link
              href="https://optima.altaiweb.online"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: brand.primaryColor }}
              className="font-semibold hover:underline"
            >
              ALTAI Optima
            </Link>
          </p>
        </section>

        {/* Right Column: Live Interactive Chat with Vera */}
        <section
          aria-label="Чат с Верой"
          className="flex-1 min-w-0 bg-white dark:bg-zinc-900 rounded-[28px] shadow-[0_30px_80px_-30px_rgba(60,40,20,0.25)] border border-[#EAE4DC] dark:border-zinc-800 flex flex-col overflow-hidden h-[620px] lg:h-full min-h-[560px]"
        >
          {/* Card Header */}
          <div className="flex-none flex items-center justify-between px-5 sm:px-7 py-4 border-b border-[#F0EBE5] dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
              <div className="relative w-12 h-12 sm:w-14 sm:h-14 shrink-0">
                <img
                  src={brand.veraAvatarUrl || "/vera_showroom_avatar.png"}
                  alt="Вера"
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover shadow-xs"
                  style={{
                    boxShadow: `0 0 0 3px #FFFFFF, 0 0 0 5px ${brand.primaryColor}`,
                  }}
                />
                <span className="absolute right-0 bottom-0 w-3.5 h-3.5 rounded-full bg-[#1F9D55] border-2 border-white dark:border-zinc-900" />
              </div>
              <div className="min-w-0 flex flex-col gap-0.5">
                <span className="text-lg sm:text-[19px] font-extrabold text-[#1C1B1A] dark:text-white leading-tight">
                  Вера
                </span>
                <span className="text-xs sm:text-sm text-[#6B645C] dark:text-zinc-400 truncate">
                  консультант möbel&amp;zeit · {loading ? "печатает…" : "в сети"}
                </span>
              </div>
            </div>

            <button
              onClick={handleReset}
              aria-label="Сбросить диалог"
              className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-full bg-[#F5F2EE] dark:bg-zinc-800 hover:bg-[#EAE4DC] dark:hover:bg-zinc-700 text-[#4E4842] dark:text-zinc-300 text-xs sm:text-sm font-semibold transition-colors shrink-0 cursor-pointer"
              title="Начать диалог сначала"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Новый диалог</span>
            </button>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-7 space-y-4 bg-[#FCFBF9] dark:bg-zinc-950/60 overscroll-contain">
            <div className="text-center">
              <span className="inline-block text-xs font-semibold text-[#8A8178] dark:text-zinc-400 bg-[#F2EEE8] dark:bg-zinc-800 px-3 py-1 rounded-full">
                Сегодня
              </span>
            </div>

            {/* If no messages yet, show default warm greeting */}
            {messages.length === 0 && !loading && (
              <div className="space-y-4">
                <div className="flex gap-3 items-end max-w-[85%] sm:max-w-[80%]">
                  <img
                    src={brand.veraAvatarUrl || "/vera_showroom_avatar.png"}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover shrink-0"
                  />
                  <div className="bg-white dark:bg-zinc-900 border border-[#EDE7E0] dark:border-zinc-800 p-3.5 sm:p-4 rounded-[20px_20px_20px_6px] text-sm sm:text-base leading-relaxed text-[#1C1B1A] dark:text-zinc-100 shadow-2xs">
                    Добрый день! Я Вера, консультант möbel&amp;zeit. Рада приветствовать вас! Подбираете диван в гостиную, мастер-спальню или домашний кинотеатр? Чем могу помочь?
                  </div>
                </div>
              </div>
            )}

            {messages.map((m) => {
              const isAssistant = m.sender === "assistant";
              return (
                <div
                  key={m.id}
                  className={`flex items-end gap-2.5 sm:gap-3 ${
                    isAssistant ? "justify-start" : "justify-end"
                  }`}
                >
                  {isAssistant && (
                    <img
                      src={brand.veraAvatarUrl || "/vera_showroom_avatar.png"}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover shrink-0"
                    />
                  )}
                  <div
                    className={`max-w-[85%] sm:max-w-[78%] p-3.5 sm:p-4 text-sm sm:text-base leading-relaxed ${
                      isAssistant
                        ? "bg-white dark:bg-zinc-900 border border-[#EDE7E0] dark:border-zinc-800 rounded-[20px_20px_20px_6px] text-[#1C1B1A] dark:text-zinc-100 shadow-2xs"
                        : "bg-[#1C1B1A] dark:bg-zinc-800 text-white rounded-[20px_20px_6px_20px] shadow-xs"
                    }`}
                  >
                    <FormattedMessageText text={m.text} isAssistant={isAssistant} />

                    {m.escalation && (
                      <div className="mt-2.5 rounded-xl border border-red-500/30 bg-red-500/10 dark:bg-red-500/15 p-2.5 sm:p-3 text-xs space-y-1.5 text-left">
                        <div className="flex items-center gap-1.5 font-semibold text-red-800 dark:text-red-300">
                          <BellRing className="w-3.5 h-3.5 shrink-0 text-red-600 dark:text-red-400" />
                          <span>Симуляция эскалации менеджеру (Human-in-the-Loop)</span>
                        </div>
                        <p className="text-[11px] text-zinc-600 dark:text-zinc-300 leading-snug">
                          В боевом мессенджере диалог ставится на паузу, а в Telegram-бот команды отправляется карточка:
                        </p>
                        <div className="rounded-lg bg-white/90 dark:bg-zinc-950/80 border border-red-500/25 px-2.5 py-1.5 font-mono text-[11px] text-zinc-800 dark:text-zinc-200 whitespace-pre-line leading-relaxed shadow-xs">
                          {m.escalation.alert_preview || `🚨 Срочный вопрос от клиента!\n💬 Суть: ${m.escalation.reason}`}
                        </div>
                        <p className="text-[10px] text-red-700/90 dark:text-red-400/90 italic">
                          💡 На демо-стенде диалог не блокируется — вы можете продолжить общение с Верой.
                        </p>
                      </div>
                    )}

                    <div
                      className={`text-[10px] mt-1 text-right select-none ${
                        isAssistant
                          ? "text-[#8A8178] dark:text-zinc-500"
                          : "text-zinc-400"
                      }`}
                    >
                      {m.timestamp}
                    </div>
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex items-center gap-3">
                <img
                  src={brand.veraAvatarUrl || "/vera_showroom_avatar.png"}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover shrink-0"
                />
                <div
                  aria-label="Вера печатает"
                  className="flex gap-1.5 bg-white dark:bg-zinc-900 border border-[#EDE7E0] dark:border-zinc-800 px-4 py-3.5 rounded-[20px_20px_20px_6px] shadow-2xs"
                >
                  <span className="w-2 h-2 rounded-full bg-[#B8AEA3] animate-bounce" />
                  <span className="w-2 h-2 rounded-full bg-[#B8AEA3] animate-bounce [animation-delay:0.2s]" />
                  <span className="w-2 h-2 rounded-full bg-[#B8AEA3] animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Questions & Input Box */}
          <div className="flex-none p-4 sm:p-5 border-t border-[#F0EBE5] dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col gap-3">
            {/* Quick Suggested Chips */}
            {brand.suggestedQuestions && brand.suggestedQuestions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {brand.suggestedQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSend(q)}
                    className="font-semibold text-xs sm:text-sm text-[#1C1B1A] dark:text-zinc-200 bg-[#F5F2EE] dark:bg-zinc-800 hover:bg-[#EAE4DC] dark:hover:bg-zinc-700 rounded-full px-3.5 sm:px-4 py-2 cursor-pointer transition-colors shadow-2xs"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2.5 sm:gap-3"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={brand.placeholderText}
                disabled={loading}
                className="flex-1 bg-[#F8F6F3] dark:bg-zinc-800 border border-[#E4DED6] dark:border-zinc-700 rounded-2xl px-4 sm:px-5 py-3.5 sm:py-4 text-sm sm:text-base text-[#1C1B1A] dark:text-white outline-none focus:border-[#C8102E] transition-all placeholder:text-[#8A8178] dark:placeholder:text-zinc-500"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                aria-label="Отправить"
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl text-white flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-all"
                style={{
                  backgroundColor: brand.primaryColor,
                }}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = brand.primaryHover;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = brand.primaryColor;
                  }
                }}
              >
                <Send className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}
