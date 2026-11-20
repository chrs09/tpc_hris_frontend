import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { formatMissingDates } from "../../utils/payroll/cutoffCompleteness";

// Trip statuses: documents still with Trip Document, and trips not yet
// through approval (so their pay isn't final).
const DOCS_PENDING = ["PENDING_OFFICE_REVIEW"];
const NOT_APPROVED = [
  "ASSIGNED",
  "ACTIVE",
  "PENDING_MANUAL_APPROVAL",
  "PENDING_APPROVAL",
  "PENDING_FINANCE_REVIEW",
];
const TRIP_STATUS_LABEL = {
  ASSIGNED: "Assigned",
  ACTIVE: "In progress",
  PENDING_MANUAL_APPROVAL: "Manual entry, waiting",
  PENDING_APPROVAL: "Trip Approvals",
  PENDING_OFFICE_REVIEW: "Trip Document",
  PENDING_FINANCE_REVIEW: "Finance Trips",
};

// Pay run pre-check (before Generate): what's still open for the people in
// this pay run. Server items (missing time outs, attendance review, time
// corrections, OT, leave) plus the ones worked out on the page (days with
// no attendance, trips not cleared). Reports every item to onItems so
// Generate can ask before going ahead.
export default function PayRunPrecheck({
  start,
  end,
  employees,
  tripBasedIds = [],
  incompleteRows,
  tripCheck,
  loadServerItems,
  onItems,
}) {
  const tripBasedKey = [...new Set(tripBasedIds)].sort((a, b) => a - b).join(",");
  const [serverItems, setServerItems] = useState(null);
  const [failed, setFailed] = useState(false);
  const [openKey, setOpenKey] = useState(null);
  const [reload, setReload] = useState(0);

  const employeeIds = useMemo(() => [...new Set(employees.map((e) => e.id))], [employees]);
  const idsKey = employeeIds.join(",");
  const nameOf = useMemo(() => {
    const map = {};
    employees.forEach((e) => {
      map[e.id] = `${e.first_name || ""} ${e.last_name || ""}`.trim();
    });
    return map;
  }, [employees]);

  useEffect(() => {
    if (!start || !end || !idsKey) return;
    let cancelled = false;
    loadServerItems({
      start,
      end,
      employeeIds: idsKey.split(",").map(Number),
      tripBasedIds: tripBasedKey ? tripBasedKey.split(",").map(Number) : [],
    })
      .then((data) => {
        if (cancelled) return;
        setServerItems(data.items || []);
        setFailed(false);
      })
      .catch(() => {
        if (!cancelled) {
          setServerItems([]);
          setFailed(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [start, end, idsKey, tripBasedKey, loadServerItems, reload]);

  const items = useMemo(() => {
    const ids = new Set(employeeIds);
    const trips = (tripCheck || []).filter((t) => ids.has(t.employee_id));
    const tripEntries = (statuses) =>
      trips
        .filter((t) => statuses.includes(t.status))
        .map((t) => ({
          name: nameOf[t.employee_id],
          date: t.date,
          detail: `${t.ticket_no || `Trip #${t.trip_id}`} · ${t.step || TRIP_STATUS_LABEL[t.status] || t.status}`,
          // Who it's waiting on (Org Chart approver at this step, or the
          // coordinator it was handed to) and, in Trip Document, the
          // photos still missing.
          responsible: t.responsible,
          missing: t.missing_docs || [],
        }));
    const local = [
      {
        key: "no_attendance",
        label: "Scheduled days with no attendance",
        entries: (incompleteRows || []).map((row) => ({
          name: `${row.employee.first_name} ${row.employee.last_name}`,
          date: row.completeness.missingDates[0],
          detail: formatMissingDates(row.completeness.missingDates),
        })),
        fix: "/dashboard/attendance",
      },
      {
        key: "trip_docs",
        label: "Trip documents not received",
        entries: tripEntries(DOCS_PENDING),
        fix: "/dashboard/office/trips",
      },
      {
        key: "trips_not_approved",
        label: "Trips not yet approved",
        entries: tripEntries(NOT_APPROVED),
        fix: "/dashboard/admin/trips",
      },
    ].map((item) => ({ ...item, count: item.entries.length }));
    return [...(serverItems || []), ...local];
  }, [serverItems, incompleteRows, tripCheck, employeeIds, nameOf]);

  // Report only when the counts actually change: reporting a fresh array
  // every render re-renders the page, which can loop forever.
  const reportKey = serverItems
    ? items.map((item) => `${item.key}:${item.count}`).join("|")
    : "";
  useEffect(() => {
    onItems?.(reportKey ? items : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reportKey stands for items
  }, [reportKey, onItems]);

  const openCount = items.filter((item) => item.count > 0).length;
  const loading = serverItems === null;

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-fg">Pre-check before generating</p>
          <p className="text-xs text-fg-subtle">
            {loading
              ? "Checking..."
              : openCount === 0
                ? "Nothing open -- ready to generate."
                : `${openCount} item${openCount === 1 ? "" : "s"} still open. You can fix them first, or generate anyway with a note -- anything not captured goes in the next pay run.`}
            {failed ? " Some checks couldn't load." : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setReload((n) => n + 1)}
          className="rounded-md border border-border px-2.5 py-1 text-xs font-semibold text-fg-muted hover:bg-surface-hover"
        >
          Check again
        </button>
      </div>

      <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => {
          const ok = item.count === 0;
          const expanded = openKey === item.key;
          return (
            <li
              key={item.key}
              className={`rounded-lg border px-3 py-2 ${
                ok ? "border-border" : "border-warning/40 bg-warning/5"
              } ${expanded ? "sm:col-span-2 lg:col-span-4" : ""}`}
            >
              <button
                type="button"
                disabled={ok || loading}
                onClick={() => setOpenKey(expanded ? null : item.key)}
                className="flex w-full items-center justify-between gap-2 text-left text-sm disabled:cursor-default"
              >
                <span className={ok ? "text-fg-muted" : "font-medium text-fg"}>
                  <span aria-hidden="true" className={ok ? "text-success" : "text-warning"}>
                    {ok ? "✓ " : "! "}
                  </span>
                  {item.label}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
                    ok ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
                  }`}
                >
                  {loading && !["no_attendance", "trip_docs", "trips_not_approved"].includes(item.key)
                    ? "…"
                    : item.count}
                </span>
              </button>
              {expanded && (
                <div className="mt-2 space-y-1">
                  <ul className="max-h-56 space-y-1 overflow-y-auto text-xs">
                    {item.entries.map((entry, index) => (
                      <li
                        key={`${entry.name}-${entry.date}-${index}`}
                        className="flex flex-wrap gap-x-2 border-t border-border pt-1 text-fg-muted"
                      >
                        <span className="font-medium text-fg">{entry.name || "—"}</span>
                        <span className="tabular-nums">{entry.date}</span>
                        {entry.detail && <span className="text-fg-subtle">{entry.detail}</span>}
                        {entry.responsible && (
                          <span className="text-fg-muted">
                            · Waiting on <b className="font-semibold text-fg">{entry.responsible}</b>
                          </span>
                        )}
                        {entry.missing?.length > 0 && (
                          <span className="text-warning">· Missing: {entry.missing.join(", ")}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                  {item.count > item.entries.length && (
                    <p className="text-xs text-fg-subtle">
                      Showing {item.entries.length} of {item.count}.
                    </p>
                  )}
                  {item.fix && (
                    <Link to={item.fix} className="inline-block text-xs font-semibold text-primary hover:underline">
                      Go fix these &rarr;
                    </Link>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
