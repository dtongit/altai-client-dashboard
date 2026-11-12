"use client";

import React, { createContext, useCallback, useContext, useState } from "react";

type ToastType = "info" | "success" | "error" | "warning";
interface ToastItem {
  id: number;
  type: ToastType;
  text: string;
}

const ToastContext = createContext<{ showToast: (text: string, type?: ToastType) => void }>({
  showToast: () => {},
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const showToast = useCallback((text: string, type: ToastType = "info") => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, type, text }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 5000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-[60] space-y-2 pointer-events-none">
        {items.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto rounded-xl border px-4 py-3 text-xs shadow-lg backdrop-blur-md ${
              t.type === "error"
                ? "bg-rose-50 border-rose-300 text-rose-800 dark:bg-rose-950/80 dark:border-rose-500/40 dark:text-rose-200"
                : t.type === "success"
                ? "bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-950/80 dark:border-emerald-500/40 dark:text-emerald-200"
                : "bg-amber-50 border-amber-300 text-amber-900 dark:bg-amber-950/80 dark:border-amber-500/40 dark:text-amber-200"
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
