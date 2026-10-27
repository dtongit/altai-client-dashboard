import React from "react";
import type { Metadata } from "next";
import DemoChatClient from "./[tenant]/demo-chat-client";

export const metadata: Metadata = {
  title: "Демо ALTAI Optima + КОСТИС",
  description: "Интерактивный демонстрационный стенд автономного ИИ-сотрудника Веры от ALTAI Optima",
};

export default function DemoRootPage() {
  return <DemoChatClient initialTenantId="kostis" />;
}
