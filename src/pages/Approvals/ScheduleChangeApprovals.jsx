import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  approveScheduleChange,
  getScheduleChangesForMe,
  rejectScheduleChange,
} from "../../api/scheduleChanges";
import ApprovalProgress from "../../components/approvals/ApprovalProgress";
import ApprovedBy from "../../components/approvals/ApprovedBy";
import { promptDialog } from "../../components/ui/dialog/dialogService";

// Stored schedule time ("HH:MM:SS", 8 h behind PH -- see
// utils/payroll/attendance/scheduleOverrides.js) -> "8:00 AM".
const regularLabel = (raw) => {
  if (!raw) return null;
  const [h, m] = raw.split(":").map(Number);
  const total = (h * 60 + m + 8 * 60) % 1440;
  const hour = Math.floor(total / 60);
  const suffix = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${String(total % 60).padStart(2, "0")} ${suffix}`;
};

// Approvals -> Schedule Change: a different time in / out for one date,
// waiting on me (Org Chart heads with "Schedule Change" ticked; superadmin
// sees every pending one).
export default function ScheduleChangeApprovals() {
  const [items, setItems] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(() => {
    getScheduleChangesForMe()
      .then(setItems)
      .catch((error) => {
        toast.error(error.response?.data?.detail || "Could not load schedule changes.");
        setItems([]);
      });
  }, []);

  useEffect(() => {
    getScheduleChangesForMe()
      .then(setItems)
      .catch(() => setItems([]));
  }, []);

  const decide = async (item, approve) => {
    const remarks = await promptDialog(
      approve
        ? `Approve ${item.employee_name}'s ${item.time_in_label} – ${item.time_out_label} on ${item.date_label}? Remarks (optional):`
        : `Reason for rejecting ${item.employee_name}'s schedule change:`,
    );
    if (remarks === null) return;
    try {
      setBusyId(item.id);
      const res = approve
        ? await approveScheduleChange(item.id, remarks)
        : await rejectScheduleChange(item.id, remarks);
      toast.success(res.message);
      load();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Something went wrong.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-fg">Schedule Changes</h1>
        <p className="mt-1 text-sm text-fg-subtle">
          A different time in / out for one day. Once approved, that day&apos;s late,
          undertime, overtime and pay follow the new time; the regular schedule doesn&apos;t
          change.
        </p>
      </div>
      {items === null ? (
        <p className="text-sm text-fg-subtle">Loading...</p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-fg-subtle">
          No schedule changes waiting for you.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {items.map((item) => {
            const regularIn = regularLabel(item.regular_in_raw);
            const regularOut = regularLabel(item.regular_out_raw);
            return (
              <div key={item.id} className="space-y-2 rounded-2xl border border-border bg-surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-fg">{item.employee_name}</p>
                    {item.position && <p className="text-xs text-fg-muted">{item.position}</p>}
                  </div>
                  <span className="rounded-full bg-surface-active px-2 py-0.5 text-[11px] font-semibold text-fg-muted">
                    {item.date_label}
                  </span>
                </div>
                <p className="text-sm text-fg">
                  New: <strong>{item.time_in_label} – {item.time_out_label}</strong>
                </p>
                <p className="text-xs text-fg-muted">
                  Regular: {regularIn && regularOut ? `${regularIn} – ${regularOut}` : "no schedule that day"}
                </p>
                <p className="text-xs text-fg-muted">Reason: “{item.reason}”</p>
                <ApprovalProgress steps={item.approval_steps} />
                <ApprovedBy log={item.approval_log} />
                {item.can_act && (
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => decide(item, false)}
                      className="flex-1 rounded-lg border border-danger/40 py-2 text-sm font-semibold text-danger hover:bg-danger/10 disabled:opacity-50"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => decide(item, true)}
                      className="flex-1 rounded-lg bg-success py-2 text-sm font-semibold text-success-foreground disabled:opacity-50"
                    >
                      Approve
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
