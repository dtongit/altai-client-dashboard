"use client";

import { useEffect, useState } from "react";

// On partner.* / stage-partner.* the partner portal is served at the root (functions/_middleware.js rewrites "/goal"
// to the static "/partner/goal"); elsewhere it lives under /partner. Keep PORTAL_SECTIONS in sync with the middleware.
export const PORTAL_SECTIONS = ["clients", "demo", "team", "goal", "payouts", "profile"];

export function isPartnerHost(hostname?: string): boolean {
  const h = hostname ?? (typeof window !== "undefined" ? window.location.hostname : "");
  return /^(stage-)?partner\./.test(h);
}

/** The portal route of a browser path in the `/partner/...` form, or null when the path is not part of the portal. */
export function portalRoute(pathname: string, onPartnerHost = isPartnerHost()): string | null {
  const p = pathname.replace(/\/+$/, "") || "/";
  if (p === "/partner" || p.startsWith("/partner/")) return p;
  if (!onPartnerHost) return null;
  if (p === "/" || p === "/index.html") return "/partner";
  const first = p.split("/")[1] || "";
  return PORTAL_SECTIONS.includes(first) ? `/partner${p}` : null;
}

/** `/partner/goal` -> `/goal` on a partner host. */
export function cleanPortalHref(href: string, onPartnerHost = isPartnerHost()): string {
  if (!onPartnerHost) return href;
  const rest = href.replace(/^\/partner(?=\/|\?|$)/, "");
  return rest === "" || rest.startsWith("?") ? `/${rest}` : rest;
}

/**
 * Link builder for portal pages. The first render uses the `/partner/...` form the static HTML was built with (no
 * hydration mismatch); after mount it switches to clean paths on a partner host.
 */
export function usePortalHref(): (href: string) => string {
  const [partnerHost, setPartnerHost] = useState(false);
  useEffect(() => setPartnerHost(isPartnerHost()), []);
  return (href: string) => cleanPortalHref(href, partnerHost);
}
