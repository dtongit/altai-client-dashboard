"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "./Button";

export interface ConfirmOptions {
  title: string;
  text: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

export function useConfirm() {
  const [state, setState] = useState<{
    open: boolean;
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({
        open: true,
        options,
        resolve,
      });
    });
  }, []);

  const handleCancel = useCallback(() => {
    if (state) {
      state.resolve(false);
      setState(null);
    }
  }, [state]);

  const handleConfirm = useCallback(() => {
    if (state) {
      state.resolve(true);
      setState(null);
    }
  }, [state]);

  const ConfirmDialog = useCallback(() => {
    if (!state || !state.open) return null;

    return (
      <ConfirmDialogView
        options={state.options}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    );
  }, [state, handleConfirm, handleCancel]);

  return { confirm, ConfirmDialog };
}

export function ConfirmDialogView({
  options,
  onConfirm,
  onCancel,
}: {
  options: ConfirmOptions;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Dialog box */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl animate-in zoom-in-95 duration-150 flex flex-col gap-4"
      >
        <div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
            {options.title}
          </h3>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {options.text}
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            ref={cancelBtnRef}
            variant="secondary"
            size="md"
            onClick={onCancel}
          >
            {options.cancelLabel || "Отмена"}
          </Button>
          <Button
            variant={options.danger ? "danger" : "primary"}
            size="md"
            onClick={onConfirm}
          >
            {options.confirmLabel || "Подтвердить"}
          </Button>
        </div>
      </div>
    </div>
  );
}
