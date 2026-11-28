import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  fileTimeCorrection,
  getMyRecordedDay,
  uploadTimeCorrectionPhotos,
} from "../../api/attendance/requests";

// "14:05" -> "2:05 PM".
const to12h = (hhmm) => {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

const inputClass =
  "w-full rounded-xl border border-border bg-background p-3 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30";

// A small "attach photo" field (optional proof), with a thumbnail.
function PhotoPicker({ label, file, onChange }) {
  return (
    <div className="mt-2">
      {file ? (
        <div className="flex items-center gap-2">
          <img
            src={URL.createObjectURL(file)}
            alt={label}
            className="h-12 w-12 rounded-lg border border-border object-cover"
          />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-xs text-danger hover:underline"
          >
            Remove
          </button>
        </div>
      ) : (
        <label className="block cursor-pointer rounded-lg border border-dashed border-border px-2 py-1.5 text-center text-[11px] text-fg-muted hover:bg-surface-hover">
          + {label} (optional)
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onChange(e.target.files?.[0] || null)}
          />
        </label>
      )}
    </div>
  );
}

// Today in the Philippines, "YYYY-MM-DD".
const todayPH = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
// Now in the Philippines, "HH:MM" (24h) -- compares with <input type="time">.
const nowPH = () =>
  new Date().toLocaleTimeString("en-GB", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

// File a time correction: the day, the time in and/or time out it should
// be, and why. Goes to the attendance approvers; nothing changes until
// it's approved. date: a day to start on (e.g. one the head confirmed).
export default function TimeCorrectionModal({ date = "", onClose, onFiled }) {
  const [day, setDay] = useState(date);
  const [timeIn, setTimeIn] = useState("");
  const [timeOut, setTimeOut] = useState("");
  const [reason, setReason] = useState("");
  // Optional proof for each time (photo / screenshot), sent after filing.
  const [timeInPhoto, setTimeInPhoto] = useState(null);
  const [timeOutPhoto, setTimeOutPhoto] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  // What the attendance shows for the picked day (filled in below).
  const [recorded, setRecorded] = useState(null);
  const [loadingDay, setLoadingDay] = useState(false);

  useEffect(() => {
    if (!day) return undefined;
    let alive = true;
    setLoadingDay(true);
    getMyRecordedDay(day)
      .then((rec) => {
        if (!alive) return;
        setRecorded(rec || { has_record: false });
        setTimeIn(rec?.time_in_hhmm || "");
        setTimeOut(rec?.time_out_hhmm || "");
      })
      .catch(() => alive && setRecorded(null))
      .finally(() => alive && setLoadingDay(false));
    return () => {
      alive = false;
    };
  }, [day]);

  // Only what's different from the record is sent.
  const inChanged = Boolean(timeIn) && timeIn !== (recorded?.time_in_hhmm || "");
  const outChanged = Boolean(timeOut) && timeOut !== (recorded?.time_out_hhmm || "");

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!day || !reason.trim()) {
      toast.error("Pick the day and give the reason.");
      return;
    }
    if (!inChanged && !outChanged) {
      toast.error("Change the time in, the time out, or both.");
      return;
    }
    // Same day: a time later than now hasn't happened yet (the server
    // rejects it too -- this just says so before sending).
    if (day === todayPH()) {
      const now = nowPH();
      if (inChanged && timeIn > now) {
        toast.error("That time in hasn't happened yet.");
        return;
      }
      if (outChanged && timeOut > now && (!timeIn || timeOut > timeIn)) {
        toast.error(
          "That time out hasn't happened yet. Leave Time out blank -- time out as usual, or file it after.",
        );
        return;
      }
    }
    try {
      setSubmitting(true);
      const filed = await fileTimeCorrection({
        attendance_date: day,
        time_in: inChanged ? timeIn : undefined,
        time_out: outChanged ? timeOut : undefined,
        reason: reason.trim(),
      });
      if (filed?.id && (timeInPhoto || timeOutPhoto)) {
        try {
          await uploadTimeCorrectionPhotos(filed.id, {
            timeIn: timeInPhoto,
            timeOut: timeOutPhoto,
          });
        } catch (error) {
          toast.error(
            `Filed, but the photos didn't upload (${
              error.response?.data?.detail || "error"
            }).`,
          );
        }
      }
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
          {day && (
            <div className="rounded-xl border border-border bg-surface-hover px-3 py-2 text-xs">
              {loadingDay ? (
                <span className="text-fg-subtle">Checking your attendance...</span>
              ) : recorded?.has_record ? (
                <span className="text-fg-muted">
                  Recorded: <b className="text-fg">In {recorded.time_in || "none"}</b> ·{" "}
                  <b className="text-fg">Out {recorded.time_out || "none"}</b>
                  {recorded.status ? ` · ${recorded.status}` : ""}. Change only what&apos;s wrong.
                </span>
              ) : (
                <span className="text-fg-muted">No attendance recorded on this day.</span>
              )}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-fg-muted">Time in</label>
              <input
                type="time"
                value={timeIn}
                onChange={(e) => setTimeIn(e.target.value)}
                className={`${inputClass} ${inChanged ? "border-primary ring-1 ring-primary/30" : ""}`}
              />
              {inChanged && (
                <p className="mt-1 text-[11px] font-semibold text-primary">
                  {recorded?.time_in || "none"} → {to12h(timeIn)}
                </p>
              )}
              <PhotoPicker label="Time in photo" file={timeInPhoto} onChange={setTimeInPhoto} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-fg-muted">Time out</label>
              <input
                type="time"
                value={timeOut}
                onChange={(e) => setTimeOut(e.target.value)}
                className={`${inputClass} ${outChanged ? "border-primary ring-1 ring-primary/30" : ""}`}
              />
              {outChanged && (
                <p className="mt-1 text-[11px] font-semibold text-primary">
                  {recorded?.time_out || "none"} → {to12h(timeOut)}
                </p>
              )}
              <PhotoPicker label="Time out photo" file={timeOutPhoto} onChange={setTimeOutPhoto} />
            </div>
          </div>
          <p className="-mt-2 text-[11px] text-fg-subtle">
            The recorded times are filled in. Change only the one that&apos;s wrong. A time out
            earlier than the time in counts as the next morning.
          </p>
          {day === todayPH() && (
            <p className="-mt-2 rounded-lg bg-warning/10 px-3 py-2 text-[11px] text-warning">
              Fixing today&apos;s time in? Fill in <b>Time in</b> only and leave Time out blank
              until you&apos;ve timed out.
            </p>
          )}
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
