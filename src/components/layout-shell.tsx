"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";
  const isStartPage = pathname === "/";
  const showSidebar = !isLoginPage && !isStartPage;

  if (isLoginPage) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors">
      <Navbar />
      <div className="flex-1 flex overflow-hidden">
        {showSidebar && <Sidebar />}
        <main className="flex-1 overflow-y-auto bg-zinc-100/60 dark:bg-zinc-950/50">
          {children}
        </main>
      </div>
    </div>
  );
}
