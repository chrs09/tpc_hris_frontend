import React from "react";

// Shared card shell for role-specific dashboards (driver, employee, admin)
// so the desktop/laptop layout reads as one consistent system instead of
// a stretched-out mobile view. Colors come from the theme tokens in
// src/index.css, so this automatically follows light/dark mode.
export default function DashboardCard({ title, action, children, className = "" }) {
  return (
    <div
      className={`rounded-2xl border border-border bg-surface p-5 shadow-sm ${className}`}
    >
      {(title || action) && (
        <div className="flex items-center justify-between mb-3">
          {title && <h3 className="text-sm font-semibold text-fg">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
