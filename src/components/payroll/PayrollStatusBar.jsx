import { useState } from "react";
import { Check, Lock } from "lucide-react";
import { transitionPayrollRun } from "../../api/payroll/payrollRuns";
import { alertDialog, confirmDialog, promptDialog } from "../ui/dialog/dialogService";
import { PAYROLL_STEPS } from "../../utils/payroll/payrollStatus";

// Generating is repeatable until Approved; Locked freezes the period's
// attendance, OT, leave and trips (backend: payroll_runs.py).

const formatStamp = (stamp) =>
  stamp
    ? `${new Date(`${stamp.at}Z`).toLocaleString("en-PH", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })}${stamp.by ? ` · ${stamp.by}` : ""}`
    : null;

const peso = (n) =>
  `₱${Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const ACTIONS = [
  {
    action: "submit",
    flag: "can_submit",
    label: "Submit for Review",
    className: "bg-primary text-primary-foreground hover:bg-primary-hover",
    confirm: "Submit this payroll for review? Generating again sends it back to Generated.",
  },
  {
    action: "approve",
    flag: "can_approve",
    label: "Approve",
    className: "bg-success text-white hover:opacity-90",
    confirm: "Approve this payroll? It can no longer be generated again unless returned for correction.",
  },
  {
    action: "return",
    flag: "can_return",
    label: "Return for Correction",
    className: "border border-warning text-warning hover:bg-warning/10",
    prompt: "What needs to be corrected?",
  },
  {
    action: "lock",
    flag: "can_lock",
    label: "Lock",
    className: "bg-fg text-background hover:opacity-90",
    confirm:
      "Lock this payroll? Attendance, overtime, leave and trips in this cutoff can no longer be changed.",
  },
  {
    action: "mark_paid",
    flag: "can_mark_paid",
    label: "Mark as Paid",
    className: "bg-success text-white hover:opacity-90",
    confirm: "Mark this payroll as paid?",
  },
  {
    action: "unlock",
    flag: "can_unlock",
    label: "Unlock",
    className: "border border-danger text-danger hover:bg-danger/10",
    prompt: "Why unlock this payroll?",
  },
];

// Who acts next at each status (Org Chart -> Payroll sub-items).
const WAITING_FOR = {
  DRAFT: "Prepare & Submit",
  GENERATED: "Prepare & Submit",
  FOR_REVIEW: "Approve & Return",
  APPROVED: "Lock & Mark as Paid",
  LOCKED: "Lock & Mark as Paid",
};

export default function PayrollStatusBar({ run, department, cutoffPeriod, onChange }) {
  const [busy, setBusy] = useState(null);
  if (!run) return null;

  const currentIndex = PAYROLL_STEPS.findIndex((step) => step.key === run.status);
  const isFrozen = ["APPROVED", "LOCKED", "PAID"].includes(run.status);

  const act = async ({ action, confirm, prompt }) => {
    let note;
    if (prompt) {
      note = await promptDialog(prompt, "");
      if (note === null || note === undefined) return;
      if (!String(note).trim()) {
        alertDialog("Please give a reason.");
        return;
      }
    } else if (confirm && !(await confirmDialog(confirm))) {
      return;
    }
    setBusy(action);
    try {
      const updated = await transitionPayrollRun({
        department,
        cutoff_period: cutoffPeriod,
        action,
        note,
      });
      onChange(updated);
    } catch (err) {
      alertDialog(err?.response?.data?.detail || "Could not update the payroll status.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-fg">Payroll status</p>
          {isFrozen && (
            <span className="inline-flex items-center gap-1 rounded-full bg-fg/10 px-2 py-0.5 text-xs font-medium text-fg-muted">
              <Lock size={12} />
              {run.status === "APPROVED" ? "Figures frozen" : "Period locked"}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {ACTIONS.filter((a) => run[a.flag]).map((a) => (
            <button
              key={a.action}
              type="button"
              disabled={Boolean(busy)}
              onClick={() => act(a)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-60 ${a.className}`}
            >
              {busy === a.action ? "Saving..." : a.label}
            </button>
          ))}
        </div>
      </div>

      <ol className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {PAYROLL_STEPS.map((step, index) => {
          const done = index < currentIndex;
          const current = index === currentIndex;
          const stamp = step.stamp ? formatStamp(run[step.stamp]) : null;
          return (
            <li
              key={step.key}
              className={`rounded-lg border px-2 py-2 text-xs ${
                current
                  ? "border-primary bg-primary/10"
                  : done
                    ? "border-border bg-surface-hover"
                    : "border-dashed border-border"
              }`}
            >
              <p
                className={`flex items-center gap-1 font-semibold ${
                  current ? "text-primary" : done ? "text-fg" : "text-fg-subtle"
                }`}
              >
                {done && <Check size={12} />}
                {step.label}
              </p>
              {(done || current) && stamp && (
                <p className="mt-0.5 text-[10px] text-fg-subtle">{stamp}</p>
              )}
            </li>
          );
        })}
      </ol>

      {run.status !== "DRAFT" && (
        <p className="text-xs text-fg-muted">
          Last generated: {run.employee_count} employee(s) · Gross {peso(run.total_gross)} · Net{" "}
          {peso(run.total_net)}
        </p>
      )}
      {run.return_note && run.status === "GENERATED" && (
        <p className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-fg">
          <span className="font-semibold text-warning">Returned for correction:</span>{" "}
          {run.return_note}
        </p>
      )}
      {!ACTIONS.some((a) => run[a.flag]) && WAITING_FOR[run.status] && (
        <p className="text-xs text-fg-subtle">
          Waiting for someone with <strong>Payroll &rarr; {WAITING_FOR[run.status]}</strong>{" "}
          on the Org Chart.
        </p>
      )}
      {run.status === "DRAFT" && (
        <p className="text-xs text-fg-subtle">
          Not generated yet. Generate Payroll saves every employee&apos;s figures; you can
          generate again after corrections until it&apos;s approved.
        </p>
      )}
    </div>
  );
}
