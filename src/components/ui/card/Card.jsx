// Card.jsx
import React from "react";

export function Card({ children, className = "", ...props }) {
  return (
    <div
      className={`rounded-xl border border-border bg-surface p-4 text-fg shadow-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

// Optional subcomponents
export function CardHeader({ children, className = "" }) {
  return <div className={`m-3.5 font-bold ${className}`}>{children}</div>;
}

export function CardContent({ children, className = "" }) {
  return <div className={`m-3.5 ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = "" }) {
  return <div className={`mt-2 ${className}`}>{children}</div>;
}

export function CardDescription({ children, className = "" }) {
  return (
    <div className={`mt-2 text-sm text-fg-muted ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = "" }) {
  return (
    <div className={`mt-2 text-lg font-semibold ${className}`}>
      {children}
    </div>
  );
}
