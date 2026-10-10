import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { clock12, overtimeSpan } from "../../utils/overtimeSpan";
import {
  fileOvertime,
  getOvertimeFilingOptions,
} from "../../api/overtimeRequests";

const getErrorMessage = (error) =>
  error.response?.data?.detail || error.message || "Something went wrong.";

const inputStyles =
  "mt-1 w-full rounded-lg border border-border bg-background p-2.5 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30";

// File an overtime request: request date (today), overtime date (any day
// of the current payroll cutoff up to today -- Motorpool its week, Admin
// its semi-monthly cutoff), overtime in/out and reason. Times are pre-filled from the
// schedule and attendance when there's something to go on.
export default function FileOvertimeModal({ onClose, onFiled }) {
  const [days, setDays] = useState([]);
  const [cutoff, setCutoff] = useState(null); // { start, label }
  const [otDate, setOtDate] = useState("");
  const [timeIn, setTimeIn] = useState("");
  const [timeOut, setTimeOut] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const today = days.find((d) => d.is_today);
  const picked = days.find((d) => d.date === otDate);
  const span = overtimeSpan(otDate, timeIn, timeOut);
  const spanTooLong = !!span && span.minutes > 16 * 60;

  const pickDate = (value, list = days) => {
    setOtDate(value);
    const day = list.find((d) => d.date === value);
    setTimeIn(day?.suggested_time_in || "");
    setTimeOut(day?.suggested_time_out || "");
  };

  useEffect(() => {
    getOvertimeFilingOptions()
      .then((data) => {
        const list = data.days || [];
        setDays(list);
        setCutoff({
          start: data.cutoff_start || list[list.length - 1]?.date,
          label: data.cutoff_label,
        });
        const first = list.find((d) => d.is_today) || list[0];
        if (first) pickDate(first.date, list);
      })
      .catch((error) => toast.error(getErrorMessage(error)));
    // Load once when opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!otDate || !timeIn || !timeOut) {
      return toast.error("Fill in the overtime date, in and out.");
    }
    if (!reason.trim()) return toast.error("Reason is required.");
    try {
      setSubmitting(true);
      await fileOvertime({ otDate, timeIn, timeOut, reason: reason.trim() });
      toast.success("Overtime request filed.");
      onFiled?.();
      onClose();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-t-3xl border border-border bg-surface p-6 shadow-xl sm:rounded-3xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-fg">Overtime Request</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl leading-none text-fg-subtle hover:text-fg"
          >
            &times;
          </button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-medium text-fg-muted">
              Request date
              <input
                type="date"
                value={today?.date || ""}
                readOnly
                className={`${inputStyles} cursor-not-allowed opacity-70`}
              />
            </label>
            <label className="text-sm font-medium text-fg-muted">
              Overtime date
              <input
                type="date"
                value={otDate}
                min={cutoff?.start}
                max={today?.date}
                onChange={(e) => pickDate(e.target.value)}
                className={inputStyles}
              />
            </label>
          </div>

          <p className="-mt-1 text-[11px] text-fg-subtle">
            Pick the day the overtime <strong>started</strong> -- even if it ended after midnight.
          </p>

          {picked?.attendance_time_out && (
            <div className="flex items-center justify-between gap-2 rounded-xl bg-surface-hover px-3 py-2 text-xs">
              <span className="text-fg-muted">
                Your time out that day:{" "}
                <strong className="text-fg">{clock12(picked.attendance_time_out)}</strong>
              </span>
              {timeOut !== picked.attendance_time_out && (
                <button
                  type="button"
                  onClick={() => setTimeOut(picked.attendance_time_out)}
                  className="font-semibold text-primary hover:underline"
                >
                  Use it as the end
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-medium text-fg-muted">
              Overtime starts
              <input
                type="time"
                value={timeIn}
                onChange={(e) => setTimeIn(e.target.value)}
                className={inputStyles}
              />
            </label>
            <label className="text-sm font-medium text-fg-muted">
              Overtime ends
              <input
                type="time"
                value={timeOut}
                onChange={(e) => setTimeOut(e.target.value)}
                className={inputStyles}
              />
            </label>
          </div>

          {span && (
            <div
              className={`rounded-xl border px-3 py-2.5 text-sm ${
                spanTooLong ? "border-danger/40 bg-danger/10" : "border-primary/30 bg-primary/10"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-fg">
                  {span.startLabel} → {span.endLabel}
                </span>
                {span.nextDay && (
                  <span className="rounded-full bg-fg px-2 py-0.5 text-[11px] font-semibold text-background">
                    🌙 Ends the next day
                  </span>
                )}
              </div>
              <p className={`mt-1 text-xs font-semibold ${spanTooLong ? "text-danger" : "text-primary"}`}>
                {spanTooLong
                  ? `${span.duration} -- more than 16 hours, check the times`
                  : `Total: ${span.duration}`}
              </p>
            </div>
          )}

          <label className="block text-sm font-medium text-fg-muted">
            Reason
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="What is the overtime for?"
              className={inputStyles}
            />
          </label>

          {picked && !picked.can_file && (
            <p className="text-xs font-medium text-danger">
              {picked.payroll_approved
                ? "Payroll already approved overtime for this cutoff."
                : "No attendance that day -- overtime can't be filed for it."}
            </p>
          )}
          <p className="text-[11px] text-fg-subtle">
            Overtime date can be any day of this payroll cutoff
            {cutoff?.label ? ` (${cutoff.label})` : ""}, up to today.
          </p>
        </div>

        <button
          type="submit"
          disabled={submitting || !days.length}
          className="mt-5 w-full rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          {submitting ? "Submitting..." : "Submit Request"}
        </button>
      </form>
    </div>
  );
}
