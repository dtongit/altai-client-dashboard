"use client";

import React, { forwardRef } from "react";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      className = "",
      children,
      ...props
    },
    ref
  ) => {
    const base =
      "inline-flex items-center justify-center font-medium transition-colors select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed";

    const variantCls = {
      primary:
        "bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-zinc-950 font-semibold shadow-sm",
      secondary:
        "border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:bg-zinc-200 dark:active:bg-zinc-700",
      danger:
        "bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-medium shadow-sm",
      ghost:
        "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:bg-zinc-200 dark:active:bg-zinc-700",
    }[variant];

    const sizeCls = {
      sm: "h-8 px-3 text-xs sm:text-sm rounded-lg min-h-[40px] min-w-[40px] sm:min-h-0 sm:min-w-0 gap-1.5",
      md: "h-10 px-4 text-sm rounded-xl min-h-[40px] min-w-[40px] gap-2",
    }[size];

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${base} ${variantCls} ${sizeCls} ${className}`}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin shrink-0" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
