import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { CalendarClock, Plus, X } from "lucide-react";
import { cancelJobChange, getJobHistory, recordJobChange } from "../../api/employee";
import { employeeRoles } from "../../constants/employeeRole";
import { confirmDialog } from "../ui/dialog/dialogService";

// 201 -> Work History: the employee's department, position, pay type and
// rates over time. "Record a change" takes an effective date and a reason;
// today or earlier updates the 201 now, a future date is Scheduled and
// applied on that day. Payroll pays each day at what was in effect then
// (backend: app/services/job_history.py).

const DEPARTMENTS = Object.values(employeeRoles).filter((d) => d !== "All");
const EMPLOYMENT_TYPES = ["Regular", "Probationary", "Contractual", "Project Based"];
const PAYROLL_TYPES = ["Daily", "Weekly", "Monthly"];

const errorOf = (error) => error.response?.data?.detail || "Something went wrong.";
const peso = (v) =>
  v === null || v === undefined || v === ""
    ? "--"
    : `₱${Number(v).toLocaleString("en-PH", { maximumFractionDigits: 2 })}`;
const longDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const inputClass =
  "mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30";

// What differs from the previous entry, for the timeline.
const FIELD_LABELS = {
  department: "Department",
  position: "Position",
  employment_type: "Employment type",
  payroll_type: "Payroll type",
  daily_rate: "Daily rate",
  monthly_basic: "Monthly basic",
  monthly_allow: "Monthly allowance",
  schedule_template_name: "Work schedule",
};
const MONEY = ["daily_rate", "monthly_basic", "monthly_allow"];
const RATE_FIELDS = MONEY;

function ChangeForm({ current, scheduleTemplates, showRates, onCancel, onSave, saving }) {
  const [form, setForm] = useState({
    effective_date: new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" }),
    reason: "",
    department: current.department || "",
    position: current.position || "",
    employment_type: current.employment_type || "",
    payroll_type: current.payroll_type || "",
    daily_rate: current.daily_rate ?? "",
    monthly_basic: current.monthly_basic ?? "",
    monthly_allow: current.monthly_allow ?? "",
    schedule_template_id: current.schedule_template_id ?? "",
  });
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const isMonthly = form.payroll_type === "Monthly";

  const submit = () => {
    if (!form.effective_date) return toast.error("Pick the effective date.");
    if (!form.reason.trim()) return toast.error("Give the reason for the change.");
    const payload = {
      effective_date: form.effective_date,
      reason: form.reason.trim(),
      department: form.department,
      position: form.position.trim(),
      employment_type: form.employment_type,
      payroll_type: form.payroll_type,
      schedule_template_id: form.schedule_template_id ? Number(form.schedule_template_id) : null,
    };
    if (showRates) {
      for (const field of RATE_FIELDS) {
        if (form[field] !== "") payload[field] = Number(form[field]);
      }
    }
    onSave(payload);
  };

  return (
    <div className="space-y-3 rounded-xl border border-primary/40 bg-primary/5 p-4">
      <p className="text-sm font-semibold text-fg">Record a change</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-sm text-fg-muted">
          Effective date
          <input id="job-effective" type="date" value={form.effective_date} onChange={set("effective_date")} className={inputClass} />
        </label>
        <label className="text-sm text-fg-muted">
          Department
          <select id="job-department" value={form.department} onChange={set("department")} className={inputClass}>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </label>
        <label className="text-sm text-fg-muted">
          Position
          <input id="job-position" value={form.position} onChange={set("position")} className={inputClass} />
        </label>
        <label className="text-sm text-fg-muted">
          Employment type
          <select id="job-employment" value={form.employment_type} onChange={set("employment_type")} className={inputClass}>
            <option value="">--</option>
            {EMPLOYMENT_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="text-sm text-fg-muted">
          Payroll type
          <select id="job-payroll" value={form.payroll_type} onChange={set("payroll_type")} className={inputClass}>
            <option value="">--</option>
            {PAYROLL_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="text-sm text-fg-muted">
          Work schedule
          <select id="job-schedule" value={form.schedule_template_id} onChange={set("schedule_template_id")} className={inputClass}>
            <option value="">--</option>
            {scheduleTemplates.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </label>
        {showRates && !isMonthly && (
          <label className="text-sm text-fg-muted">
            Daily rate (₱)
            <input id="job-daily" type="number" min="0" value={form.daily_rate} onChange={set("daily_rate")} className={inputClass} />
          </label>
        )}
        {showRates && isMonthly && (
          <>
            <label className="text-sm text-fg-muted">
              Monthly basic (₱)
              <input id="job-mbasic" type="number" min="0" value={form.monthly_basic} onChange={set("monthly_basic")} className={inputClass} />
            </label>
            <label className="text-sm text-fg-muted">
              Monthly allowance (₱)
              <input id="job-mallow" type="number" min="0" value={form.monthly_allow} onChange={set("monthly_allow")} className={inputClass} />
            </label>
          </>
        )}
      </div>
      <label className="block text-sm text-fg-muted">
        Reason
        <input
          id="job-reason"
          value={form.reason}
          onChange={set("reason")}
          placeholder="e.g. Promoted to coordinator at the Plant"
          className={inputClass}
        />
      </label>
      <p className="text-xs text-fg-subtle">
        Today or an earlier date updates the 201 now. A later date is scheduled and
        applied on that day. Payroll pays each day at what was in effect then, and a
        department move inside a cutoff is split between the two payrolls.
        {form.department && /driver|helper/i.test(form.department)
          ? " Driver and helper departments are paid by trip."
          : ""}
      </p>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg border border-border px-4 py-2 text-sm text-fg-muted hover:bg-surface-hover">
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={saving}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save change"}
        </button>
      </div>
    </div>
  );
}

export default function WorkHistory({ employee, canEdit, scheduleTemplates = [], onChanged }) {
  const [data, setData] = useState(null);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const showRates = localStorage.getItem("role") === "superadmin";

  useEffect(() => {
    getJobHistory(employee.id)
      .then(setData)
      .catch((error) => toast.error(errorOf(error)));
  }, [employee.id]);

  if (!data) return <p className="p-6 text-sm text-fg-subtle">Loading work history...</p>;

  const save = async (payload) => {
    try {
      setSaving(true);
      const next = await recordJobChange(employee.id, payload);
      setData(next);
      setAdding(false);
      toast.success(
        payload.effective_date > next.today
          ? `Scheduled for ${longDate(payload.effective_date)}.`
          : "Change saved -- the 201 is updated.",
      );
      onChanged?.();
    } catch (error) {
      toast.error(errorOf(error));
    } finally {
      setSaving(false);
    }
  };

  const cancel = async (change) => {
    if (!(await confirmDialog(`Cancel the change from ${longDate(change.effective_date)}?`))) return;
    try {
      setData(await cancelJobChange(employee.id, change.id));
      toast.success("Change cancelled.");
      onChanged?.();
    } catch (error) {
      toast.error(errorOf(error));
    }
  };

  // Oldest first to compare each entry with the one before it.
  const active = data.changes.filter((c) => c.status !== "CANCELLED");
  const chronological = [...active].reverse();
  const diffOf = (change) => {
    const i = chronological.findIndex((c) => c.id === change.id);
    const prev = i > 0 ? chronological[i - 1] : null;
    return Object.entries(FIELD_LABELS)
      .filter(([field]) => showRates || !MONEY.includes(field))
      .filter(([field]) => !prev || String(prev[field] ?? "") !== String(change[field] ?? ""))
      .map(([field, label]) => ({
        label,
        from: prev ? (MONEY.includes(field) ? peso(prev[field]) : prev[field] || "--") : null,
        to: MONEY.includes(field) ? peso(change[field]) : change[field] || "--",
      }));
  };

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-fg">Work History</h3>
          <p className="text-sm text-fg-muted">
            Department, position and pay over time, with who changed it and why.
          </p>
        </div>
        {canEdit && !adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
          >
            <Plus size={16} /> Record a change
          </button>
        )}
      </div>

      {adding && (
        <ChangeForm
          current={data.current}
          scheduleTemplates={scheduleTemplates}
          showRates={showRates}
          saving={saving}
          onCancel={() => setAdding(false)}
          onSave={save}
        />
      )}

      <ol className="relative space-y-4 border-l-2 border-border pl-5">
        {data.changes.map((change) => {
          const cancelled = change.status === "CANCELLED";
          const scheduled = change.status === "SCHEDULED";
          const diff = cancelled ? [] : diffOf(change);
          return (
            <li key={change.id} className={`relative ${cancelled ? "opacity-50" : ""}`}>
              <span
                className={`absolute -left-[27px] mt-1.5 h-3 w-3 rounded-full ${
                  scheduled ? "bg-warning" : cancelled ? "bg-fg-subtle" : "bg-primary"
                }`}
              />
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-fg">{longDate(change.effective_date)}</span>
                {change.kind === "HIRED" && (
                  <span className="rounded-full bg-surface-active px-2 py-0.5 text-[11px] font-semibold text-fg-muted">Start</span>
                )}
                {scheduled && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-semibold text-warning">
                    <CalendarClock size={12} /> Scheduled
                  </span>
                )}
                {cancelled && (
                  <span className="rounded-full bg-surface-active px-2 py-0.5 text-[11px] font-semibold text-fg-muted">Cancelled</span>
                )}
                {canEdit && change.kind !== "HIRED" && !cancelled && (
                  <button
                    type="button"
                    onClick={() => cancel(change)}
                    className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-danger hover:bg-danger/10"
                  >
                    <X size={12} /> Cancel
                  </button>
                )}
              </div>
              <p className="mt-0.5 text-sm text-fg">
                {change.position || "--"} · {change.department || "--"}
              </p>
              {diff.length > 0 && change.kind !== "HIRED" && (
                <ul className="mt-1 space-y-0.5 text-xs text-fg-muted">
                  {diff.map((d) => (
                    <li key={d.label}>
                      {d.label}: <span className="line-through">{d.from}</span> → <span className="font-semibold text-fg">{d.to}</span>
                    </li>
                  ))}
                </ul>
              )}
              {change.kind === "HIRED" && (
                <p className="mt-1 text-xs text-fg-muted">
                  {[change.employment_type, change.payroll_type, change.schedule_template_name]
                    .filter(Boolean)
                    .join(" · ")}
                  {showRates && (change.payroll_type === "Monthly"
                    ? ` · ${peso(change.monthly_basic)}/month`
                    : ` · ${peso(change.daily_rate)}/day`)}
                </p>
              )}
              {change.reason && <p className="mt-1 text-xs italic text-fg-subtle">“{change.reason}”</p>}
              {change.created_by && change.kind !== "HIRED" && (
                <p className="text-[11px] text-fg-subtle">by {change.created_by}</p>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
