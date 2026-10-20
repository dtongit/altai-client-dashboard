import React from "react";
import DemoChatClient from "./[tenant]/demo-chat-client";

export default function DemoRootPage() {
  return <DemoChatClient initialTenantId="kostis" />;
}
