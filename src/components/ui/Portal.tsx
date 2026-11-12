"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Renders children into document.body. Client-only: renders nothing during prerender
 * and the first hydration pass. Needed because ancestors with backdrop-filter become the
 * containing block of `position: fixed` descendants.
 */
export function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}
