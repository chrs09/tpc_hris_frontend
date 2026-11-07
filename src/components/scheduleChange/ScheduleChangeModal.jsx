import { useState } from "react";
import toast from "react-hot-toast";
import { fileScheduleChange } from "../../api/scheduleChanges";

const inputClass =
  "w-full rounded-xl border border-border bg-background p-3 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30";

// Tomorrow in the Philippines, "YYYY-MM-DD" (filed before the day).
const tomorrowPH = () => {
  const d = new Date(Date.now() + 24 * 3600 * 1000);
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
};

// Request a different time in / out for one day. Your head approves it;
// until then (or if rejected) your regular schedule applies.
export default function ScheduleChangeModal({ onClose, onFiled }) {
  const [day, setDay] = useState(tomorrowPH());
  const [timeIn, setTimeIn] = useState("");
  const [timeOut, setTimeOut] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (!day || !timeIn || !timeOut || !reason.trim()) {
      toast.error("Fill in the day, both times and the reason.");
      return;
    }
    try {
      setSubmitting(true);
      await fileScheduleChange({
        schedule_date: day,
        time_in: timeIn,
        time_out: timeOut,
        reason: reason.trim(),
      });
      toast.success("Schedule change filed.");
      onFiled?.();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-t-3xl border border-border bg-surface p-6 shadow-xl sm:rounded-3xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-fg">Request Schedule Change</h2>
          <button type="button" onClick={onClose} className="text-2xl leading-none text-fg-subtle hover:text-fg">
            &times;
          </button>
        </div>
        <p className="mb-4 text-xs text-fg-subtle">
          A different time in / out for one day only -- file it before the day. Your head
          approves it; until then your regular schedule applies. Late, undertime and pay
          that day follow the approved time.
        </p>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-fg-muted">Day</label>
            <input
              type="date"
              value={day}
              min={tomorrowPH()}
              onChange={(e) => setDay(e.target.value)}
              className={inputClass}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-fg-muted">Time in</label>
              <input type="time" value={timeIn} onChange={(e) => setTimeIn(e.target.value)} className={inputClass} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-fg-muted">Time out</label>
              <input type="time" value={timeOut} onChange={(e) => setTimeOut(e.target.value)} className={inputClass} required />
            </div>
          </div>
          <p className="-mt-2 text-[11px] text-fg-subtle">
            A time out earlier than the time in counts as the next morning.
          </p>
          <div>
            <label className="mb-1 block text-sm font-medium text-fg-muted">Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="e.g. Client meeting in the evening -- 10 AM to 7 PM."
              className={inputClass}
              required
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="mt-6 w-full rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          {submitting ? "Submitting..." : "Submit Request"}
        </button>
      </form>
    </div>
  );
}
