import React from "react";

export function Label({ children, className = "", ...props }) {
  return (
    <label
      className={`block text-md mt-4 font-medium font-mono text-gray-700 ${className}`}
      {...props}
    >
      {children}
    </label>
  );
}
