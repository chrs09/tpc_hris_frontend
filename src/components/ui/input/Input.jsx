import React from "react";

export function Input({ className = "", ...props }) {
  const baseStyles =
    "font-mono w-[100%] px-3 py-2 border rounded-md focus:outline-none focus:border-none focus:ring-3 focus:ring-[#fba919]";
  return <input className={`${baseStyles} ${className}`} {...props} />;
}
