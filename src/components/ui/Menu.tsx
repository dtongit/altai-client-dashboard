"use client";

import React, { useState, useRef, useEffect } from "react";
import { MoreHorizontal } from "lucide-react";
import { IconButton } from "./IconButton";
import { Portal } from "./Portal";

export interface MenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  hidden?: boolean;
  /** Shown only in the phone action sheet (the desktop has its own button for it). */
  mobileOnly?: boolean;
}

export interface MenuProps {
  items: MenuItem[];
  trigger?: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}

export function Menu({ items, trigger, align = "right", className = "" }: MenuProps) {
  const [open, setOpen] = useState(false);
  // Desktop dropdown position (viewport coordinates of the trigger). The dropdown is portalled to <body> so a parent
  // with overflow, backdrop-filter or a later sibling (the message list) can never paint over it or eat its clicks.
  const [pos, setPos] = useState<{ top: number; left: number; right: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const visibleItems = items.filter((item) => !item.hidden);
  const desktopItems = visibleItems.filter((item) => !item.mobileOnly);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(t) &&
        !(sheetRef.current && sheetRef.current.contains(t)) &&
        !(dropdownRef.current && dropdownRef.current.contains(t))
      ) {
        setOpen(false);
      }
    };

    const place = () => {
      const r = containerRef.current?.getBoundingClientRect();
      if (r) setPos({ top: r.bottom + 4, left: r.left, right: window.innerWidth - r.right });
    };
    place();
    const close = () => setOpen(false);

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", close, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", close, true);
    };
  }, [open]);

  if (visibleItems.length === 0) return null;

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${desktopItems.length === 0 ? "md:hidden" : ""} ${className}`}>
      <div onClick={() => setOpen(!open)}>
        {trigger || (
          <IconButton
            type="button"
            aria-label="Меню действий"
            size="sm"
            className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
          >
            <MoreHorizontal className="h-5 w-5" />
          </IconButton>
        )}
      </div>

      {open && (
        <>
          <Portal>
          <div ref={sheetRef} className="md:hidden">
          {/* Mobile Action Sheet Backdrop */}
          <div
            className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-xs animate-in fade-in"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          {/* Mobile Action Sheet (below md) */}
          <div
            role="dialog"
            aria-modal="true"
            className="md:hidden fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl animate-in slide-in-from-bottom duration-200 flex flex-col gap-1.5"
          >
            <div className="w-12 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700 mx-auto mb-2" />
            {visibleItems.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setOpen(false);
                  item.onClick();
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-colors text-left min-h-[44px] ${
                  item.danger
                    ? "text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 active:bg-rose-100 dark:active:bg-rose-950/60"
                    : "text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:bg-zinc-200 dark:active:bg-zinc-700"
                }`}
              >
                {item.icon && <span className="shrink-0">{item.icon}</span>}
                <span className="flex-1 truncate">{item.label}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full mt-2 py-3 rounded-xl text-base font-semibold text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-800 min-h-[44px]"
            >
              Отмена
            </button>
          </div>

          </div>
          </Portal>

          {/* Desktop Dropdown (md and up) */}
          {pos && desktopItems.length > 0 && (
          <Portal>
          <div
            ref={dropdownRef}
            role="menu"
            style={align === "left" ? { top: pos.top, left: pos.left } : { top: pos.top, right: pos.right }}
            className="hidden md:block fixed z-[60] min-w-[200px] rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-1 shadow-lg ring-1 ring-black/5"
          >
            {desktopItems.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setOpen(false);
                  item.onClick();
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                  item.danger
                    ? "text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    : "text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                {item.icon && <span className="shrink-0">{item.icon}</span>}
                <span className="flex-1 truncate">{item.label}</span>
              </button>
            ))}
          </div>
          </Portal>
          )}
        </>
      )}
    </div>
  );
}
