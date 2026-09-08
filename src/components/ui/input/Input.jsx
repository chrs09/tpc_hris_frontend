import React from "react";

export function Input({ className = "", ...props }) {
  const baseStyles =
    "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-subtle transition-colors focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 disabled:opacity-50";
  return <input className={`${baseStyles} ${className}`} {...props} />;
}
