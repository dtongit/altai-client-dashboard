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

  const chatScrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTo({
        top: chatScrollRef.current.scrollHeight,
        behavior,
      });
    }
  };

  useEffect(() => {
    scrollToBottom("smooth");
    const t = setTimeout(() => {
      scrollToBottom("smooth");
    }, 50);
    return () => clearTimeout(t);
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

  const renderIntegrationsAndDisclaimer = () => (
    <>
      <div className="flex flex-col gap-3.5 sm:gap-4">
        {/* Messengers Block - clean unboxed list */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold tracking-[0.08em] uppercase text-[#8A8178] block">
            Живёт там, где пишут ваши клиенты
          </span>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs sm:text-[13px] font-bold text-[#1C1B1A]">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#25D366] shrink-0" />
              <span>WhatsApp</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#229ED9] shrink-0" />
              <span>Telegram</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E1306C] shrink-0" />
              <span>Instagram</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00AAFF] shrink-0" />
              <span>Авито</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#7B3FF2] shrink-0" />
              <span>MAX</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0077FF] shrink-0" />
              <span>VK</span>
            </div>
          </div>
          <p className="text-[11px] sm:text-xs leading-snug text-[#6B645C]">
            Вера мгновенно подхватывает обращения в любых мессенджерах и передаёт в CRM готовые заказы
          </p>
        </div>

        {/* CRM Block */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold tracking-[0.08em] uppercase text-[#8A8178] block">
            Сама ведёт базу в любой CRM
          </span>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <div className="flex items-center gap-1.5">
              <img
                src="/logos/amocrm_logo.webp"
                alt="amoCRM"
                className="h-5 w-auto object-contain"
              />
              <span className="text-xs sm:text-[13px] font-bold text-[#1C1B1A]">amoCRM</span>
            </div>
            <div className="flex items-center gap-1.5">
              <img
                src="/logos/bitrix24_logo.webp"
                alt="Битрикс24"
                className="h-5 w-auto object-contain"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <img
                src="/logos/1c_logo.webp"
                alt="1С"
                className="h-5 w-auto object-contain"
              />
              <span className="text-xs sm:text-[13px] font-bold text-[#1C1B1A]">1С</span>
            </div>
            <div className="flex items-center gap-1.5">
              <img
                src="/logos/moysklad_logo.svg"
                alt="МойСклад"
                className="h-5 w-auto object-contain"
              />
              <span className="text-xs sm:text-[13px] font-bold text-[#1C1B1A]">МойСклад</span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg className="h-4.5 w-auto aspect-square shrink-0" viewBox="0 0 32 32" fill="none">
                <rect x="2" y="4" width="28" height="24" rx="4" fill="#107C41" />
                <rect x="18" y="9" width="9" height="14" fill="#185C37" opacity="0.3" />
                <path d="M18 9h9v4h-9V9zm0 5h9v4h-9v-4zm0 5h9v4h-9v-4z" fill="#fff" opacity="0.25" />
                <rect x="4" y="7" width="13" height="18" rx="2" fill="#107C41" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.25))" />
                <path d="M7.8 11.5l2.2 3.5 2.2-3.5h2.3l-3.3 4.5 3.5 4.5h-2.3l-2.4-3.6-2.4 3.6H5.5l3.5-4.5-3.3-4.5h2.1z" fill="#fff" />
              </svg>
              <span className="text-xs sm:text-[13px] font-bold text-[#1C1B1A]">Excel</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Disclaimer */}
      <p className="border-t border-[#E4DED6] pt-2 text-[11px] sm:text-xs text-[#6B645C] leading-relaxed">
        Это демо-версия Веры на основе открытых материалов {displayTenant}. Для точных ответов во всех сценариях нужна полноценная интеграция от{" "}
        <Link
          href="https://optima.altaiweb.online"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: brand.primaryColor }}
          className="font-bold hover:underline"
        >
          ALTAI Optima
        </Link>
      </p>
    </>
  );

  return (
    <div className="relative min-h-[100dvh] w-full flex flex-col bg-[#F5F2EE] text-[#1C1B1A] font-['Manrope',system-ui,sans-serif] overflow-y-auto overflow-x-hidden">
      {/* Header */}
      <header className="relative flex-none z-20 w-full h-[60px] sm:h-[68px] px-6 sm:px-10 lg:px-12 border-b border-[#E4DED6] bg-[#F5F2EE] flex items-center justify-between">
        <div className="flex items-center gap-4 sm:gap-6 min-w-0">
          <img
            src={brand.logoShowroomUrl || brand.logoBadgeUrl || "/mobel_zeit_showroom.png"}
            alt={displayTenant}
            className="h-7 sm:h-8 w-auto object-contain shrink-0 block"
          />
        </div>

        <div className="flex items-center gap-4 sm:gap-6 shrink-0">
          <Link
            href="https://optima.altaiweb.online"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 sm:gap-2 text-[#6B645C] hover:text-[#1C1B1A] text-xs sm:text-[13px] font-medium transition-colors"
          >
            <span>powered by</span>
            <span className="font-extrabold tracking-wider text-[#14213D] uppercase">
              ALTAI OPTIMA
            </span>
          </Link>
        </div>
      </header>

      {/* Main Two-Column Layout */}
      <main className="relative z-10 flex-1 min-h-0 max-w-[1440px] mx-auto w-full flex flex-col lg:flex-row lg:items-start gap-6 lg:gap-8 xl:gap-10 px-4 sm:px-8 lg:px-10 xl:px-12 py-3 sm:py-4 lg:py-4">
        {/* Left Column (Desktop: fixed height matching chat with integrations at bottom. Mobile: top text only) */}
        <section className="w-full lg:w-[460px] xl:w-[490px] shrink-0 flex flex-col justify-between lg:h-[640px] xl:h-[680px] gap-4 py-1">
          {/* Top text block */}
          <div className="flex flex-col gap-2.5 sm:gap-3">
            {/* Heading */}
            <h1 className="text-2xl sm:text-3xl lg:text-[34px] xl:text-[38px] font-extrabold leading-[1.12] tracking-[-0.02em] text-[#1C1B1A]">
              Добрый день!{" "}
              <span style={{ color: brand.primaryColor }}>Меня зовут Вера</span>
            </h1>

            {/* Description */}
            <p className="text-xs sm:text-sm lg:text-[13.5px] xl:text-[14.5px] leading-[1.5] text-[#3B3631]">
              Я уже изучила ваш бизнес и готова стать вашим лучшим сотрудником. Объединяю обаяние чуткого эксперта, острый ум и железную цифровую дисциплину. Держу в памяти историю каждого клиента, общаюсь по стандартам флагманского салона и уверенно довожу диалоги до реальных сделок в CRM.
            </p>

            {/* Cursive Handwriting Note */}
            <p
              className="font-['Caveat',cursive] text-lg sm:text-[20px] lg:text-[21px] leading-tight"
              style={{ color: brand.primaryColor }}
            >
              Напишите мне от лица покупателя и проверьте мой профессионализм в деле
            </p>

            {/* Vera Showroom / Welcome Photo */}
            {brand.veraPhotoUrl && (
              <div className="relative w-full rounded-2xl overflow-hidden shadow-xs border border-[#E4DED6] bg-white group mt-0.5">
                <img
                  src={brand.veraPhotoUrl}
                  alt={`Вера — консультант ${displayTenant}`}
                  className="w-full h-[140px] sm:h-[160px] lg:h-[155px] xl:h-[175px] object-cover object-[center_25%] transition-transform duration-500 group-hover:scale-[1.02]"
                />
                <div className="absolute bottom-2 left-2.5 px-2.5 py-0.5 rounded-full bg-slate-900/80 backdrop-blur-md text-white text-[10.5px] font-medium flex items-center gap-1.5 shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1F9D55] animate-pulse" />
                  <span>Вера онлайн · {displayTenant}</span>
                </div>
              </div>
            )}
          </div>

          {/* Desktop-only: Channels, CRM and Disclaimer at bottom of left column */}
          <div className="hidden lg:flex lg:flex-col lg:gap-3.5 lg:mt-auto pt-1">
            {renderIntegrationsAndDisclaimer()}
          </div>
        </section>

        {/* Right Column: Live Interactive Chat with Vera (Fixed height, internal scroll upwards like real messengers) */}
        <section
          aria-label="Чат с Верой"
          className="flex-1 min-w-0 h-[560px] sm:h-[620px] lg:h-[640px] xl:h-[680px] bg-white rounded-[24px] sm:rounded-[28px] shadow-[0_20px_50px_-20px_rgba(60,40,20,0.18),0_0_0_1px_#EAE4DC] flex flex-col overflow-hidden shrink-0"
        >
          {/* Card Header */}
          <div className="flex-none flex items-center justify-between px-5 sm:px-6 py-3.5 sm:py-4 border-b border-[#F0EBE5] bg-white">
            <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
              <div className="relative w-11 h-11 sm:w-12 sm:h-12 shrink-0">
                <img
                  src={brand.veraAvatarUrl || "/vera_avatar_v2.png"}
                  alt="Вера"
                  className="w-11 h-11 sm:w-12 sm:h-12 rounded-full object-cover object-center shadow-xs"
                  style={{
                    boxShadow: `0 0 0 2.5px #FFFFFF, 0 0 0 4.5px ${brand.primaryColor}`,
                  }}
                />
                <span className="absolute right-0 bottom-0 w-3.5 h-3.5 rounded-full bg-[#1F9D55] border-2 border-white" />
              </div>
              <div className="min-w-0 flex flex-col gap-0.5">
                <span className="text-lg sm:text-[19px] font-extrabold text-[#1C1B1A] leading-tight">
                  Вера
                </span>
                <span className="text-xs sm:text-sm text-[#6B645C] truncate">
                  консультант {displayTenant} · {loading ? "печатает…" : "в сети"}
                </span>
              </div>
            </div>

            <button
              onClick={handleReset}
              aria-label="Сбросить диалог"
              className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-full bg-[#F5F2EE] hover:bg-[#EAE4DC] text-[#4E4842] text-xs sm:text-sm font-semibold transition-colors shrink-0 cursor-pointer"
              title="Начать диалог сначала"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Новый диалог</span>
            </button>
          </div>

          {/* Messages Stream */}
          <div
            ref={chatScrollRef}
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-7 space-y-4 bg-[#FCFBF9]"
          >
            <div className="text-center">
              <span className="inline-block text-xs font-semibold text-[#8A8178] bg-[#F2EEE8] px-3 py-1 rounded-full">
                Сегодня
              </span>
            </div>

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
                      src={brand.veraAvatarUrl || "/vera_avatar_v2.png"}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover object-center shrink-0"
                    />
                  )}
                  <div
                    className={`max-w-[85%] sm:max-w-[78%] p-3.5 sm:p-4 text-sm sm:text-base leading-relaxed ${
                      isAssistant
                        ? "bg-white border border-[#EDE7E0] rounded-[20px_20px_20px_6px] text-[#1C1B1A] shadow-2xs"
                        : "bg-[#1C1B1A] text-white rounded-[20px_20px_6px_20px] shadow-xs"
                    }`}
                  >
                    <FormattedMessageText text={m.text} isAssistant={isAssistant} />

                    {m.escalation && (
                      <div className="mt-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-2.5 sm:p-3 text-xs space-y-1.5 text-left">
                        <div className="flex items-center gap-1.5 font-semibold text-red-800">
                          <BellRing className="w-3.5 h-3.5 shrink-0 text-red-600" />
                          <span>Симуляция эскалации менеджеру (Human-in-the-Loop)</span>
                        </div>
                        <p className="text-[11px] text-zinc-600 leading-snug">
                          В боевом мессенджере диалог ставится на паузу, а в Telegram-бот команды отправляется карточка:
                        </p>
                        <div className="rounded-lg bg-white/90 border border-red-500/25 px-2.5 py-1.5 font-mono text-[11px] text-zinc-800 whitespace-pre-line leading-relaxed shadow-xs">
                          {m.escalation.alert_preview || `🚨 Срочный вопрос от клиента!\n💬 Суть: ${m.escalation.reason}`}
                        </div>
                        <p className="text-[10px] text-red-700/90 italic">
                          💡 На демо-стенде диалог не блокируется — вы можете продолжить общение с Верой.
                        </p>
                      </div>
                    )}

                    <div
                      className={`text-[10px] mt-1 text-right select-none ${
                        isAssistant ? "text-[#8A8178]" : "text-zinc-400"
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
                  src={brand.veraAvatarUrl || "/vera_avatar_v2.png"}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover object-center shrink-0"
                />
                <div
                  aria-label="Вера печатает"
                  className="flex gap-1.5 bg-white border border-[#EDE7E0] px-4 py-3.5 rounded-[20px_20px_20px_6px] shadow-2xs"
                >
                  <span className="w-2 h-2 rounded-full bg-[#B8AEA3] animate-bounce" />
                  <span className="w-2 h-2 rounded-full bg-[#B8AEA3] animate-bounce [animation-delay:0.2s]" />
                  <span className="w-2 h-2 rounded-full bg-[#B8AEA3] animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}
          </div>

          {/* Quick Questions & Input Box */}
          <div className="flex-none p-3 sm:p-4 border-t border-[#F0EBE5] bg-white flex flex-col gap-2.5">
            {/* Quick Suggested Chips */}
            {brand.suggestedQuestions && brand.suggestedQuestions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {brand.suggestedQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSend(q)}
                    className="font-semibold text-xs sm:text-[13px] text-[#1C1B1A] bg-[#F5F2EE] hover:bg-[#EAE4DC] rounded-full px-3 sm:px-3.5 py-1.5 cursor-pointer transition-colors shadow-2xs"
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
              className="flex items-center gap-2 sm:gap-2.5"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={brand.placeholderText}
                disabled={loading}
                className="flex-1 bg-[#F8F6F3] border border-[#E4DED6] rounded-xl sm:rounded-2xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-[16px] sm:text-[15px] text-[#1C1B1A] outline-none focus:border-[#C8102E] transition-all placeholder:text-[#8A8178]"
                style={{ fontSize: "16px" }}
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                aria-label="Отправить"
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl text-white flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-all"
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

        {/* Mobile-only: Channels, CRM and Disclaimer under the Chat window */}
        <div className="flex lg:hidden flex-col gap-4 pt-2 pb-6 shrink-0">
          {renderIntegrationsAndDisclaimer()}
        </div>
      </main>
    </div>
  );
}
