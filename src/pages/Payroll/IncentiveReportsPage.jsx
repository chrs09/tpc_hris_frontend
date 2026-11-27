import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, Check, Clock, Pencil, RefreshCw, RotateCcw, X } from "lucide-react";
import SectionTabs from "../../components/ui/sectionTabs/SectionTabs";
import StatusPill from "../../components/ui/statusPill/StatusPill";
import { TABLE_HEAD, TABLE_ROW, TABLE_WRAP } from "../../components/ui/table/tableStyles";
import { confirmDialog, promptDialog } from "../../components/ui/dialog/dialogService";
import {
  approvePendingRows,
  confirmIncentiveReport,
  decideReportLine,
  generateReportNow,
  getIncentiveReport,
  getIncentiveReports,
  regenerateIncentiveReport,
  releaseIncentiveReport,
  returnIncentiveReport,
} from "../../api/payroll/incentiveReports";

// Payroll -> Incentive Reports. Each program with a release date gets a
// report at 4 AM on that date (retried every 30 min). Rows are approved,
// rejected or edited (with a reason) by people with Incentive Reports;
// then Final confirm (trip coordinator) passes it to Finance, who
// releases it.

const errorText = (error, fallback) => error?.response?.data?.detail || fallback;
const peso = (n) =>
  `₱${Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDay = (d) =>
  d
    ? new Date(`${d}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "-";
const ordinal = (n) => `${n}${["th", "st", "nd", "rd"][(n % 100 >= 11 && n % 100 <= 13) || n % 10 > 3 ? 0 : n % 10]}`;

const STATUS = {
  FOR_REVIEW: { label: "For review", tone: "warning" },
  CONFIRMED: { label: "With Finance", tone: "primary" },
  RELEASED: { label: "Released", tone: "success" },
};
const LINE_STATUS = {
  pending: { label: "Pending", tone: "neutral" },
  approved: { label: "Approved", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
};
const TYPE_LABEL = {
  daily_cash: "Daily Cash Incentive",
  trip_tiers: "Trip Target (Tiered)",
  long_distance: "Long Distance",
  complete_attendance: "Complete Attendance",
};

const btn =
  "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition disabled:opacity-50";
const btnPrimary = `${btn} bg-primary text-primary-foreground hover:bg-primary-hover`;
const btnOutline = `${btn} border border-border text-fg hover:bg-surface-hover`;

export default function IncentiveReportsPage() {
  const [params, setParams] = useSearchParams();
  const openId = params.get("report");
  return (
    <div className="space-y-5">
      <SectionTabs group="Payroll" />
      {openId ? (
        <ReportDetail
          id={Number(openId)}
          onBack={() => setParams({})}
          onOpen={(id) => setParams({ report: String(id) })}
        />
      ) : (
        <ReportList onOpen={(id) => setParams({ report: String(id) })} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------- list

function ReportList({ onOpen }) {
  const [data, setData] = useState(null);
  const [making, setMaking] = useState(null);

  const load = useCallback(async () => {
    try {
      setData(await getIncentiveReports());
    } catch (error) {
      toast.error(errorText(error, "Couldn't load the reports."));
      setData({ reports: [], waiting: [], upcoming: [], can: {} });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const makeNow = async (program) => {
    try {
      setMaking(program.id);
      const res = await generateReportNow(program.id);
      toast.success(res.message);
      onOpen(res.id);
    } catch (error) {
      toast.error(errorText(error, "Couldn't make the report."));
    } finally {
      setMaking(null);
    }
  };

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold text-fg">Incentive Reports</h1>
        <p className="mt-1 max-w-3xl text-sm text-fg-subtle">
          Made automatically at 4:00 AM on each program&apos;s release date (if it fails, tried again every 30 minutes until
          it works). Approve each row, then the trip coordinator confirms and Finance releases.
        </p>
      </div>

      {data?.waiting?.length > 0 && (
        <div className="rounded-2xl border border-warning/30 bg-warning/10 p-4">
          <p className="text-sm font-semibold text-fg">Release date reached, no report yet</p>
          <p className="text-xs text-fg-muted">The next automatic check will make these. You can make one now.</p>
          <div className="mt-3 flex flex-col gap-2">
            {data.waiting.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{p.name}</p>
                  <p className="text-xs text-fg-subtle">
                    {TYPE_LABEL[p.rule_type] || p.rule_type} · release {fmtDay(p.release_date)}
                  </p>
                </div>
                {data.can?.approve && (
                  <button type="button" className={btnOutline} disabled={making === p.id} onClick={() => makeNow(p)}>
                    <RefreshCw size={14} /> {making === p.id ? "Making..." : "Make report now"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!data ? (
        <p className="rounded-2xl border border-border bg-surface p-6 text-sm text-fg-subtle">Loading...</p>
      ) : data.reports.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center text-sm text-fg-subtle">
          No reports yet. A program with a release date gets its report at 4 AM on that date.
        </p>
      ) : (
        <div className={TABLE_WRAP}>
          <table className="w-full text-sm">
            <thead className={TABLE_HEAD}>
              <tr>
                <th className="px-4 py-3 text-left">Program</th>
                <th className="px-4 py-3 text-left">Trips / period</th>
                <th className="px-4 py-3 text-left">Release date</th>
                <th className="px-4 py-3 text-left">Rows</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.reports.map((r) => (
                <tr key={r.id} className={`${TABLE_ROW} cursor-pointer`} onClick={() => onOpen(r.id)}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-fg">{r.program_name}</p>
                    <p className="text-xs text-fg-subtle">
                      {TYPE_LABEL[r.rule_type] || r.rule_type}
                      {r.memo_no ? ` · Memo ${r.memo_no}` : ""}
                    </p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-fg-muted">
                    {r.period_start === r.period_end
                      ? fmtDay(r.period_start)
                      : `${fmtDay(r.period_start)} – ${fmtDay(r.period_end)}`}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-fg-muted">{fmtDay(r.release_date)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-fg-muted">
                    {r.rows} · {r.counts.approved} approved
                    {r.counts.rejected ? ` · ${r.counts.rejected} rejected` : ""}
                    {r.counts.pending ? ` · ${r.counts.pending} pending` : ""}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums">{peso(r.total)}</td>
                  <td className="px-4 py-3">
                    <StatusPill tone={STATUS[r.status]?.tone}>{STATUS[r.status]?.label || r.status}</StatusPill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data?.upcoming?.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-fg">
            <Clock size={14} /> Coming up
          </p>
          <ul className="mt-2 space-y-1 text-sm text-fg-muted">
            {data.upcoming.map((p) => (
              <li key={p.id}>
                <span className="text-fg">{p.name}</span> · report on {fmtDay(p.release_date)}, 4:00 AM
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------- detail

function ReportDetail({ id, onBack, onOpen }) {
  const [report, setReport] = useState(null);
  const [busy, setBusy] = useState(false);
  const [releaseForm, setReleaseForm] = useState(null); // { method, reference }
  const [editing, setEditing] = useState(null); // { lineId, mode: "reject"|"edit", amount, reason }

  const load = useCallback(async () => {
    try {
      setReport(await getIncentiveReport(id));
    } catch (error) {
      toast.error(errorText(error, "Couldn't load the report."));
      onBack();
    }
  }, [id, onBack]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (fn, okText) => {
    try {
      setBusy(true);
      const res = await fn();
      if (okText !== false) toast.success(okText || res?.message || "Saved.");
      await load();
      return res;
    } catch (error) {
      toast.error(errorText(error, "Couldn't save."));
      return null;
    } finally {
      setBusy(false);
    }
  };

  const decide = (line, action, extra) =>
    run(() => decideReportLine(line.id, action, extra), false).then(() => setEditing(null));

  const isDaily = report?.rule_type === "daily_cash";
  const maxTrips = useMemo(
    () =>
      isDaily
        ? Math.max(3, ...(report?.lines || []).map((l) => (l.details?.trip_lines || []).length))
        : 0,
    [isDaily, report],
  );
  const days = useMemo(() => {
    if (!report) return [];
    const byDay = new Map();
    report.lines.forEach((l) => {
      const key = l.day || "";
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key).push(l);
    });
    return [...byDay.entries()];
  }, [report]);

  if (!report) {
    return <p className="rounded-2xl border border-border bg-surface p-6 text-sm text-fg-subtle">Loading...</p>;
  }

  const can = report.can || {};
  const inReview = report.status === "FOR_REVIEW";
  const canDecide = inReview && can.approve;
  const pending = report.counts.pending;
  const allPending = report.lines.length > 0 && pending === report.lines.length;
  const multiDay = days.length > 1;

  const doConfirm = async () => {
    if (!(await confirmDialog(`Confirm this report (${peso(report.total)}) and pass it to Finance?`))) return;
    run(() => confirmIncentiveReport(report.id));
  };
  const doReturn = async () => {
    const note = await promptDialog("What needs fixing? It goes back for review.");
    if (!note || !note.trim()) return;
    run(() => returnIncentiveReport(report.id, note.trim()));
  };
  const doRelease = async () => {
    const res = await run(() =>
      releaseIncentiveReport(report.id, releaseForm.method, releaseForm.reference.trim()),
    );
    if (res) setReleaseForm(null);
  };
  const doRegenerate = async () => {
    if (!(await confirmDialog("Make this report again from the trips as they are now?"))) return;
    const res = await run(() => regenerateIncentiveReport(report.id));
    if (res?.id && res.id !== report.id) onOpen(res.id);
  };

  const rowActions = (line) => {
    if (!canDecide) return null;
    if (editing?.lineId === line.id) {
      return (
        <div className="flex min-w-[15rem] flex-col gap-1.5">
          {editing.mode === "edit" && (
            <input
              id={`amount-${line.id}`}
              type="number"
              min="0"
              value={editing.amount}
              onChange={(e) => setEditing({ ...editing, amount: e.target.value })}
              className="h-8 w-full rounded-lg border border-border bg-surface px-2 text-sm text-fg focus:border-primary focus:outline-none"
              aria-label="Amount to pay"
            />
          )}
          <input
            id={`reason-${line.id}`}
            autoFocus
            value={editing.reason}
            onChange={(e) => setEditing({ ...editing, reason: e.target.value })}
            placeholder={editing.mode === "reject" ? "Why is it rejected?" : "Why change the amount?"}
            className="h-8 w-full rounded-lg border border-border bg-surface px-2 text-xs text-fg focus:border-primary focus:outline-none"
            aria-label="Reason"
          />
          <div className="flex gap-1.5">
            <button
              type="button"
              disabled={busy || !editing.reason.trim()}
              onClick={() =>
                decide(line, editing.mode, {
                  reason: editing.reason.trim(),
                  amount: editing.mode === "edit" ? Number(editing.amount || 0) : undefined,
                })
              }
              className="rounded-lg bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground disabled:opacity-50"
            >
              {editing.mode === "reject" ? "Reject" : "Save amount"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-lg border border-border px-2.5 py-1 text-xs text-fg-muted"
            >
              Cancel
            </button>
          </div>
        </div>
      );
    }
    if (line.status !== "pending") {
      return (
        <button
          type="button"
          disabled={busy}
          onClick={() => decide(line, "undo")}
          title="Undo the decision"
          className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs text-fg-muted hover:bg-surface-hover"
        >
          <RotateCcw size={12} /> Undo
        </button>
      );
    }
    return (
      <div className="flex flex-wrap gap-1">
        <button
          type="button"
          disabled={busy}
          onClick={() => decide(line, "approve")}
          title="Approve"
          aria-label={`Approve ${line.employee_name}`}
          className="rounded-lg bg-success/15 p-1.5 text-success hover:bg-success/25"
        >
          <Check size={14} />
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setEditing({ lineId: line.id, mode: "edit", amount: line.computed_amount, reason: "" })}
          title="Edit amount"
          aria-label={`Edit amount for ${line.employee_name}`}
          className="rounded-lg bg-primary/10 p-1.5 text-primary hover:bg-primary/20"
        >
          <Pencil size={14} />
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setEditing({ lineId: line.id, mode: "reject", amount: 0, reason: "" })}
          title="Reject"
          aria-label={`Reject ${line.employee_name}`}
          className="rounded-lg bg-danger/10 p-1.5 text-danger hover:bg-danger/20"
        >
          <X size={14} />
        </button>
      </div>
    );
  };

  const amountCell = (line) => (
    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums">
      {line.status === "rejected" ? (
        <span className="text-danger line-through decoration-1">{peso(line.computed_amount)}</span>
      ) : (
        peso(line.amount)
      )}
      {line.edited && (
        <span className="block text-[11px] font-normal text-fg-subtle line-through">{peso(line.computed_amount)}</span>
      )}
    </td>
  );

  const statusCell = (line) => (
    <td className="px-4 py-3">
      <StatusPill tone={LINE_STATUS[line.status]?.tone}>
        {line.edited ? "Edited" : LINE_STATUS[line.status]?.label}
      </StatusPill>
      {line.reason && <p className="mt-1 max-w-[14rem] text-[11px] text-fg-muted">{line.reason}</p>}
      {line.decided_by && <p className="text-[10px] text-fg-subtle">{line.decided_by}</p>}
    </td>
  );

  const summaryText = (line) => {
    const d = line.details || {};
    switch (report.rule_type) {
      case "trip_tiers":
        return `${d.trips ?? 0} trips${d.tier ? ` · ${d.tier}` : ""}`;
      case "long_distance":
        return `${d.trips ?? 0} long-distance trip(s)`;
      case "complete_attendance":
        return `${(d.days_present ?? 0) - (d.rest_days_worked || 0)}/${d.workdays ?? 0} days${
          d.rest_days_worked ? ` · +${d.rest_days_worked} rest day` : ""
        }`;
      default:
        return d.trips != null ? `${d.trips} trips` : "";
    }
  };

  return (
    <>
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
        <ArrowLeft size={14} /> Incentive Reports
      </button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-fg">{report.program_name}</h1>
            <StatusPill tone={STATUS[report.status]?.tone}>{STATUS[report.status]?.label}</StatusPill>
          </div>
          <p className="mt-1 text-sm text-fg-subtle">
            {TYPE_LABEL[report.rule_type] || report.rule_type}
            {report.memo_no ? ` · Memo ${report.memo_no}` : ""} · trips{" "}
            {report.period_start === report.period_end
              ? fmtDay(report.period_start)
              : `${fmtDay(report.period_start)} – ${fmtDay(report.period_end)}`}{" "}
            · released {fmtDay(report.release_date)}
          </p>
          <p className="text-xs text-fg-subtle">
            Made {report.generated_at} by {report.generated_by}
            {report.confirmed_by ? ` · Confirmed by ${report.confirmed_by}, ${report.confirmed_at}` : ""}
            {report.released_by
              ? ` · Released by ${report.released_by}, ${report.released_at} (${report.release_method}${
                  report.release_reference ? ` · ${report.release_reference}` : ""
                })`
              : ""}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-fg-subtle">Total to pay</p>
          <p className="text-2xl font-bold tabular-nums text-fg">{peso(report.total)}</p>
          <p className="text-xs text-fg-subtle">
            {report.counts.approved} approved · {report.counts.rejected} rejected · {pending} pending
          </p>
        </div>
      </div>

      {report.return_note && inReview && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm">
          <b>Returned:</b> {report.return_note}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {canDecide && pending > 0 && (
          <button type="button" className={btnOutline} disabled={busy} onClick={() => run(() => approvePendingRows(report.id))}>
            <Check size={14} /> Approve all pending ({pending})
          </button>
        )}
        {canDecide && allPending && (
          <button type="button" className={btnOutline} disabled={busy} onClick={doRegenerate}>
            <RefreshCw size={14} /> Make again
          </button>
        )}
        {inReview && can.confirm && (
          <button
            type="button"
            className={btnPrimary}
            disabled={busy || pending > 0}
            title={pending > 0 ? "Approve or reject every row first" : undefined}
            onClick={doConfirm}
          >
            Final confirm → Finance
          </button>
        )}
        {report.status === "CONFIRMED" && can.release && (
          <button
            type="button"
            className={btnPrimary}
            disabled={busy}
            onClick={() => setReleaseForm({ method: "cash", reference: "" })}
          >
            Release
          </button>
        )}
        {report.status === "CONFIRMED" && (can.release || can.confirm) && (
          <button type="button" className={btnOutline} disabled={busy} onClick={doReturn}>
            <RotateCcw size={14} /> Return for review
          </button>
        )}
      </div>

      {releaseForm && (
        <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4">
          <div>
            <p className="mb-1 text-xs font-medium text-fg-muted">Release {peso(report.total)} by</p>
            <div className="flex gap-1 rounded-lg bg-surface p-1">
              {["cash", "bank"].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setReleaseForm({ ...releaseForm, method: m })}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize ${
                    releaseForm.method === m ? "bg-primary text-primary-foreground" : "text-fg-muted"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <label htmlFor="release-reference" className="flex min-w-[12rem] flex-1 flex-col gap-1 text-xs font-medium text-fg-muted">
            Reference (optional)
            <input
              id="release-reference"
              value={releaseForm.reference}
              onChange={(e) => setReleaseForm({ ...releaseForm, reference: e.target.value })}
              placeholder={releaseForm.method === "cash" ? "e.g. voucher no." : "e.g. bank transfer ref"}
              className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-fg focus:border-primary focus:outline-none"
            />
          </label>
          <div className="flex gap-2">
            <button type="button" className={btnPrimary} disabled={busy} onClick={doRelease}>
              Mark released
            </button>
            <button type="button" className={btnOutline} disabled={busy} onClick={() => setReleaseForm(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {report.lines.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center text-sm text-fg-subtle">
          Nobody earned this incentive in the period.
        </p>
      ) : (
        <div className={TABLE_WRAP}>
          <table className="w-full text-sm">
            <thead className={TABLE_HEAD}>
              <tr>
                <th className="px-4 py-3 text-left">Employee</th>
                {isDaily ? (
                  Array.from({ length: maxTrips }, (_, i) => (
                    <th key={i} className="px-4 py-3 text-left">
                      {ordinal(i + 1)} Trip
                    </th>
                  ))
                ) : (
                  <th className="px-4 py-3 text-left">Details</th>
                )}
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-left">Status</th>
                {canDecide && <th className="px-4 py-3 text-left">Action</th>}
              </tr>
            </thead>
            <tbody>
              {days.map(([day, lines]) => (
                <DayRows key={day || "all"} day={day} show={multiDay}
                  cols={(isDaily ? maxTrips : 1) + 3 + (canDecide ? 1 : 0)}>
                  {lines.map((line) => (
                    <tr key={line.id} className={`${TABLE_ROW} align-top ${line.status === "rejected" ? "opacity-70" : ""}`}>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-fg">{line.employee_name}</p>
                        <p className="text-xs text-fg-subtle">{[line.department, line.group].filter(Boolean).join(" · ")}</p>
                      </td>
                      {isDaily ? (
                        Array.from({ length: maxTrips }, (_, i) => {
                          const t = (line.details?.trip_lines || [])[i];
                          return (
                            <td key={i} className="whitespace-nowrap px-4 py-3">
                              {t ? (
                                <>
                                  <span className="block text-xs text-fg-subtle">{t.ticket_no || "-"}</span>
                                  <span className={`font-semibold tabular-nums ${t.amount ? "text-fg" : "text-fg-subtle"}`}>
                                    {peso(t.amount)}
                                  </span>
                                  {t.started_at && <span className="ml-1 text-[10px] text-fg-subtle">{t.started_at}</span>}
                                </>
                              ) : (
                                <span className="text-fg-subtle">—</span>
                              )}
                            </td>
                          );
                        })
                      ) : (
                        <td className="px-4 py-3 text-fg-muted">{summaryText(line)}</td>
                      )}
                      {amountCell(line)}
                      {statusCell(line)}
                      {canDecide && <td className="px-4 py-3">{rowActions(line)}</td>}
                    </tr>
                  ))}
                </DayRows>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border bg-surface-hover/60 font-semibold">
                <td className="px-4 py-3" colSpan={(isDaily ? maxTrips : 1) + 1}>
                  Total ({report.lines.length} row{report.lines.length === 1 ? "" : "s"})
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{peso(report.total)}</td>
                <td colSpan={canDecide ? 2 : 1} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {report.log?.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-sm font-semibold text-fg">History</p>
          <ul className="mt-2 space-y-1 text-xs text-fg-muted">
            {report.log.map((e, i) => (
              <li key={i}>
                <span className="text-fg">{e.at}</span> · {e.by || "-"} · {e.action}
                {e.note ? ` · ${e.note}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

// Daily Cash over several days: a date row above each day's people.
function DayRows({ day, show, cols, children }) {
  return (
    <>
      {show && day && (
        <tr className="border-t border-border bg-surface-hover/40">
          <td colSpan={cols} className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-fg-subtle">
            {fmtDay(day)}
          </td>
        </tr>
      )}
      {children}
    </>
  );
}
