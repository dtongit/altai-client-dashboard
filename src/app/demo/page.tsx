import React from "react";
import type { Metadata } from "next";
import DemoChatClient from "./[tenant]/demo-chat-client";

export const metadata: Metadata = {
  title: "ALTAI Optima — Демо ИИ-сотрудника",
  description: "Вера уже ждёт вас в чате, чтобы рассказать о компании и ответить на вопросы",
  openGraph: {
    title: "ALTAI Optima — Демо ИИ-сотрудника",
    description: "Вера уже ждёт вас в чате, чтобы рассказать о компании и ответить на вопросы",
    type: "website",
    url: "/demo/",
    siteName: "ALTAI Optima",
  },
  twitter: {
    card: "summary",
    title: "ALTAI Optima — Демо ИИ-сотрудника",
    description: "Вера уже ждёт вас в чате, чтобы рассказать о компании и ответить на вопросы",
  },
};

export default function DemoRootPage() {
  return <DemoChatClient />;
}
