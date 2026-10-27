import React from "react";
import type { Metadata } from "next";
import DemoChatClient from "./demo-chat-client";
import { getTenantDisplayName } from "@/lib/tenants";

export function generateStaticParams() {
  return [
    { tenant: "kostis" },
    { tenant: "tallora" },
    { tenant: "client_tallora" },
    { tenant: "demo_amo" },
    { tenant: "demo_b24" },
    { tenant: "foxford" },
    { tenant: "gk_fsk" },
    { tenant: "medicinskiy_tsentr_nauka" },
    { tenant: "demo-meditsinskiy-tsentr-nauka" },
    { tenant: "altai_optima" },
    { tenant: "newo_ai" },
    { tenant: "mediasafe" },
    { tenant: "lada_digit" },
    { tenant: "haier" },
  ];
}

type Props = {
  params: Promise<{ tenant: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tenant } = await params;
  const name = getTenantDisplayName(tenant);
  const title = `ALTAI Optima + ${name} (демо)`;
  const description = `Вера уже ждёт вас в чате, чтобы рассказать о компании ${name}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: `/demo/${tenant}/`,
      siteName: "ALTAI Optima",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function Page({ params }: Props) {
  const { tenant } = await params;
  return <DemoChatClient initialTenantId={tenant} />;
}
