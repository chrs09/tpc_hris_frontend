import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  fileOvertime,
  getOvertimeFilingOptions,
} from "../../api/overtimeRequests";

const getErrorMessage = (error) =>
  error.response?.data?.detail || error.message || "Something went wrong.";

const inputStyles =
  "mt-1 w-full rounded-lg border border-border bg-background p-2.5 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30";

// File an overtime request: request date (today), overtime date (today or
// yesterday), overtime in/out and reason. Times are pre-filled from the
// schedule and attendance when there's something to go on.
export default function FileOvertimeModal({ onClose, onFiled }) {
  const [days, setDays] = useState([]);
  const [otDate, setOtDate] = useState("");
  const [timeIn, setTimeIn] = useState("");
  const [timeOut, setTimeOut] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const today = days.find((d) => d.is_today);
  const yesterday = days.find((d) => !d.is_today);

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
                min={yesterday?.date}
                max={today?.date}
                onChange={(e) => pickDate(e.target.value)}
                className={inputStyles}
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-medium text-fg-muted">
              Overtime in
              <input
                type="time"
                value={timeIn}
                onChange={(e) => setTimeIn(e.target.value)}
                className={inputStyles}
              />
            </label>
            <label className="text-sm font-medium text-fg-muted">
              Overtime out
              <input
                type="time"
                value={timeOut}
                onChange={(e) => setTimeOut(e.target.value)}
                className={inputStyles}
              />
            </label>
          </div>

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

          <p className="text-[11px] text-fg-subtle">
            Overtime date can be today or yesterday.
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
