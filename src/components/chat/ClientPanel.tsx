"use client";

import React from "react";
import type { ChatDetail } from "@/types";
import { BANTCard } from "@/components/bant-card";

export function ClientPanel({ detail }: { detail: ChatDetail }) {
  return (
    <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/40">
      <BANTCard
        qualification={detail.qualification}
        crmResult={detail.crm_result}
      />
    </div>
  );
}
