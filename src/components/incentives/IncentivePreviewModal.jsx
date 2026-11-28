import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { CheckCircle2, ListChecks, X, XCircle } from "lucide-react";
import { previewIncentiveProgram } from "../../api/payroll/incentiveReports";

// Incentive Reports -> before Generate / Regenerate: the rows the report
// will have (program settings as they are now) and every trip in the
// period, counted or not with the reason. Nothing is saved until the
// confirm button.

const peso = (n) =>
  `₱${Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDay = (d) =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "-";
const ordinal = (n) => `${n}${["th", "st", "nd", "rd"][(n % 100 >= 11 && n % 100 <= 13) || n % 10 > 3 ? 0 : n % 10]}`;

export default function IncentivePreviewModal({ programId, title, confirmLabel, onConfirm, onClose }) {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("rows");
  const [tripFilter, setTripFilter] = useState("all");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    previewIncentiveProgram(programId)
      .then((res) => alive && setData(res))
      .catch((error) => {
        toast.error(error?.response?.data?.detail || "Couldn't load the preview.");
        onClose();
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId]);

  const trips = useMemo(() => data?.trips || [], [data]);
  const counted = trips.filter((t) => t.counted).length;
  const shownTrips = trips.filter(
    (t) => tripFilter === "all" || (tripFilter === "counted" ? t.counted : !t.counted),
  );
  const isDaily = data?.rule_type === "daily_cash";
  const maxTrips = isDaily
    ? Math.max(1, ...(data?.lines || []).map((l) => (l.details?.trip_lines || []).length))
    : 0;

  const confirm = async () => {
    try {
      setBusy(true);
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}
    >
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col rounded-t-2xl border border-border bg-surface text-fg shadow-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ListChecks size={16} />
            </span>
            <div>
              <h3 className="text-base font-semibold">{title}</h3>
              <p className="text-xs text-fg-subtle">
                {data
                  ? `${data.program_name} · trips ${
                      data.period_start === data.period_end
                        ? fmtDay(data.period_start)
                        : `${fmtDay(data.period_start)} – ${fmtDay(data.period_end)}`
                    } · using the program's current rules`
                  : "Checking trips..."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="rounded-lg p-1.5 text-fg-muted hover:bg-surface-hover hover:text-fg disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {!data ? (
          <p className="p-6 text-sm text-fg-subtle">Checking trips...</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3 text-sm">
              <div className="flex gap-1 rounded-lg bg-surface-hover p-1">
                {[
                  ["rows", `Report rows (${data.lines.length})`],
                  ...(data.rule_type === "complete_attendance" ? [] : [["trips", `Trips in period (${trips.length})`]]),
                ].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTab(key)}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                      tab === key ? "bg-primary text-primary-foreground" : "text-fg-muted hover:text-fg"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <span className="text-xs text-fg-muted">
                {data.rule_type !== "complete_attendance" && `${counted} of ${trips.length} trips count · `}
                Total <b className="text-fg">{peso(data.total)}</b>
              </span>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {tab === "rows" ? (
                data.lines.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-fg-subtle">
                    Nobody earns this incentive with the trips as they are now.
                    {trips.length > 0 && " Check Trips in period to see why."}
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-border">
                    <table className="w-full text-sm">
                      <thead className="bg-surface-hover text-[11px] uppercase tracking-wide text-fg-subtle">
                        <tr>
                          <th className="px-3 py-2 text-left">Employee</th>
                          {isDaily && <th className="px-3 py-2 text-left">Day</th>}
                          {isDaily &&
                            Array.from({ length: maxTrips }, (_, i) => (
                              <th key={i} className="px-3 py-2 text-left">
                                {ordinal(i + 1)} trip
                              </th>
                            ))}
                          <th className="px-3 py-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.lines.map((l, idx) => (
                          <tr key={`${l.employee_id}-${l.day}-${idx}`} className="border-t border-border">
                            <td className="px-3 py-2">
                              <p className="font-semibold">{l.employee_name}</p>
                              <p className="text-xs text-fg-subtle">{l.department || "-"}</p>
                            </td>
                            {isDaily && <td className="whitespace-nowrap px-3 py-2 text-fg-muted">{fmtDay(l.day)}</td>}
                            {isDaily &&
                              Array.from({ length: maxTrips }, (_, i) => {
                                const t = (l.details?.trip_lines || [])[i];
                                return (
                                  <td key={i} className="whitespace-nowrap px-3 py-2">
                                    {t ? (
                                      <>
                                        <span className="block text-xs text-fg-subtle">{t.ticket_no || "-"}</span>
                                        <span className="font-semibold tabular-nums">{peso(t.amount)}</span>
                                      </>
                                    ) : (
                                      <span className="text-fg-subtle">—</span>
                                    )}
                                  </td>
                                );
                              })}
                            <td className="whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums">
                              {peso(l.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              ) : (
                <div className="space-y-3">
                  <div className="flex gap-1">
                    {[
                      ["all", "All"],
                      ["counted", `Counted (${counted})`],
                      ["not", `Not counted (${trips.length - counted})`],
                    ].map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setTripFilter(key)}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                          tripFilter === key ? "border-primary bg-primary/10 text-primary" : "border-border text-fg-muted"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {shownTrips.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-fg-subtle">
                      No trips here.
                    </p>
                  ) : (
                    <ul className="divide-y divide-border rounded-xl border border-border">
                      {shownTrips.map((t) => (
                        <li key={t.id} className="flex items-start gap-3 px-3 py-2.5 text-sm">
                          {t.counted ? (
                            <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-success" />
                          ) : (
                            <XCircle size={16} className="mt-0.5 shrink-0 text-danger" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold">
                              {t.ticket_no || t.trip_code}
                              <span className="ml-2 text-xs font-normal text-fg-subtle">
                                {t.trip_code} · {t.driver || "-"} · {fmtDay(t.date)} {t.time}
                                {t.category ? ` · ${t.category}` : ""}
                              </span>
                            </p>
                            <p className={`text-xs ${t.counted ? "text-success" : "text-danger"}`}>
                              {t.counted ? "Counts toward the incentive" : t.reason}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-5 py-3">
          <span className="mr-auto text-[11px] text-fg-subtle">Nothing is saved until you confirm.</span>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-fg-muted hover:bg-surface-hover disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={busy || !data}
            className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
          >
            {busy ? "Saving..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
