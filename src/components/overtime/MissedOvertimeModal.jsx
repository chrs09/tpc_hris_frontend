import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  fileMissedOvertime,
  getMissedOvertimeOptions,
} from "../../api/overtimeRequests";

const toMinutes = (hhmm) => {
  const [h, m] = (hhmm || "").split(":").map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
};

// Overtime ending after the attendance time out that day = a call-back
// (went home, called back in). Allowed, but flagged to approvers.
const endsAfterAttendance = (day, timeIn, timeOut) => {
  const start = toMinutes(timeIn);
  let end = toMinutes(timeOut);
  const attIn = toMinutes(day?.attendance_time_in);
  let attOut = toMinutes(day?.attendance_time_out);
  if (start == null || end == null || attOut == null) return false;
  if (end <= start) end += 24 * 60;
  if (attIn != null && attOut < attIn) attOut += 24 * 60;
  return end > attOut + 5;
};

const getErrorMessage = (error) =>
  error.response?.data?.detail || error.message || "Something went wrong.";

// "Forgot to clock in/out" -- file overtime for a day in the current
// payroll cutoff. Pick the day; times come pre-filled from the schedule
// (start) and attendance time out (end), so it's usually just a reason.
// Goes to the same approvers, flagged "Late filing".
export default function MissedOvertimeModal({ onClose, onFiled }) {
  const [options, setOptions] = useState(null);
  const [selected, setSelected] = useState(null);
  const [timeIn, setTimeIn] = useState("");
  const [timeOut, setTimeOut] = useState("");
  const [reason, setReason] = useState("");
  const [photo, setPhoto] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getMissedOvertimeOptions()
      .then(setOptions)
      .catch((error) => {
        toast.error(getErrorMessage(error));
        onClose();
      });
    // Load once when opened (onClose is a new function every render).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pickDay = (day) => {
    setSelected(day);
    setTimeIn(day.suggested_time_in || "");
    setTimeOut(day.suggested_time_out || "");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selected) return toast.error("Pick the day.");
    if (!timeIn || !timeOut) return toast.error("Enter the time in and time out.");
    if (!reason.trim()) return toast.error("Reason is required.");
    try {
      setSubmitting(true);
      await fileMissedOvertime({
        otDate: selected.date,
        timeIn,
        timeOut,
        reason: reason.trim(),
        photo,
      });
      toast.success("Missed overtime filed -- sent for approval.");
      onFiled?.();
      onClose();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const days = options?.days || [];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
      <form
        onSubmit={handleSubmit}
        className="flex max-h-[92vh] w-full max-w-md flex-col rounded-t-3xl border border-border bg-surface shadow-xl sm:rounded-3xl"
      >
        <div className="flex items-center justify-between px-6 pb-2 pt-6">
          <h2 className="text-lg font-bold text-fg">File Missed Overtime</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl leading-none text-fg-subtle hover:text-fg"
          >
            &times;
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 pb-2">
          <p className="rounded-xl bg-primary/10 p-3 text-xs text-fg-muted">
            Forgot to clock in and out? File it for any day this payroll cutoff
            {options ? ` (${options.cutoff_label})` : ""}. It goes to your
            approvers marked as a late filing.
          </p>

          {!options ? (
            <p className="py-6 text-center text-sm text-fg-subtle">Loading...</p>
          ) : options.payroll_approved ? (
            <p className="rounded-xl bg-warning/10 p-3 text-sm text-warning">
              Payroll has already approved overtime for this cutoff.
            </p>
          ) : (
            <>
              <div>
                <p className="mb-1.5 text-sm font-medium text-fg-muted">Which day?</p>
                <div className="flex flex-wrap gap-1.5">
                  {days.map((day) => {
                    const disabled = !day.has_attendance || day.already_filed;
                    const on = selected?.date === day.date;
                    return (
                      <button
                        key={day.date}
                        type="button"
                        disabled={disabled}
                        onClick={() => pickDay(day)}
                        title={
                          day.already_filed
                            ? "Already filed"
                            : !day.has_attendance
                              ? "No attendance that day"
                              : undefined
                        }
                        className={`rounded-full border px-2.5 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
                          on
                            ? "border-primary bg-primary/15 text-primary"
                            : "border-border text-fg-muted hover:border-primary/50"
                        }`}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1 text-[11px] text-fg-subtle">
                  Greyed out: no attendance that day, or already filed.
                </p>
              </div>

              {selected && (
                <>
                  <p className="text-xs text-fg-subtle">
                    Attendance: {selected.attendance_time_in || "--"} to{" "}
                    {selected.attendance_time_out || "no time out"}
                    {selected.scheduled_time_out &&
                      ` · Schedule ends ${selected.scheduled_time_out}`}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="text-sm font-medium text-fg-muted">
                      Overtime start
                      <input
                        type="time"
                        value={timeIn}
                        onChange={(e) => setTimeIn(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm text-fg"
                      />
                    </label>
                    <label className="text-sm font-medium text-fg-muted">
                      Overtime end
                      <input
                        type="time"
                        value={timeOut}
                        onChange={(e) => setTimeOut(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm text-fg"
                      />
                    </label>
                  </div>

                  {endsAfterAttendance(selected, timeIn, timeOut) && (
                    <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
                      This ends after your attendance time out (
                      {selected.attendance_time_out}). It will be sent as a{" "}
                      <strong>call-back</strong> -- say in the reason who
                      called you back and why.
                    </p>
                  )}

                  <label className="block text-sm font-medium text-fg-muted">
                    Reason
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={3}
                      placeholder="What was the overtime for, and why wasn't it clocked?"
                      className="mt-1 w-full rounded-xl border border-border bg-background p-3 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </label>

                  <label className="block text-sm font-medium text-fg-muted">
                    Photo (optional)
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                      className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm text-fg"
                    />
                  </label>
                </>
              )}
            </>
          )}
        </div>

        <div className="px-6 pb-6 pt-3">
          <button
            type="submit"
            disabled={submitting || !selected || options?.payroll_approved}
            className="w-full rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            {submitting ? "Filing..." : "File Overtime"}
          </button>
        </div>
      </form>
    </div>
  );
}
