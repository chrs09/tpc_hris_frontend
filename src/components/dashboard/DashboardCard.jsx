import React from "react";

// Shared card shell for role-specific dashboards (driver, employee, admin)
// so the desktop/laptop layout reads as one consistent system instead of
// a stretched-out mobile view. Colors come from the theme tokens in
// src/index.css, so this automatically follows light/dark mode.
// Optional `icon` and `subtitle` give the header more context.
export default function DashboardCard({ title, subtitle, icon: Icon, action, children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-border bg-surface p-5 shadow-sm ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2.5">
            {Icon && (
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon size={16} />
              </span>
            )}
            <div className="min-w-0">
              {title && <h3 className="text-sm font-semibold text-fg">{title}</h3>}
              {subtitle && <p className="mt-0.5 text-xs text-fg-subtle">{subtitle}</p>}
            </div>
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
