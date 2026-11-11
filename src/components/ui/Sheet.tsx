"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";
import { IconButton } from "./IconButton";

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Sheet({ open, onClose, title, children, className = "" }: SheetProps) {
  useEffect(() => {
    if (!open) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-stretch md:justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet Content Container */}
      <div
        role="dialog"
        aria-modal="true"
        className={`relative z-10 w-full md:w-[380px] max-h-[90dvh] md:max-h-none md:h-full flex flex-col bg-white dark:bg-zinc-900 rounded-t-3xl md:rounded-none border-t md:border-t-0 md:border-l border-zinc-200 dark:border-zinc-800 shadow-2xl animate-in slide-in-from-bottom md:slide-in-from-right duration-200 ${className}`}
      >
        {/* Mobile Drag Handle */}
        <div className="md:hidden pt-3 pb-1 flex justify-center">
          <div className="w-12 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
          <div className="font-semibold text-base text-zinc-900 dark:text-white truncate pr-2">
            {title}
          </div>
          <IconButton
            size="sm"
            aria-label="Закрыть"
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            <X className="h-5 w-5" />
          </IconButton>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] md:pb-5">
          {children}
        </div>
      </div>
    </div>
  );
}
