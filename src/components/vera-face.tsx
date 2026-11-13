import React from "react";

/** Vera's face as an icon. Vera is never shown as a robot (no 🤖, no Bot icon): always this female face. */
export function VeraFace({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <img
      src="/avatar_eva_face.webp"
      alt=""
      aria-hidden="true"
      className={`${className} rounded-full object-cover shrink-0`}
    />
  );
}
