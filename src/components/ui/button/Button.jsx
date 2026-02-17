// src/components/ui/button/Button.jsx
import React from "react";
import clsx from "clsx";

/**
 * ShadCN-style Button
 * Props:
 *  - variant: "default" | "outline" | "ghost" | "destructive"
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
    "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";

  const variants = {
    default: "bg-[#ffa903] text-white hover:bg-[#e69503] cursor-pointer",
    outline: "border border-gray-300 text-gray-700 hover:bg-gray-100 ",
    ghost: "bg-transparent hover:bg-gray-100 text-gray-700",
    destructive: "bg-red-500 text-white hover:bg-red-600",
  };

  const sizes = {
    sm: "px-2 py-1 text-sm",
    md: "px-4 py-2 text-md",
    lg: "px-6 py-3 text-lg",
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
