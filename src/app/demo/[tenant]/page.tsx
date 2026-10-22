import React from "react";
import DemoChatClient from "./demo-chat-client";

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
  ];
}

type Props = {
  params: Promise<{ tenant: string }>;
};

export default async function Page({ params }: Props) {
  const { tenant } = await params;
  return <DemoChatClient initialTenantId={tenant} />;
}
