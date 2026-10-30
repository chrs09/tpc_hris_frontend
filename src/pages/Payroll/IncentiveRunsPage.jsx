import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { ArrowLeft, Plus, RefreshCw, Trash2, X } from "lucide-react";
import SectionTabs from "../../components/ui/sectionTabs/SectionTabs";
import SearchInput from "../../components/ui/searchInput/SearchInput";
import Pagination from "../../components/ui/pagination/Pagination";
import DateRangeFilter from "../../components/ui/datePicker/DateRangeFilter";
import { confirmDialog, promptDialog } from "../../components/ui/dialog/dialogService";
import usePagination from "../../hooks/usePagination";
import { matchesSearch } from "../../utils/search";
import { toISODate } from "../../utils/isoDate";
import { getIncentivePrograms, getIncentiveRuleTypes } from "../../api/payroll/incentivePrograms";
import {
  addIncentiveAdjustment,
  createIncentiveRun,
  deleteIncentiveAdjustment,
  generateIncentiveRun,
  getIncentiveHistory,
  getIncentiveRun,
  getIncentiveRuns,
  transitionIncentiveRun,
  updateIncentiveRun,
} from "../../api/payroll/incentiveRuns";

// Incentive Runs: incentives paid out apart from payroll. A run computes
// Incentive Policies programs for a period with their rules frozen, goes
// Generated -> For Review -> Approved -> Released (Org Chart payroll
// steps), and its lines are the permanent history. "With payroll" runs
// show on that payroll after Net Pay -- never in gross.

const peso = (n) =>
  `₱${Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (d) =>
  d ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) : "—";
const fmtStamp = (d) => (d ? new Date(d).toLocaleString("en-PH") : "");

const STATUS_STYLES = {
  DRAFT: "bg-surface-active text-fg-muted",
  GENERATED: "bg-surface-active text-fg",
  FOR_REVIEW: "bg-warning/15 text-warning",
  APPROVED: "bg-primary/15 text-primary",
  RELEASED: "bg-primary text-primary-foreground",
  CANCELLED: "bg-danger/15 text-danger",
};
const METHOD_LABELS = { cash: "Cash", payroll: "With payroll", bank: "Bank transfer" };

const StatusBadge = ({ status }) => (
  <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLES[status] || ""}`}>
    {status.replace("_", " ")}
  </span>
);

const inputClass =
  "mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30";
const btn = "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50";
const btnPrimary = `${btn} bg-primary text-primary-foreground hover:bg-primary-hover`;
const btnOutline = `${btn} border border-border text-fg hover:bg-surface-hover`;

const errorText = (err, fallback) => err.response?.data?.detail || fallback;

// One line's breakdown in a few words.
const detailSummary = (line) => {
  const d = line.details || {};
  if (line.is_adjustment) return line.note || "Adjustment";
  switch (line.rule_type) {
    case "trip_tiers":
      return `${d.trips ?? 0} trips · ${d.tier || "no tier"}`;
    case "daily_cash":
      return `${d.trips ?? 0} trips over ${(d.days || []).length} day(s)`;
    case "long_distance":
      return `${d.trips ?? 0} long-distance trip(s)`;
    case "complete_attendance":
      return `${d.days_present ?? 0}/${d.workdays ?? 0} days${d.leave_days ? ` · ${d.leave_days} leave` : ""}`;
    default:
      return "";
  }
};

// ---------------------------------------------------------------- form

function RunForm({ run, onClose, onSaved }) {
  const [programs, setPrograms] = useState([]);
  const [ruleTypes, setRuleTypes] = useState({});
  const [form, setForm] = useState(() => {
    if (run) {
      return {
        name: run.name,
        period_start: String(run.period_start).slice(0, 10),
        period_end: String(run.period_end).slice(0, 10),
        program_ids: run.program_ids,
        release_method: run.release_method,
        payroll_date: run.payroll_date ? String(run.payroll_date).slice(0, 10) : "",
        notes: run.notes || "",
      };
    }
    const now = new Date();
    return {
      name: "",
      period_start: toISODate(new Date(now.getFullYear(), now.getMonth(), 1)),
      period_end: toISODate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
      program_ids: [],
      release_method: "cash",
      payroll_date: "",
      notes: "",
    };
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getIncentivePrograms()
      .then(setPrograms)
      .catch(() => toast.error("Failed to load incentive programs."));
    getIncentiveRuleTypes()
      .then((types) => setRuleTypes(Object.fromEntries(types.map((t) => [t.value, t]))))
      .catch(() => {});
  }, []);

  // Programs running in the picked period first.
  const sorted = useMemo(() => {
    const overlaps = (p) =>
      String(p.period_start) <= form.period_end && String(p.period_end) >= form.period_start;
    return [...programs].sort((a, b) => Number(overlaps(b)) - Number(overlaps(a)));
  }, [programs, form.period_start, form.period_end]);

  const toggleProgram = (program) => {
    const picked = form.program_ids.includes(program.id);
    const ids = picked
      ? form.program_ids.filter((id) => id !== program.id)
      : [...form.program_ids, program.id];
    const next = { ...form, program_ids: ids };
    // First pick sets the usual release method for its type.
    if (!picked && form.program_ids.length === 0 && !run) {
      next.release_method = ruleTypes[program.rule_type]?.default_release_method || form.release_method;
      if (!form.name) next.name = program.name;
    }
    setForm(next);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...form, payroll_date: form.payroll_date || null };
      const saved = run ? await updateIncentiveRun(run.id, payload) : await createIncentiveRun(payload);
      toast.success(run ? "Run updated." : "Run created — click Generate to compute it.");
      onSaved(saved);
    } catch (err) {
      toast.error(errorText(err, "Failed to save run."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[92vh] w-full max-w-xl flex-col rounded-t-2xl border border-border bg-surface text-fg sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="text-lg font-bold">{run ? "Edit Run" : "New Incentive Run"}</h3>
          <button onClick={onClose} className="text-fg-muted hover:text-fg">
            <X size={20} />
          </button>
        </div>
        <div className="space-y-4 overflow-y-auto p-5">
          <label className="block text-xs font-medium text-fg-muted">
            Name
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. October 2026 Long Distance"
              className={inputClass}
            />
          </label>

          <div>
            <p className="mb-1 text-xs font-medium text-fg-muted">Period (trips / attendance counted)</p>
            <DateRangeFilter
              from={form.period_start}
              to={form.period_end}
              onChange={({ from, to }) => setForm({ ...form, period_start: from, period_end: to })}
            />
          </div>

          <div>
            <p className="mb-1 text-xs font-medium text-fg-muted">Programs</p>
            {sorted.length === 0 ? (
              <p className="text-sm text-fg-subtle">No incentive programs yet.</p>
            ) : (
              <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
                {sorted.map((p) => {
                  const inPeriod =
                    String(p.period_start) <= form.period_end && String(p.period_end) >= form.period_start;
                  return (
                    <label
                      key={p.id}
                      className={`flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 hover:bg-surface-hover ${inPeriod ? "" : "opacity-50"}`}
                    >
                      <input
                        type="checkbox"
                        checked={form.program_ids.includes(p.id)}
                        onChange={() => toggleProgram(p)}
                        className="mt-0.5 h-4 w-4 rounded border-border"
                      />
                      <span className="text-sm">
                        <span className="font-medium">{p.name}</span>
                        <span className="block text-xs text-fg-subtle">
                          {p.rule_label} · {fmtDate(p.period_start)} – {fmtDate(p.period_end)}
                          {p.memo_no ? ` · Memo ${p.memo_no}` : ""}
                          {inPeriod ? "" : " · not in this period"}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-xs font-medium text-fg-muted">
              Released by
              <select
                value={form.release_method}
                onChange={(e) => setForm({ ...form, release_method: e.target.value })}
                className={inputClass}
              >
                {Object.entries(METHOD_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            {form.release_method === "payroll" && (
              <label className="block text-xs font-medium text-fg-muted">
                Pay with the payroll covering
                <input
                  type="date"
                  value={form.payroll_date}
                  onChange={(e) => setForm({ ...form, payroll_date: e.target.value })}
                  className={inputClass}
                />
              </label>
            )}
          </div>
          {form.release_method === "payroll" && (
            <p className="-mt-2 text-xs text-fg-subtle">
              Shows on each person&apos;s payroll for the cutoff that includes this date, after Net
              Pay — not added to gross.
            </p>
          )}

          <label className="block text-xs font-medium text-fg-muted">
            Notes
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className={inputClass}
            />
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <button onClick={onClose} className={btnOutline}>
            Cancel
          </button>
          <button onClick={save} disabled={saving} className={btnPrimary}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- detail

function RunDetail({ runId, onBack, onChanged }) {
  const [run, setRun] = useState(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [search, setSearch] = useState("");
  const [adjustment, setAdjustment] = useState({ employeeId: "", amount: "", note: "" });

  useEffect(() => {
    let cancelled = false;
    getIncentiveRun(runId)
      .then((data) => !cancelled && setRun(data))
      .catch(() => !cancelled && toast.error("Failed to load the run."));
    return () => {
      cancelled = true;
    };
  }, [runId]);

  const act = async (fn, success) => {
    setBusy(true);
    try {
      const updated = await fn();
      setRun(updated);
      onChanged();
      if (success) toast.success(success);
    } catch (err) {
      toast.error(errorText(err, "Something went wrong."));
    } finally {
      setBusy(false);
    }
  };

  const transition = async (action, success, { askNote, noteLabel } = {}) => {
    let note;
    if (askNote) {
      note = await promptDialog(noteLabel);
      if (note === null) return;
    }
    act(() => transitionIncentiveRun(runId, { action, note }), success);
  };

  const release = async () => {
    const reference = await promptDialog(
      `Release ${peso(run.total)} to ${run.employee_count} people. Reference no. (optional — voucher, bank ref, payroll):`,
    );
    if (reference === null) return;
    act(() => transitionIncentiveRun(runId, { action: "release", reference }), "Run released.");
  };

  // Employees with their lines, biggest total first.
  const people = useMemo(() => {
    if (!run?.lines) return [];
    const map = new Map();
    run.lines.forEach((line) => {
      const p = map.get(line.employee_id) || {
        employee_id: line.employee_id,
        name: line.employee_name,
        department: line.department,
        group: line.group,
        total: 0,
        lines: [],
      };
      p.total += line.amount;
      p.lines.push(line);
      map.set(line.employee_id, p);
    });
    return [...map.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
  }, [run]);
  const shown = people.filter((p) => matchesSearch(search, p.name, p.department, p.group));
  const pagination = usePagination(shown, 25);

  if (!run) return <p className="text-sm text-fg-subtle">Loading...</p>;

  const programTotals = run.lines.reduce((acc, line) => {
    acc[line.program_name] = (acc[line.program_name] || 0) + line.amount;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft size={16} /> All runs
      </button>

      <div className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-fg">{run.name}</h3>
              <StatusBadge status={run.status} />
            </div>
            <p className="mt-1 text-sm text-fg-subtle">
              {fmtDate(run.period_start)} – {fmtDate(run.period_end)} · {METHOD_LABELS[run.release_method]}
              {run.release_method === "payroll" && run.payroll_date ? ` (payroll covering ${fmtDate(run.payroll_date)})` : ""}
            </p>
            <p className="mt-1 text-xs text-fg-subtle">{run.programs.map((p) => p.name).join(" · ")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {run.can_edit && (
              <button onClick={() => setEditing(true)} disabled={busy} className={btnOutline}>
                Edit
              </button>
            )}
            {run.can_generate && (
              <button
                onClick={() => act(() => generateIncentiveRun(runId), run.status === "DRAFT" ? "Run generated." : "Run regenerated.")}
                disabled={busy}
                className={run.status === "DRAFT" ? btnPrimary : btnOutline}
              >
                <RefreshCw size={14} /> {run.status === "DRAFT" ? "Generate" : "Regenerate"}
              </button>
            )}
            {run.can_submit && (
              <button onClick={() => transition("submit", "Submitted for review.")} disabled={busy} className={btnPrimary}>
                Submit for Review
              </button>
            )}
            {run.can_approve && (
              <button onClick={() => transition("approve", "Run approved.")} disabled={busy} className={btnPrimary}>
                Approve
              </button>
            )}
            {run.can_return && (
              <button
                onClick={() => transition("return", "Returned for correction.", { askNote: true, noteLabel: "Why is it being returned?" })}
                disabled={busy}
                className={btnOutline}
              >
                Return
              </button>
            )}
            {run.can_release && (
              <button onClick={release} disabled={busy} className={btnPrimary}>
                Release
              </button>
            )}
            {run.can_cancel && (
              <button
                onClick={() => transition("cancel", "Run cancelled.", { askNote: true, noteLabel: "Why is this run being cancelled?" })}
                disabled={busy}
                className={`${btn} text-danger hover:bg-danger/10`}
              >
                Cancel Run
              </button>
            )}
          </div>
        </div>

        {run.status === "GENERATED" && run.lines.length === 0 && (
          <p className="mt-3 rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning">
            Nobody earned anything for this period, so there&apos;s nothing to submit. Only fully completed
            (Finance-approved) trips count. Use Preview on Incentive Policies to see each person&apos;s basis, then
            Regenerate once trips are completed — or Cancel this run.
          </p>
        )}

        {run.return_note && run.status === "GENERATED" && (
          <p className="mt-3 rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning">Returned: {run.return_note}</p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-border bg-surface-hover p-3">
            <p className="text-xs text-fg-subtle">Total</p>
            <p className="text-lg font-bold text-fg">{peso(run.total)}</p>
          </div>
          <div className="rounded-xl border border-border bg-surface-hover p-3">
            <p className="text-xs text-fg-subtle">People</p>
            <p className="text-lg font-bold text-fg">{run.employee_count}</p>
          </div>
          <div className="col-span-2 rounded-xl border border-border bg-surface-hover p-3">
            <p className="text-xs text-fg-subtle">By program</p>
            {Object.keys(programTotals).length === 0 ? (
              <p className="text-sm text-fg-subtle">{run.status === "DRAFT" ? "Not generated yet." : "Nobody earned anything."}</p>
            ) : (
              Object.entries(programTotals).map(([name, total]) => (
                <p key={name} className="flex justify-between gap-2 text-sm">
                  <span className="truncate text-fg-muted">{name}</span>
                  <span className="font-semibold text-fg">{peso(total)}</span>
                </p>
              ))
            )}
          </div>
        </div>

        <p className="mt-3 text-xs text-fg-subtle">
          {run.generated && `Generated ${fmtStamp(run.generated.at)}${run.generated.by ? ` by ${run.generated.by}` : ""}. `}
          {run.approved && `Approved ${fmtStamp(run.approved.at)}${run.approved.by ? ` by ${run.approved.by}` : ""}. `}
          {run.released &&
            `Released ${fmtDate(run.released_on)}${run.released.by ? ` by ${run.released.by}` : ""}${run.release_reference ? ` · Ref ${run.release_reference}` : ""}.`}
          {run.status !== "DRAFT" && run.status !== "GENERATED" && " Rules are frozen — later program changes don't affect this run."}
        </p>
      </div>

      {run.status === "GENERATED" && run.can_edit && people.length > 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-surface p-4">
          <p className="text-sm font-semibold text-fg">Add an adjustment</p>
          <p className="text-xs text-fg-subtle">A + / − amount with a reason (e.g. a correction to an earlier released run). Kept when you regenerate.</p>
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <select
              value={adjustment.employeeId}
              onChange={(e) => setAdjustment({ ...adjustment, employeeId: e.target.value })}
              className="w-56 rounded-lg border border-border bg-background p-2 text-sm text-fg"
            >
              <option value="">Employee...</option>
              {[...people].sort((a, b) => a.name.localeCompare(b.name)).map((p) => (
                <option key={p.employee_id} value={p.employee_id}>
                  {p.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={adjustment.amount}
              onChange={(e) => setAdjustment({ ...adjustment, amount: e.target.value })}
              placeholder="Amount (−50)"
              className="w-32 rounded-lg border border-border bg-background p-2 text-sm text-fg"
            />
            <input
              value={adjustment.note}
              onChange={(e) => setAdjustment({ ...adjustment, note: e.target.value })}
              placeholder="Reason"
              className="w-64 rounded-lg border border-border bg-background p-2 text-sm text-fg"
            />
            <button
              disabled={busy || !adjustment.employeeId || !Number(adjustment.amount) || !adjustment.note.trim()}
              onClick={async () => {
                await act(
                  () =>
                    addIncentiveAdjustment(runId, {
                      employeeId: Number(adjustment.employeeId),
                      amount: Number(adjustment.amount),
                      note: adjustment.note,
                    }),
                  "Adjustment added.",
                );
                setAdjustment({ employeeId: "", amount: "", note: "" });
              }}
              className={btnPrimary}
            >
              <Plus size={14} /> Add
            </button>
          </div>
        </div>
      )}

      {people.length > 0 && (
        <div className="space-y-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Search employee, department..." />
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-hover text-xs text-fg-subtle">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Program</th>
                  <th className="px-4 py-3">Basis</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {pagination.paginatedItems.map((p) =>
                  p.lines.map((line, i) => (
                    <tr key={line.id} className={i === 0 ? "border-t border-border" : ""}>
                      {i === 0 && (
                        <td className="px-4 py-2 align-top" rowSpan={p.lines.length}>
                          <p className="font-medium text-fg">{p.name}</p>
                          <p className="text-xs text-fg-subtle">
                            {[p.department, p.group].filter(Boolean).join(" · ")}
                          </p>
                          {p.lines.length > 1 && <p className="text-xs font-semibold text-fg">{peso(p.total)}</p>}
                        </td>
                      )}
                      <td className="px-4 py-2 text-fg-muted">{line.program_name}</td>
                      <td className="px-4 py-2 text-xs text-fg-subtle">{detailSummary(line)}</td>
                      <td className="whitespace-nowrap px-4 py-2 text-right font-semibold text-fg">
                        {peso(line.amount)}
                        {line.is_adjustment && run.status === "GENERATED" && run.can_edit && (
                          <button
                            onClick={async () => {
                              if (!(await confirmDialog(`Remove this ${peso(line.amount)} adjustment?`))) return;
                              act(() => deleteIncentiveAdjustment(runId, line.id), "Adjustment removed.");
                            }}
                            className="ml-2 align-middle text-fg-muted hover:text-danger"
                            title="Remove adjustment"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={pagination.page} totalPages={pagination.totalPages} onChange={pagination.setPage} />
        </div>
      )}

      {run.log?.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="mb-2 text-sm font-semibold text-fg">Activity</p>
          <ul className="space-y-1 text-xs text-fg-muted">
            {[...run.log].reverse().map((entry, i) => (
              <li key={i}>
                <span className="font-medium capitalize text-fg">{entry.action}</span> · {fmtStamp(entry.at)}
                {entry.by ? ` · ${entry.by}` : ""}
                {entry.note ? ` — ${entry.note}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      {editing && (
        <RunForm
          run={run}
          onClose={() => setEditing(false)}
          onSaved={(saved) => {
            setEditing(false);
            setRun(saved);
            onChanged();
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------- history

function IncentiveHistory() {
  const [range, setRange] = useState(() => {
    const now = new Date();
    return {
      from: toISODate(new Date(now.getFullYear(), now.getMonth() - 2, 1)),
      to: toISODate(now),
    };
  });
  const [status, setStatus] = useState("paid");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    getIncentiveHistory({ dateFrom: range.from, dateTo: range.to, status })
      .then((data) => !cancelled && setRows(data))
      .catch(() => !cancelled && toast.error("Failed to load incentive history."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [range, status]);

  const shown = rows.filter((r) =>
    matchesSearch(search, r.employee_name, r.department, r.program_name, r.run_name, r.release_reference),
  );
  const perEmployee = useMemo(() => {
    const map = new Map();
    shown.forEach((r) => {
      const e = map.get(r.employee_id) || { name: r.employee_name, released: 0, approved: 0 };
      if (r.status === "RELEASED") e.released += r.amount;
      else e.approved += r.amount;
      map.set(r.employee_id, e);
    });
    return [...map.values()].sort((a, b) => b.released + b.approved - (a.released + a.approved));
  }, [shown]);
  const released = shown.filter((r) => r.status === "RELEASED").reduce((s, r) => s + r.amount, 0);
  const toRelease = shown.filter((r) => r.status === "APPROVED").reduce((s, r) => s + r.amount, 0);
  const linesPage = usePagination(shown, 25);
  const peoplePage = usePagination(perEmployee, 10);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <DateRangeFilter from={range.from} to={range.to} onChange={setRange} />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-fg"
        >
          <option value="paid">Approved + released</option>
          <option value="released">Released only</option>
          <option value="approved">Approved, not released yet</option>
        </select>
        <SearchInput value={search} onChange={setSearch} placeholder="Search employee, program, run..." />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:max-w-lg">
        <div className="rounded-xl border border-border bg-surface p-3">
          <p className="text-xs text-fg-subtle">Released</p>
          <p className="text-lg font-bold text-primary">{peso(released)}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-3">
          <p className="text-xs text-fg-subtle">Approved, to be released</p>
          <p className="text-lg font-bold text-warning">{peso(toRelease)}</p>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-fg-subtle">Loading...</p>
      ) : shown.length === 0 ? (
        <p className="text-sm text-fg-subtle">No incentives in this range.</p>
      ) : (
        <>
          <div className="rounded-2xl border border-border bg-surface p-4">
            <p className="mb-2 text-sm font-semibold text-fg">Per employee</p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-fg-subtle">
                  <tr>
                    <th className="py-2 pr-4">Employee</th>
                    <th className="py-2 pr-4 text-right">Released</th>
                    <th className="py-2 pr-4 text-right">To be released</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {peoplePage.paginatedItems.map((e) => (
                    <tr key={e.name} className="border-t border-border">
                      <td className="py-2 pr-4 font-medium text-fg">{e.name}</td>
                      <td className="py-2 pr-4 text-right">{peso(e.released)}</td>
                      <td className="py-2 pr-4 text-right text-warning">{e.approved ? peso(e.approved) : "—"}</td>
                      <td className="py-2 text-right font-semibold">{peso(e.released + e.approved)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={peoplePage.page} totalPages={peoplePage.totalPages} onChange={peoplePage.setPage} />
          </div>

          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-hover text-xs text-fg-subtle">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Program</th>
                  <th className="px-4 py-3">Run / Period</th>
                  <th className="px-4 py-3">Released</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {linesPage.paginatedItems.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-4 py-2">
                      <p className="font-medium text-fg">{r.employee_name}</p>
                      <p className="text-xs text-fg-subtle">{r.department || ""}</p>
                    </td>
                    <td className="px-4 py-2 text-fg-muted">
                      {r.program_name}
                      {r.is_adjustment && r.note && <p className="text-xs text-fg-subtle">{r.note}</p>}
                    </td>
                    <td className="px-4 py-2 text-xs text-fg-subtle">
                      <p className="text-fg">{r.run_name}</p>
                      {fmtDate(r.period_start)} – {fmtDate(r.period_end)}
                    </td>
                    <td className="px-4 py-2 text-xs">
                      {r.status === "RELEASED" ? (
                        <>
                          <p>{fmtDate(r.released_on)} · {METHOD_LABELS[r.release_method]}</p>
                          {r.release_reference && <p className="text-fg-subtle">Ref {r.release_reference}</p>}
                        </>
                      ) : (
                        <StatusBadge status={r.status} />
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-right font-semibold text-fg">{peso(r.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={linesPage.page} totalPages={linesPage.totalPages} onChange={linesPage.setPage} />
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- page

export default function IncentiveRunsPage() {
  const [tab, setTab] = useState("runs");
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [openRunId, setOpenRunId] = useState(null);
  const [creating, setCreating] = useState(false);

  const loadRuns = useCallback(
    () =>
      getIncentiveRuns(statusFilter ? { status: statusFilter } : {})
        .then(setRuns)
        .catch(() => toast.error("Failed to load incentive runs."))
        .finally(() => setLoading(false)),
    [statusFilter],
  );

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  const pagination = usePagination(runs, 15);

  return (
    <div className="space-y-5">
      <SectionTabs group="Payroll" />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-fg">Incentive Runs</h2>
          <p className="mt-1 text-sm text-fg-subtle">
            Incentives are paid out here, apart from payroll. Each run freezes its programs&apos; rules,
            goes through approval, and its released lines are the incentive history.
          </p>
        </div>
        {tab === "runs" && !openRunId && (
          <button onClick={() => setCreating(true)} className={btnPrimary}>
            <Plus size={16} /> New Run
          </button>
        )}
      </div>

      <div className="flex gap-2 border-b border-border">
        {[
          ["runs", "Runs"],
          ["history", "Incentive History"],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => {
              setTab(key);
              setOpenRunId(null);
            }}
            className={`px-4 py-2 text-sm font-medium ${
              tab === key ? "border-b-2 border-primary text-primary" : "text-fg-subtle hover:text-fg"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "history" && <IncentiveHistory />}

      {tab === "runs" && openRunId && (
        <RunDetail runId={openRunId} onBack={() => setOpenRunId(null)} onChanged={loadRuns} />
      )}

      {tab === "runs" && !openRunId && (
        <div className="space-y-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-fg"
          >
            <option value="">All statuses</option>
            {Object.keys(STATUS_STYLES).map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>

          {loading ? (
            <p className="text-sm text-fg-subtle">Loading...</p>
          ) : runs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-fg-subtle">
              No incentive runs yet — click New Run to compute a program for a period.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-2xl border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-hover text-xs text-fg-subtle">
                    <tr>
                      <th className="px-4 py-3">Run</th>
                      <th className="px-4 py-3">Period</th>
                      <th className="px-4 py-3">Released by</th>
                      <th className="px-4 py-3">People</th>
                      <th className="px-4 py-3 text-right">Total</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagination.paginatedItems.map((run) => (
                      <tr
                        key={run.id}
                        onClick={() => setOpenRunId(run.id)}
                        className="cursor-pointer border-t border-border hover:bg-surface-hover"
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-fg">{run.name}</p>
                          <p className="text-xs text-fg-subtle">{run.programs.map((p) => p.name).join(" · ")}</p>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs">
                          {fmtDate(run.period_start)} – {fmtDate(run.period_end)}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {METHOD_LABELS[run.release_method]}
                          {run.release_method === "payroll" && run.payroll_date && (
                            <p className="text-fg-subtle">covering {fmtDate(run.payroll_date)}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">{run.employee_count}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-semibold">{peso(run.total)}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={run.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={pagination.page} totalPages={pagination.totalPages} onChange={pagination.setPage} />
            </>
          )}
        </div>
      )}

      {creating && (
        <RunForm
          onClose={() => setCreating(false)}
          onSaved={(saved) => {
            setCreating(false);
            loadRuns();
            setOpenRunId(saved.id);
          }}
        />
      )}
    </div>
  );
}
