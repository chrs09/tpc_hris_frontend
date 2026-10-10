import { useCallback, useEffect, useRef, useState } from "react";

import {
  fileKioskMissedTimeOut,
  getKioskStatus,
  kioskSelfieAttendance,
} from "../../api/attendance";

import TytanLogo from "../../assets/logo/tytan-logo.jpg";

// Attendance Kiosk -- a shared tablet/phone at the gate. Built to be done
// in a few taps by anyone:
//   1. Welcome: big clock + number pad for the Employee ID.
//   2. Their screen: today's in/out and ONE next action, with only the
//      steps that apply, numbered -- forgot to time out on an earlier
//      day, work accomplished (time out, when their head checks it), then
//      the selfie. Location is found in the background.
//   3. Done: a big confirmation, then back to the start by itself.
// An unattended screen also returns to the start.

// Work proof size limit (same as the backend).
const WORK_PROOF_MAX_MB = 50;
const IDLE_RESET_MS = 90 * 1000;
const DONE_RESET_SECONDS = 6;

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "back"];

const timeText = (date) =>
  date.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });
const dateText = (date) =>
  date.toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric" });

const greeting = (date) => {
  const h = date.getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
};

const getAddressFromCoordinates = async (latitude, longitude) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
    );
    const data = await response.json();
    return data.display_name || "Unknown location";
  } catch {
    return "Unable to fetch address";
  }
};

const getCurrentLocation = async () => {
  const position = await new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 30000,
      maximumAge: 0,
    });
  });
  const { latitude, longitude, accuracy } = position.coords;
  const address = await getAddressFromCoordinates(latitude, longitude);
  return { latitude, longitude, accuracy, address };
};

function StepHeader({ number, title, hint }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
        {number}
      </span>
      <div>
        <p className="text-lg font-semibold leading-tight text-slate-900">{title}</p>
        {hint && <p className="mt-0.5 text-sm text-slate-500">{hint}</p>}
      </div>
    </div>
  );
}

export default function AttendanceKiosk() {
  const [now, setNow] = useState(() => new Date());
  const [employeeId, setEmployeeId] = useState("");
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  // { title, detail, name } after a successful time in / out.
  const [done, setDone] = useState(null);
  const [countdown, setCountdown] = useState(DONE_RESET_SECONDS);

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  // null = not yet, "loading", "error", or { latitude, longitude, ... }
  const [locationInfo, setLocationInfo] = useState(null);

  // Work accomplished at time out (head ticks "Work accomplished").
  const [workText, setWorkText] = useState("");
  const [workProof, setWorkProof] = useState(null);
  const [workProofPreview, setWorkProofPreview] = useState(null);

  // Forgot to time out on earlier days: { [attendance_id]: { time, reason } },
  // all filled in before today's selfie.
  const [missedEntries, setMissedEntries] = useState({});
  // Days already sent this visit (skipped if the time in has to be retried).
  const filedIdsRef = useRef(new Set());
  const setMissedEntry = (id, field, value) =>
    setMissedEntries((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));

  const idInputRef = useRef(null);
  const selfieInputRef = useRef(null);

  // Live clock.
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const resetKiosk = useCallback(() => {
    setEmployee(null);
    setEmployeeId("");
    setPhotoFile(null);
    setPhotoPreview(null);
    setLocationInfo(null);
    setWorkText("");
    setWorkProof(null);
    setWorkProofPreview(null);
    setMissedEntries({});
    filedIdsRef.current = new Set();
    setError("");
    setNotice("");
    setDone(null);
    setTimeout(() => idInputRef.current?.focus(), 0);
  }, []);

  // Unattended for a while -> back to the start.
  useEffect(() => {
    if (!employee || submitting) return undefined;
    let timer = setTimeout(resetKiosk, IDLE_RESET_MS);
    const bump = () => {
      clearTimeout(timer);
      timer = setTimeout(resetKiosk, IDLE_RESET_MS);
    };
    const events = ["pointerdown", "keydown", "input"];
    events.forEach((e) => window.addEventListener(e, bump));
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, bump));
    };
  }, [employee, submitting, resetKiosk]);

  // Done screen counts down, then back to the start.
  useEffect(() => {
    if (!done) return undefined;
    setCountdown(DONE_RESET_SECONDS);
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          resetKiosk();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [done, resetKiosk]);

  const findLocation = useCallback(async () => {
    setLocationInfo("loading");
    try {
      setLocationInfo(await getCurrentLocation());
    } catch {
      setLocationInfo("error");
    }
  }, []);

  const loadEmployeeStatus = async () => {
    const id = employeeId.trim();
    if (!id) {
      setError("Enter your Employee ID.");
      return;
    }
    try {
      setLoading(true);
      setError("");
      const result = await getKioskStatus(id);
      setEmployee(result);
      setPhotoFile(null);
      setPhotoPreview(null);
      // Start finding the location right away so it's ready by the selfie.
      if (result.next_action !== "completed") findLocation();
    } catch (err) {
      setEmployee(null);
      setError(err?.response?.data?.detail || "We couldn't find that Employee ID.");
    } finally {
      setLoading(false);
    }
  };

  const pressKey = (key) => {
    setError("");
    if (key === "clear") return setEmployeeId("");
    if (key === "back") return setEmployeeId((v) => v.slice(0, -1));
    return setEmployeeId((v) => (v.length < 10 ? v + key : v));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    if (!locationInfo || locationInfo === "error") findLocation();
  };

  const handleWorkProofChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!/^(image|video)\//.test(file.type)) {
      setError("Work proof must be a photo or a video.");
      return;
    }
    if (file.size > WORK_PROOF_MAX_MB * 1024 * 1024) {
      setError(`The video is too large (${WORK_PROOF_MAX_MB} MB max). Record a shorter one.`);
      return;
    }
    setError("");
    setWorkProof(file);
    setWorkProofPreview({ url: URL.createObjectURL(file), isVideo: file.type.startsWith("video/") });
  };

  const name = employee?.employee_name || employee?.name || employee?.full_name || "there";
  const firstName = String(name).split(" ")[0];
  const action = employee?.next_action;
  const isTimeIn = action === "time_in";
  // Every earlier day without a time out (oldest first).
  const missedDays = isTimeIn
    ? employee?.missed_time_outs?.length
      ? employee.missed_time_outs
      : employee?.missed_time_out
        ? [employee.missed_time_out]
        : []
    : [];
  const missed = missedDays.length ? missedDays : null;
  const asksWork = action === "time_out" && employee?.work_report_required;
  const locationReady = locationInfo && typeof locationInfo === "object";

  // Which steps apply, numbered in order.
  let stepNo = 0;
  const missedStep = missed ? ++stepNo : null;
  const workStep = asksWork ? ++stepNo : null;
  const selfieStep = ++stepNo;

  const entryDone = (day) =>
    Boolean(missedEntries[day.attendance_id]?.time && missedEntries[day.attendance_id]?.reason?.trim());
  const missedDone = missedDays.every(entryDone);
  const workDone = !asksWork || workText.trim();
  const canSubmit = photoFile && locationReady && missedDone && workDone && !submitting;

  const handleSubmit = async () => {
    if (!employee) return;
    if (missed && !missedDone) {
      const first = missedDays.find((day) => !entryDone(day));
      setError(`Step ${missedStep}: enter the time you left on ${first.date_label} and why.`);
      return;
    }
    if (asksWork && !workDone) {
      setError(`Step ${workStep}: write what you worked on today.`);
      return;
    }
    if (!photoFile) {
      setError("Take your selfie first.");
      return;
    }
    if (!locationReady) {
      setError("Still finding your location -- wait a moment or tap Try again.");
      return;
    }
    try {
      setSubmitting(true);
      setError("");

      // File every missed day first (each goes to the head), then time in.
      let stillOpen = null;
      for (const day of missedDays) {
        if (filedIdsRef.current.has(day.attendance_id)) continue;
        const entry = missedEntries[day.attendance_id];
        const filed = await fileKioskMissedTimeOut(
          employee.employee_id,
          day.attendance_id,
          entry.time,
          entry.reason.trim(),
        );
        filedIdsRef.current.add(day.attendance_id);
        stillOpen = filed.missed_time_out;
      }
      if (missed && stillOpen) {
        // Another open day turned up -- show it and stop here.
        const fresh = await getKioskStatus(employee.employee_id);
        setEmployee(fresh);
        setMissedEntries({});
        setNotice(`Sent. There's one more day without a time out: ${stillOpen.date_label}.`);
        return;
      }

      const formData = new FormData();
      formData.append("employee_id", employee.employee_id);
      formData.append("action", action);
      formData.append("latitude", locationInfo.latitude);
      formData.append("longitude", locationInfo.longitude);
      formData.append("address", locationInfo.address);
      formData.append("photo", photoFile);
      if (asksWork) {
        formData.append("work_accomplished", workText.trim());
        if (workProof) formData.append("proof", workProof);
      }

      const result = await kioskSelfieAttendance(formData);
      setDone({
        title: isTimeIn ? "You're timed in" : "You're timed out",
        time: timeText(new Date()),
        detail: [
          result?.message,
          missed
            ? `Your time out for ${missedDays.map((d) => d.date_label).join(" and ")} was sent to your head.`
            : null,
          asksWork && !workProof ? "No work photo -- your head will review this time out." : null,
        ]
          .filter(Boolean)
          .join(" "),
        flagged: Boolean(result?.outside_geofence),
        goodbye: isTimeIn ? `Have a great day, ${firstName}!` : `Thanks for today, ${firstName}. Ingat!`,
      });
    } catch (err) {
      setError(err?.response?.data?.detail || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ------------------------------------------------------------- layout
  return (
    <div
      className="flex min-h-screen items-start justify-center bg-[#2b2b2b] p-3 sm:items-center sm:p-6"
      style={{ colorScheme: "light" }}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white text-slate-900 shadow-2xl">
        {/* Header: logo + live clock */}
        <div className="flex items-center justify-between gap-3 bg-slate-900 px-5 py-4 text-white">
          <div className="flex items-center gap-3">
            <img src={TytanLogo} alt="Tytan Prime" className="h-10 w-10 rounded-lg bg-white object-contain" />
            <div>
              <p className="text-sm font-semibold leading-tight">Tytan Prime Corporation</p>
              <p className="text-xs text-slate-300">Attendance Kiosk</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold tabular-nums">{timeText(now)}</p>
            <p className="text-[11px] text-slate-300">{dateText(now)}</p>
          </div>
        </div>

        <div className="space-y-5 p-5">
          {/* ---------------- DONE */}
          {done ? (
            <div className="space-y-5 py-4 text-center">
              <div
                className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full text-5xl text-white ${
                  done.flagged ? "bg-amber-500" : "bg-emerald-500"
                }`}
              >
                {done.flagged ? "!" : "✓"}
              </div>
              <div>
                <p className="text-3xl font-bold">{done.title}</p>
                <p className="mt-1 text-5xl font-extrabold tabular-nums text-slate-900">{done.time}</p>
              </div>
              {done.detail && <p className="text-sm text-slate-600">{done.detail}</p>}
              <p className="text-lg font-semibold text-emerald-700">{done.goodbye}</p>
              <button
                type="button"
                onClick={resetKiosk}
                className="w-full rounded-2xl bg-slate-900 py-4 text-lg font-semibold text-white active:scale-[0.99]"
              >
                Done ({countdown})
              </button>
            </div>
          ) : !employee ? (
            /* ---------------- WELCOME / ID */
            <div className="space-y-5">
              <div className="text-center">
                <p className="text-2xl font-bold">{greeting(now)}!</p>
                <p className="text-sm text-slate-500">Enter your Employee ID to time in or out.</p>
              </div>

              <input
                ref={idInputRef}
                autoFocus
                inputMode="numeric"
                value={employeeId}
                onChange={(e) => {
                  setError("");
                  setEmployeeId(e.target.value.replace(/\D/g, "").slice(0, 10));
                }}
                onKeyDown={(e) => e.key === "Enter" && loadEmployeeStatus()}
                placeholder="Employee ID"
                aria-label="Employee ID"
                className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 py-4 text-center text-4xl font-bold tracking-widest text-slate-900 placeholder:text-2xl placeholder:font-medium placeholder:tracking-normal placeholder:text-slate-400 focus:border-slate-900 focus:outline-none"
              />

              <div className="grid grid-cols-3 gap-3">
                {KEYS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => pressKey(key)}
                    className={`rounded-2xl py-4 text-2xl font-semibold active:scale-95 ${
                      key === "clear" || key === "back"
                        ? "bg-slate-100 text-base text-slate-600"
                        : "bg-slate-100 text-slate-900 hover:bg-slate-200"
                    }`}
                  >
                    {key === "clear" ? "Clear" : key === "back" ? "⌫" : key}
                  </button>
                ))}
              </div>

              {error && (
                <p className="rounded-xl bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-700">
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={loadEmployeeStatus}
                disabled={loading || !employeeId}
                className="w-full rounded-2xl bg-emerald-600 py-4 text-lg font-semibold text-white disabled:opacity-40 active:scale-[0.99]"
              >
                {loading ? "Checking..." : "Continue"}
              </button>
            </div>
          ) : (
            /* ---------------- EMPLOYEE */
            <div className="space-y-5">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">{greeting(now)},</p>
                <p className="text-2xl font-bold leading-tight">{name}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-xl bg-white p-2.5">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Time in</p>
                    <p className="text-lg font-bold text-emerald-700">{employee.time_in || "—"}</p>
                  </div>
                  <div className="rounded-xl bg-white p-2.5">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Time out</p>
                    <p className="text-lg font-bold text-blue-700">{employee.time_out || "—"}</p>
                  </div>
                </div>
                {missedDays.map((day) => (
                  <p
                    key={day.attendance_id}
                    className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700"
                  >
                    <strong>{day.date_label}:</strong> timed in {day.time_in || "--"}, no time out.
                  </p>
                ))}
              </div>

              {action === "completed" ? (
                <div className="space-y-4 text-center">
                  <p className="text-lg font-semibold">You&apos;re all done for today. 👍</p>
                  <button
                    type="button"
                    onClick={resetKiosk}
                    className="w-full rounded-2xl bg-slate-900 py-4 text-lg font-semibold text-white"
                  >
                    Back
                  </button>
                </div>
              ) : (
                <>
                  {notice && (
                    <p className="rounded-xl bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800">{notice}</p>
                  )}

                  {/* STEP: missed time out(s) -- all of them before today's selfie */}
                  {missed && (
                    <div className="space-y-3 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4">
                      <StepHeader
                        number={missedStep}
                        title={
                          missedDays.length === 1
                            ? `Finish ${missedDays[0].date_label}`
                            : `Finish ${missedDays.length} days without a time out`
                        }
                        hint="When did you leave each day? Your head approves it."
                      />
                      {missedDays.map((day, index) => {
                        const entry = missedEntries[day.attendance_id] || {};
                        return (
                          <div
                            key={day.attendance_id}
                            className={`space-y-2 ${
                              missedDays.length > 1 ? "rounded-xl border border-amber-200 bg-white/70 p-3" : ""
                            }`}
                          >
                            {missedDays.length > 1 && (
                              <p className="flex items-center justify-between text-sm font-semibold text-amber-900">
                                <span>
                                  {day.date_label}
                                  <span className="font-normal text-amber-800"> · timed in {day.time_in || "--"}</span>
                                </span>
                                {entryDone(day) && <span className="text-emerald-600">✓</span>}
                              </p>
                            )}
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[150px_1fr]">
                              <label className="block text-sm font-semibold text-slate-700">
                                Time you left
                                <input
                                  type="time"
                                  value={entry.time || ""}
                                  onChange={(e) => setMissedEntry(day.attendance_id, "time", e.target.value)}
                                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-base text-slate-900"
                                />
                                <span className="mt-1 block text-[11px] font-normal text-slate-500">
                                  Past midnight? Enter it as is.
                                </span>
                              </label>
                              <label className="block text-sm font-semibold text-slate-700">
                                Why didn&apos;t you time out?
                                <textarea
                                  rows={2}
                                  maxLength={1000}
                                  value={entry.reason || ""}
                                  onChange={(e) => setMissedEntry(day.attendance_id, "reason", e.target.value)}
                                  placeholder="e.g. Rescue call, phone died, forgot"
                                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base text-slate-900"
                                />
                              </label>
                            </div>
                            {index === 0 && missedDays.length > 1 && entry.reason?.trim() && (
                              <button
                                type="button"
                                onClick={() =>
                                  missedDays.slice(1).forEach((other) =>
                                    setMissedEntry(other.attendance_id, "reason", entry.reason),
                                  )
                                }
                                className="text-xs font-semibold text-amber-800 underline"
                              >
                                Use this reason for all days
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* STEP: work accomplished */}
                  {asksWork && (
                    <div className="space-y-3 rounded-2xl border-2 border-slate-200 p-4">
                      <StepHeader
                        number={workStep}
                        title="What did you work on today?"
                        hint={
                          employee.work_report_head
                            ? `${employee.work_report_head} checks this.`
                            : "Your head checks this."
                        }
                      />
                      <textarea
                        rows={3}
                        maxLength={2000}
                        value={workText}
                        onChange={(e) => setWorkText(e.target.value)}
                        placeholder="e.g. Changed oil on CAU 7766, checked brakes on CAU 7772"
                        className="w-full rounded-xl border border-slate-300 bg-white p-3 text-base text-slate-900"
                      />
                      {workProofPreview ? (
                        <div className="space-y-2">
                          {workProofPreview.isVideo ? (
                            <video src={workProofPreview.url} controls className="max-h-56 w-full rounded-xl bg-black" />
                          ) : (
                            <img src={workProofPreview.url} alt="Work proof" className="max-h-56 w-full rounded-xl object-cover" />
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setWorkProof(null);
                              setWorkProofPreview(null);
                            }}
                            className="text-sm font-semibold text-red-600"
                          >
                            Remove photo / video
                          </button>
                        </div>
                      ) : (
                        <>
                          <input
                            id="kiosk-work-proof"
                            type="file"
                            accept="image/*,video/*"
                            onChange={handleWorkProofChange}
                            className="hidden"
                          />
                          <label
                            htmlFor="kiosk-work-proof"
                            className="block w-full cursor-pointer rounded-xl border-2 border-dashed border-slate-300 py-3.5 text-center text-sm font-semibold text-slate-700"
                          >
                            📷 Add a photo or video of the work
                          </label>
                          <p className="text-xs text-amber-700">
                            Optional -- without it, your head reviews this time out.
                          </p>
                        </>
                      )}
                    </div>
                  )}

                  {/* STEP: selfie */}
                  <div className="space-y-3 rounded-2xl border-2 border-slate-200 p-4">
                    <StepHeader
                      number={selfieStep}
                      title={`Take your selfie to ${isTimeIn ? "time in" : "time out"}`}
                      hint="Face the camera with good light."
                    />
                    <input
                      ref={selfieInputRef}
                      type="file"
                      accept="image/*"
                      capture="user"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                    {photoPreview ? (
                      <div className="relative">
                        <img src={photoPreview} alt="Your selfie" className="max-h-72 w-full rounded-xl object-cover" />
                        <button
                          type="button"
                          onClick={() => selfieInputRef.current?.click()}
                          className="absolute bottom-2 right-2 rounded-full bg-black/70 px-4 py-2 text-sm font-semibold text-white"
                        >
                          Retake
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => selfieInputRef.current?.click()}
                        className="flex w-full flex-col items-center gap-1 rounded-xl bg-slate-900 py-6 text-white active:scale-[0.99]"
                      >
                        <span className="text-3xl">📸</span>
                        <span className="text-lg font-semibold">Open camera</span>
                      </button>
                    )}

                    <p className="text-xs">
                      {locationReady ? (
                        <span className="text-emerald-700">
                          📍 Location found{locationInfo.address ? ` -- ${locationInfo.address.split(",").slice(0, 2).join(",")}` : ""}
                        </span>
                      ) : locationInfo === "error" ? (
                        <span className="text-red-600">
                          📍 Couldn&apos;t get your location. Allow location access, then{" "}
                          <button type="button" onClick={findLocation} className="font-semibold underline">
                            Try again
                          </button>
                        </span>
                      ) : (
                        <span className="text-slate-500">📍 Finding your location…</span>
                      )}
                    </p>
                  </div>

                  {error && (
                    <p className="rounded-xl bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-700">
                      {error}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    className={`w-full rounded-2xl py-5 text-xl font-bold text-white shadow-lg transition disabled:opacity-40 active:scale-[0.99] ${
                      isTimeIn ? "bg-emerald-600" : "bg-blue-600"
                    }`}
                  >
                    {submitting
                      ? "Sending…"
                      : missed
                        ? "Send & Time In"
                        : isTimeIn
                          ? "Time In"
                          : "Time Out"}
                  </button>

                  <button
                    type="button"
                    onClick={resetKiosk}
                    className="w-full py-2 text-sm font-semibold text-slate-500"
                  >
                    Not you? Start over
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
