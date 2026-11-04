import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { AlarmClock } from "lucide-react";
import { decideMissedTimeIn, getMissedTimeInForMe } from "../../api/attendance/requests";
import { promptDialog } from "../ui/dialog/dialogService";

// Approvals -> Attendance: scheduled employees who haven't timed in
// (tpc_hris_backend/app/services/attendance_alerts.py). Today: Late (Delay
// once they time in) / 2nd half (Halfday) / Absent. An earlier day of the
// cutoff: "Does this employee work on this day?" -- Yes asks them for a
// time correction, No marks it Absent. Renders nothing when empty.
const WAITING_TEXT = {
  waiting_time_in: (item) =>
    `Waiting for their time in -- it becomes ${item.decision === "late" ? "Delay" : "Halfday"}.`,
  waiting_employee: () => "Waiting for their time correction.",
};

export default function MissedTimeInPanel({ canEdit = true }) {
  const [items, setItems] = useState([]);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      setItems(await getMissedTimeInForMe());
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to load missed time in.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const decide = async (item, decision) => {
    let reason;
    if (decision === "absent") {
      reason = await promptDialog(
        `Mark ${item.employee_name} Absent on ${item.date_label}? Reason (required):`,
      );
      if (reason === null) return;
      if (!reason.trim()) {
        toast.error("Give the reason for marking Absent.");
        return;
      }
    }
    try {
      setBusyId(item.id);
      const result = await decideMissedTimeIn(item.id, decision, reason?.trim());
      toast.success(result?.message || "Saved.");
      await load();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Something went wrong.");
    } finally {
      setBusyId(null);
    }
  };

  if (!items.length) return null;

  const button = (item, decision, label, tone) => (
    <button
      key={decision}
      type="button"
      disabled={busyId === item.id}
      onClick={() => decide(item, decision)}
      className={`rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${tone}`}
    >
      {label}
    </button>
  );
  const neutral = "border border-border bg-surface text-fg hover:bg-surface-hover";

  return (
    <div className="space-y-3 rounded-2xl border border-warning/40 bg-warning/5 p-4">
      <div className="flex items-center gap-2">
        <AlarmClock size={18} className="text-warning" />
        <h2 className="font-semibold text-fg">No time in</h2>
        <span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning">
          {items.filter((item) => item.needs_answer).length}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {items.map((item) => (
          <div key={item.id} className="space-y-2 rounded-xl border border-border bg-surface p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-fg">{item.employee_name}</p>
                <p className="text-xs text-fg-muted">
                  {[item.position, item.department].filter(Boolean).join(" · ")}
                </p>
              </div>
              <span className="rounded-full bg-surface-active px-2 py-0.5 text-[11px] font-semibold text-fg-muted">
                {item.stage === "today" ? "Today" : item.date_label}
                {item.scheduled_in ? ` · sched ${item.scheduled_in}` : ""}
              </span>
            </div>

            {item.needs_answer ? (
              <p className="text-sm text-fg">
                {item.stage === "today"
                  ? "Hasn't timed in yet. Is this late, absent, or working the 2nd half?"
                  : "This employee has missing attendance for this cut off. Does this employee work on this day?"}
              </p>
            ) : (
              <p className="text-sm text-fg-muted">
                {item.decision_label && (
                  <span className="font-semibold text-fg">{item.decision_label}</span>
                )}
                {item.decided_by ? ` by ${item.decided_by}` : ""}
                {item.decision_label ? " -- " : ""}
                {WAITING_TEXT[item.status]?.(item)}
              </p>
            )}
            {!item.can_act && item.needs_answer && item.head_name && (
              <p className="text-xs text-fg-subtle">For {item.head_name}</p>
            )}

            {canEdit && item.can_act && (
              <div className="flex flex-wrap gap-2">
                {item.stage === "today" ? (
                  <>
                    {button(item, "late", "Late", neutral)}
                    {button(item, "second_half", "2nd half", neutral)}
                    {button(item, "absent", "Absent", "bg-danger text-danger-foreground")}
                  </>
                ) : (
                  <>
                    {button(item, "works", "Yes, they worked", "bg-success text-success-foreground")}
                    {button(item, "absent", "No -- Absent", "bg-danger text-danger-foreground")}
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
