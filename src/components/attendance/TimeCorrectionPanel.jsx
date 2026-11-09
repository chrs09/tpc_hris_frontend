import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { History } from "lucide-react";
import {
  approveTimeCorrection,
  getTimeCorrectionsForMe,
  rejectTimeCorrection,
} from "../../api/attendance/requests";
import ApprovalProgress from "../approvals/ApprovalProgress";
import CorrectionPhotos from "../timeCorrection/CorrectionPhotos";
import ApprovedBy from "../approvals/ApprovedBy";
import { promptDialog } from "../ui/dialog/dialogService";

// Approvals -> Attendance: employees' time corrections waiting on me. The
// approver can adjust the times; the last approval writes them into the
// attendance (each change in the audit log). Renders nothing when empty.
export default function TimeCorrectionPanel({ canEdit = true, onCount, showEmpty = false }) {
  const [items, setItems] = useState([]);
  const [busyId, setBusyId] = useState(null);
  // Times the approver changed: { [id]: { time_in, time_out } }.
  const [edits, setEdits] = useState({});

  const load = useCallback(async () => {
    try {
      setItems(await getTimeCorrectionsForMe());
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to load time corrections.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // The Attendance Approvals tab count.
  useEffect(() => {
    onCount?.(items.length);
  }, [items.length, onCount]);

  const valueOf = (item, side) => edits[item.id]?.[side] ?? item[`${side}_hhmm`] ?? "";
  const setValue = (item, side, value) =>
    setEdits((prev) => ({ ...prev, [item.id]: { ...prev[item.id], [side]: value } }));

  const act = async (item, approve) => {
    const remarks = await promptDialog(
      approve
        ? `Approve ${item.employee_name}'s time correction for ${item.date_label}? Remarks (optional):`
        : `Reject ${item.employee_name}'s time correction for ${item.date_label}? Reason:`,
    );
    if (remarks === null) return;
    try {
      setBusyId(item.id);
      const result = approve
        ? await approveTimeCorrection(item.id, {
            remarks: remarks.trim() || undefined,
            time_in: item.time_in_hhmm ? valueOf(item, "time_in") || undefined : undefined,
            time_out: item.time_out_hhmm ? valueOf(item, "time_out") || undefined : undefined,
          })
        : await rejectTimeCorrection(item.id, remarks.trim() || undefined);
      toast.success(result?.message || (approve ? "Approved." : "Rejected."));
      await load();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Something went wrong.");
    } finally {
      setBusyId(null);
    }
  };

  if (!items.length) {
    return showEmpty ? (
      <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-fg-subtle">
        No time corrections waiting on you.
      </div>
    ) : null;
  }

  const timeRow = (item, side, label) => {
    if (!item[`${side}_hhmm`]) return null;
    const current = item[`current_${side}`];
    return (
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="w-16 font-medium text-fg-muted">{label}</span>
        <span className="text-fg-subtle line-through decoration-fg-subtle/60">
          {current || "none"}
        </span>
        <span className="text-fg-subtle">→</span>
        {canEdit && item.can_act ? (
          <input
            type="time"
            value={valueOf(item, side)}
            onChange={(e) => setValue(item, side, e.target.value)}
            className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-fg"
            aria-label={`${label} for ${item.employee_name}`}
          />
        ) : (
          <span className="font-semibold text-fg">{item[side]}</span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center gap-2">
        <History size={18} className="text-primary" />
        <h2 className="font-semibold text-fg">Time corrections</h2>
        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
          {items.length}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {items.map((item) => (
          <div key={item.id} className="space-y-2 rounded-xl border border-border bg-background p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-fg">{item.employee_name}</p>
                {item.position && <p className="text-xs text-fg-muted">{item.position}</p>}
              </div>
              <span className="rounded-full bg-surface-active px-2 py-0.5 text-[11px] font-semibold text-fg-muted">
                {item.date_label}
              </span>
            </div>
            {timeRow(item, "time_in", "Time in")}
            {timeRow(item, "time_out", "Time out")}
            <p className="text-xs text-fg-muted">Reason: “{item.reason}”</p>
            <CorrectionPhotos item={item} />
            <ApprovalProgress steps={item.approval_steps} />
            <ApprovedBy log={item.approval_log} />
            {canEdit && item.can_act && (
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  disabled={busyId === item.id}
                  onClick={() => act(item, true)}
                  className="rounded-lg bg-success px-3 py-1.5 text-xs font-semibold text-success-foreground disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  type="button"
                  disabled={busyId === item.id}
                  onClick={() => act(item, false)}
                  className="rounded-lg bg-danger px-3 py-1.5 text-xs font-semibold text-danger-foreground disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
