"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Inter } from "next/font/google";
import { LayoutDashboard, Briefcase, UsersRound, Target, Wallet, UserRound, LogOut, Presentation } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { PartnerMe } from "@/types";
import { PartnerContext, Spinner } from "@/components/partner/ui";
import { portalRoute, usePortalHref } from "@/lib/portal-path";
import { ThemeToggle } from "@/components/theme-toggle";

// The landing's text font; headings use Benzin (globals.css).
const inter = Inter({ subsets: ["latin", "cyrillic"], weight: ["400", "500", "600", "700", "800"], variable: "--font-pp-inter", display: "swap" });

const NAV = [
  { href: "/partner", label: "Главная", icon: LayoutDashboard },
  { href: "/partner/clients", label: "Клиенты", icon: Briefcase },
  { href: "/partner/demo", label: "Демо", icon: Presentation },
  { href: "/partner/team", label: "Команда", icon: UsersRound },
  { href: "/partner/goal", label: "Моя цель", icon: Target },
  { href: "/partner/payouts", label: "Выплаты", icon: Wallet },
  { href: "/partner/profile", label: "Профиль", icon: UserRound },
];
/** Phone bottom bar: Профиль lives in the top bar there, so six items fit at 360 px. */
const PHONE_NAV = NAV.filter((n) => n.href !== "/partner/profile");

/** The client dashboard's start page. On partner.* / stage-partner.* the root "/" is the partner portal itself, so
 * go to the dashboard host of the same environment (my. / stage.); the cookie session is shared (#440). */
function dashboardHomeUrl(): string {
  if (typeof window === "undefined") return "/";
  const { protocol, hostname, port } = window.location;
  const m = /^(stage-)?partner\.(.+)$/.exec(hostname);
  if (!m) return "/";
  const host = `${m[1] ? "stage" : "my"}.${m[2]}`;
  return `${protocol}//${host}${port ? `:${port}` : ""}/`;
}

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/partner";
  // The route in the /partner/... form, also when the partner host serves it at "/goal" (lib/portal-path.ts).
  const clean = portalRoute(pathname) ?? "/partner";
  const ph = usePortalHref();
  const { user, loading, logout } = useAuth();
  const [me, setMe] = useState<PartnerMe | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "none">("loading");

  const refresh = useCallback(async () => {
    try {
      setMe(await api.partnerMe());
      setState("ok");
    } catch {
      setState("none");
    }
  }, []);

  useEffect(() => {
    if (!loading && user) void refresh();
  }, [loading, user, refresh]);

  const shell = `pp ${inter.variable} min-h-dvh`;

  if (loading || !user || state === "loading") {
    return (
      <div className={shell}>
        <Spinner label="Загрузка..." />
      </div>
    );
  }

  if (state === "none" || !me) {
    return (
      <div className={`${shell} flex items-center justify-center p-6`}>
        <div className="max-w-sm text-center space-y-3">
          <h1 className="pp-head text-lg">Кабинет партнёра недоступен</h1>
          <p className="text-sm text-[var(--pp-muted)]">
            У этой учётной записи нет профиля партнёра. Если вы участник программы «Устрой Веру на работу», войдите под логином, который мы вам выдали.
          </p>
          <a href={dashboardHomeUrl()} className="inline-block text-sm font-semibold text-[var(--pp-accent)]">
            На главную
          </a>
        </div>
      </div>
    );
  }

  if (me.profile.status !== "approved") {
    return (
      <div className={`${shell} flex items-center justify-center p-6`}>
        <div className="max-w-sm text-center space-y-3">
          <h1 className="pp-head text-lg">{me.profile.status === "blocked" ? "Кабинет заблокирован" : "Кабинет ещё не подтверждён"}</h1>
          <p className="text-sm text-[var(--pp-muted)]">
            {me.profile.status === "blocked"
              ? "Доступ к программе закрыт. Если это ошибка, напишите нам."
              : "Мы подтвердим ваш кабинет в ближайшее время и сообщим вам."}
          </p>
          <button type="button" onClick={logout} className="text-sm font-semibold text-[var(--pp-accent)]">
            Выйти
          </button>
        </div>
      </div>
    );
  }

  const isActive = (href: string) => (href === "/partner" ? clean === "/partner" : clean === href || clean.startsWith(href + "/"));
  const name = me.profile.display_name || me.username;

  return (
    <PartnerContext.Provider value={{ me, refresh, setMe }}>
      <div className={`${shell} md:flex`}>
        {/* Desktop: left nav */}
        <aside className="hidden md:flex md:w-60 shrink-0 flex-col border-r border-[var(--pp-line)] bg-[var(--pp-surface)] h-dvh sticky top-0 p-4">
          <div className="mb-6 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/partner/vera-face.webp" alt="Вера" width={44} height={44} className="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-[var(--pp-accent-soft)]" />
            <div className="min-w-0">
              <div className="pp-head text-[11px] leading-snug text-[var(--pp-accent)]">Устрой Веру на работу</div>
              <div className="mt-1 text-xs text-[var(--pp-muted)] truncate">{name}</div>
            </div>
          </div>
          <nav className="flex-1 space-y-1">
            {NAV.map((n) => {
              const Icon = n.icon;
              const on = isActive(n.href);
              return (
                <Link
                  key={n.href}
                  href={ph(n.href)}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                    on ? "bg-[var(--pp-accent)] text-white" : "text-[var(--pp-text)] hover:bg-[var(--pp-accent-soft)]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {n.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center justify-between pt-3 border-t border-[var(--pp-line)]">
            <ThemeToggle up />
            <button type="button" onClick={logout} className="flex items-center gap-2 text-xs font-semibold text-[var(--pp-muted)] hover:text-[var(--pp-text)]">
              <LogOut className="h-4 w-4" />
              Выйти
            </button>
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          {/* Phone: top bar */}
          <header className="md:hidden sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-[var(--pp-line)] bg-[var(--pp-surface)] px-4 py-2.5">
            <span className="flex min-w-0 items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/partner/vera-face.webp" alt="Вера" width={28} height={28} className="h-7 w-7 shrink-0 rounded-full object-cover" />
              <span className="pp-head text-[10px] text-[var(--pp-accent)] truncate">Устрой Веру на работу</span>
            </span>
            <div className="flex items-center gap-1">
              <Link href={ph("/partner/profile")} aria-label="Профиль" className={`p-2 ${isActive("/partner/profile") ? "text-[var(--pp-accent)]" : "text-[var(--pp-muted)]"}`}>
                <UserRound className="h-4 w-4" />
              </Link>
              <ThemeToggle align="right" />
              <button type="button" onClick={logout} aria-label="Выйти" className="p-2 text-[var(--pp-muted)]">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </header>
          <main className="mx-auto max-w-4xl p-4 sm:p-6 pb-28 md:pb-10">{children}</main>
        </div>

        {/* Phone: bottom nav */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 grid grid-cols-6 border-t border-[var(--pp-line)] bg-[var(--pp-surface)] pb-[env(safe-area-inset-bottom)]">
          {PHONE_NAV.map((n) => {
            const Icon = n.icon;
            const on = isActive(n.href);
            return (
              <Link
                key={n.href}
                href={ph(n.href)}
                className={`flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold ${
                  on ? "text-[var(--pp-accent)]" : "text-[var(--pp-muted)]"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="truncate max-w-full px-0.5">{n.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </PartnerContext.Provider>
  );
}
