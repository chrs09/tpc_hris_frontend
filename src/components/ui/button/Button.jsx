// src/components/ui/button/Button.jsx
import React from "react";
import clsx from "clsx";

/**
 * Themed button using the design tokens in src/index.css.
 * Props:
 *  - variant: "default" | "secondary" | "outline" | "ghost" | "destructive"
 *  - size: "sm" | "md" | "lg"
 *  - className: custom tailwind classes
 */
export function Button({
  children,
  variant = "default",
  size = "md",
  className,
  ...props
}) {
  const baseStyles =
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-50 disabled:pointer-events-none cursor-pointer";

  const variants = {
    default: "bg-primary text-primary-foreground hover:bg-primary-hover",
    secondary: "bg-surface-active text-fg hover:bg-surface-hover",
    outline:
      "border border-border bg-transparent text-fg hover:bg-surface-hover",
    ghost: "bg-transparent text-fg hover:bg-surface-hover",
    destructive: "bg-danger text-danger-foreground hover:bg-danger-hover",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  return (
    <button
      className={clsx(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
}
