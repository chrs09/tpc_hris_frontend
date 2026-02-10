// Card.jsx
import React from "react";

export function Card({ children, className = "", ...props }) {
  return (
    <div
      className={`border-0 rounded-lg shadow p-4 bg-white ${className}`}
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
  return <div className={`mt-2 text-2xl ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = "" }) {
  return <div className={`mt-2 ${className}`}>{children}</div>;
}