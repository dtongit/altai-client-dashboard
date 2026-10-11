"use client";

import React, { useState, useRef, useEffect } from "react";
import { useTheme, Theme } from "@/lib/theme-context";
import { Sun, Moon, Monitor, Check } from "lucide-react";

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const options: { id: Theme; label: string; icon: React.ReactNode; hint: string }[] = [
    {
      id: "system",
      label: "Системная",
      hint: "По умолчанию",
      icon: <Monitor className="h-4 w-4" />,
    },
    {
      id: "light",
      label: "Светлая",
      hint: "Дневной режим",
      icon: <Sun className="h-4 w-4" />,
    },
    {
      id: "dark",
      label: "Тёмная",
      hint: "Ночной режим",
      icon: <Moon className="h-4 w-4" />,
    },
  ];

  const currentIcon =
    theme === "system" ? (
      <Monitor className="h-4 w-4 text-zinc-600 dark:text-zinc-300" />
    ) : resolvedTheme === "dark" ? (
      <Moon className="h-4 w-4 text-amber-500" />
    ) : (
      <Sun className="h-4 w-4 text-amber-500" />
    );

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 p-2 rounded-xl text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-900 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 transition-all"
        title="Переключить тему оформления (Светлая / Тёмная / Системная)"
        aria-label="Переключение темы"
        aria-expanded={isOpen}
      >
        {currentIcon}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-52 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-1.5 shadow-xl dark:shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 border-b border-zinc-100 dark:border-zinc-800/80 mb-1">
            Тема оформления
          </div>
          <div className="space-y-0.5">
            {options.map((opt) => {
              const isSelected = theme === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => {
                    setTheme(opt.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-colors ${
                    isSelected
                      ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold"
                      : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800/60"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={isSelected ? "text-amber-700 dark:text-amber-400" : "text-zinc-600 dark:text-zinc-400"}>
                      {opt.icon}
                    </span>
                    <div className="text-left">
                      <div>{opt.label}</div>
                      <div className="text-[10px] text-zinc-600 dark:text-zinc-400 font-normal">
                        {opt.hint}
                      </div>
                    </div>
                  </div>
                  {isSelected && <Check className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
