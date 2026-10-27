import React from "react";
import type { Metadata } from "next";
import DemoChatClient from "./[tenant]/demo-chat-client";

export const metadata: Metadata = {
  title: "ALTAI Optima + КОСТИС (демо)",
  description: "Вера уже ждёт вас в чате, чтобы рассказать о компании КОСТИС",
  openGraph: {
    title: "ALTAI Optima + КОСТИС (демо)",
    description: "Вера уже ждёт вас в чате, чтобы рассказать о компании КОСТИС",
    type: "website",
    url: "/demo/",
    siteName: "ALTAI Optima",
  },
  twitter: {
    card: "summary",
    title: "ALTAI Optima + КОСТИС (демо)",
    description: "Вера уже ждёт вас в чате, чтобы рассказать о компании КОСТИС",
  },
};

export default function DemoRootPage() {
  return <DemoChatClient initialTenantId="kostis" />;
}
