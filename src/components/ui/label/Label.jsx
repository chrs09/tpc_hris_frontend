import React from "react";

export function Label({ children, className = "", ...props }) {
  return (
    <label
      className={`mt-4 block text-sm font-medium text-fg-muted ${className}`}
      {...props}
    >
      {children}
    </label>
  );
}
