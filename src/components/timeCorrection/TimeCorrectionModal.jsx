import React, { useState } from "react";
import toast from "react-hot-toast";
import { fileTimeCorrection } from "../../api/attendance/requests";

const inputClass =
  "w-full rounded-xl border border-border bg-background p-3 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30";

// Today in the Philippines, "YYYY-MM-DD".
const todayPH = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });

// File a time correction: the day, the time in and/or time out it should
// be, and why. Goes to the attendance approvers; nothing changes until
// it's approved. date: a day to start on (e.g. one the head confirmed).
export default function TimeCorrectionModal({ date = "", onClose, onFiled }) {
  const [day, setDay] = useState(date);
  const [timeIn, setTimeIn] = useState("");
  const [timeOut, setTimeOut] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!day || !reason.trim()) {
      toast.error("Pick the day and give the reason.");
      return;
    }
    if (!timeIn && !timeOut) {
      toast.error("Enter the time in, the time out, or both.");
      return;
    }
    try {
      setSubmitting(true);
      await fileTimeCorrection({
        attendance_date: day,
        time_in: timeIn || undefined,
        time_out: timeOut || undefined,
        reason: reason.trim(),
      });
      toast.success("Time correction filed.");
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
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-t-3xl border border-border bg-surface p-6 shadow-xl sm:rounded-3xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-fg">File Time Correction</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl leading-none text-fg-subtle hover:text-fg"
          >
            &times;
          </button>
        </div>
        <p className="mb-4 text-xs text-fg-subtle">
          Forgot to time in or out, or the time is wrong? Enter what it should be. Your head
          approves it before your attendance changes.
        </p>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-fg-muted">Day</label>
            <input
              type="date"
              value={day}
              max={todayPH()}
              onChange={(e) => setDay(e.target.value)}
              className={inputClass}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-fg-muted">Time in</label>
              <input
                type="time"
                value={timeIn}
                onChange={(e) => setTimeIn(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-fg-muted">Time out</label>
              <input
                type="time"
                value={timeOut}
                onChange={(e) => setTimeOut(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <p className="-mt-2 text-[11px] text-fg-subtle">
            Leave one blank to keep what&apos;s recorded. A time out earlier than the time in
            counts as the next morning.
          </p>
          <div>
            <label className="mb-1 block text-sm font-medium text-fg-muted">Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="e.g. Phone battery died, I was at the office from 8 AM."
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
          {submitting ? "Submitting..." : "Submit Time Correction"}
        </button>
      </form>
    </div>
  );
}
