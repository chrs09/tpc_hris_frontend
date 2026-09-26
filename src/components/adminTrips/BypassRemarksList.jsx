import React from "react";

// Steps done on the driver's behalf (Trip Bypass, Trip Manual Entries,
// dispatch edits), each with who did it, when and the reason given.
// Renders nothing for a trip with none.
export default function BypassRemarksList({ remarks = [] }) {
  if (!remarks.length) return null;

  return (
    <section className="rounded-xl border border-warning/30 bg-warning/15 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-warning">
        Entered on the Driver&apos;s Behalf
      </p>
      <p className="mt-1 text-xs text-fg-muted">
        Steps done through Trip Bypass, or the whole trip recorded in Trip
        Manual Entries, with the reason given.
      </p>
      <ul className="mt-3 space-y-2">
        {remarks.map((item) => (
          <li
            key={item.id}
            className="rounded-lg border border-border bg-surface p-3 text-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-fg">{item.action_label}</span>
              <span className="text-xs text-fg-subtle">
                {item.performed_by || "-"}
                {item.created_at ? ` · ${item.created_at}` : ""}
              </span>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-fg-muted">
              {item.reason || "No remarks"}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
