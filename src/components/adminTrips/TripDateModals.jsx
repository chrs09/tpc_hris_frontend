import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { AlertTriangle, CalendarClock, X } from "lucide-react";
import { changeTripDate, checkTripDate } from "../../api/adminTripManagement/tripDate";
import { searchTripsForCategory } from "../../api/adminTripManagement/tripCategory";

// Superadmin: move a trip encoded on the wrong day (or in the wrong order)
// to the right date / start time. Pay, incentives and "Nth trip of the
// day" go by the trip's start time. Refused when the payroll of the old or
// new day is locked. Logged on the trip's Remarks.

const errorText = (error, fallback) => error?.response?.data?.detail || fallback;
const fmtDay = (d) =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "-";
const ordinal = (n) => ({ 1: "1st", 2: "2nd", 3: "3rd" })[n] || `${n}th`;
const todayPH = () => new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
const inputClass =
  "h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-fg focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

function Shell({ title, subtitle, onClose, busy, children, footer }) {
  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}
    >
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-t-2xl border border-border bg-surface text-fg shadow-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <CalendarClock size={16} />
            </span>
            <div>
              <h3 className="text-base font-semibold">{title}</h3>
              {subtitle && <p className="text-xs text-fg-subtle">{subtitle}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="rounded-lg p-1.5 text-fg-muted hover:bg-surface-hover hover:text-fg disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">{children}</div>
        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">{footer}</div>
      </div>
    </div>
  );
}

// trip: { id, trip_code, ticket_no }
export function ChangeTripDateModal({ trip, onClose, onSaved }) {
  const [current, setCurrent] = useState(null); // { old_date, old_time, old_label }
  const [day, setDay] = useState("");
  const [time, setTime] = useState("");
  const [check, setCheck] = useState(null);
  const [checking, setChecking] = useState(false);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  // The trip's date / time now (a check against today gives it back).
  useEffect(() => {
    checkTripDate(trip.id, todayPH())
      .then((res) => {
        setCurrent(res);
        setDay(res.old_date || todayPH());
        setTime(res.old_time || "");
      })
      .catch((error) => {
        toast.error(errorText(error, "Couldn't load this trip."));
        onClose();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.id]);

  const unchanged = current && day === current.old_date && time === current.old_time;

  useEffect(() => {
    if (!current || !day || unchanged) return undefined;
    let alive = true;
    const t = setTimeout(() => {
      setChecking(true);
      checkTripDate(trip.id, day, time)
        .then((row) => alive && setCheck(row))
        .catch((error) => alive && setCheck({ ok: false, problem: errorText(error, "Couldn't check this date.") }))
        .finally(() => alive && setChecking(false));
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [trip.id, day, time, current, unchanged]);

  const shown = unchanged ? null : check;

  const save = async () => {
    try {
      setSaving(true);
      const res = await changeTripDate(trip.id, day, time, reason.trim());
      toast.success(res.message || "Trip date changed.");
      await onSaved?.();
      onClose();
    } catch (error) {
      toast.error(errorText(error, "Couldn't change the date."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Shell
      title="Change Trip Date"
      subtitle={[trip.trip_code, trip.ticket_no].filter(Boolean).join(" · ")}
      onClose={onClose}
      busy={saving}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-fg-muted hover:bg-surface-hover disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || checking || !shown?.ok || !reason.trim()}
            className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
          >
            {saving ? "Saving..." : "Change date"}
          </button>
        </>
      }
    >
      {!current ? (
        <p className="text-sm text-fg-subtle">Loading...</p>
      ) : (
        <>
          <div className="rounded-xl border border-border bg-surface-hover p-3 text-sm">
            <p className="text-xs text-fg-subtle">Encoded as</p>
            <p className="font-semibold">{current.old_label}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="trip-date-day" className="mb-1 block text-sm font-medium">
                Correct date
              </label>
              <input
                id="trip-date-day"
                type="date"
                value={day}
                max={todayPH()}
                onChange={(e) => setDay(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="trip-date-time" className="mb-1 block text-sm font-medium">
                Start time
              </label>
              <input
                id="trip-date-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <p className="-mt-2 text-[11px] text-fg-subtle">
            The start time sets the order: to make it the 1st trip, give it a time before the driver&apos;s
            other trips that day.
          </p>

          {checking && <p className="text-xs text-fg-subtle">Checking...</p>}
          {!checking && shown && !shown.ok && (
            <p className="flex items-start gap-1.5 rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs font-medium text-danger">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {shown.problem}
            </p>
          )}
          {!checking && shown?.ok && (
            <div className="space-y-2">
              <p className="text-sm">
                {current.old_label} → <b className="text-primary">{shown.new_label}</b>
                {shown.nth && (
                  <span className="ml-1.5 rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary">
                    {ordinal(shown.nth)} trip that day
                  </span>
                )}
              </p>
              {shown.order?.length > 1 && (
                <div className="rounded-xl border border-border">
                  <p className="border-b border-border px-3 py-1.5 text-xs font-semibold text-fg-muted">
                    Driver&apos;s trips on {fmtDay(shown.new_date)}
                  </p>
                  {shown.order.map((r) => (
                    <div
                      key={r.id}
                      className={`flex items-center justify-between px-3 py-1.5 text-xs ${r.this ? "bg-primary/5 font-semibold text-primary" : ""}`}
                    >
                      <span>
                        {ordinal(r.nth)} · {r.shipment || r.trip_code}
                        {r.this && " (this trip)"}
                      </span>
                      <span>{r.start}</span>
                    </div>
                  ))}
                </div>
              )}
              {shown.warnings?.map((w) => (
                <p key={w} className="flex items-start gap-1.5 text-xs text-warning">
                  <AlertTriangle size={12} className="mt-0.5 shrink-0" /> {w}
                </p>
              ))}
            </div>
          )}

          <div>
            <label htmlFor="trip-date-reason" className="mb-1 block text-sm font-medium">
              Reason
            </label>
            <input
              id="trip-date-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Done Nov 7, encoded Nov 9"
              className={inputClass}
            />
            <p className="mt-1 text-[11px] text-fg-subtle">Saved on the trip&apos;s Remarks with who changed it.</p>
          </div>

          <p className="rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs text-fg-muted">
            A pay run that&apos;s already generated keeps its saved figures. After this, open that cutoff in
            Payroll and use <b>Edit &amp; regenerate</b>. Trips in a locked payroll can&apos;t be moved.
          </p>
        </>
      )}
    </Shell>
  );
}

// Correction page: find a trip by shipment no. and change its date.
export function FindTripDateModal({ onClose }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState(null);

  useEffect(() => {
    if (q.trim().length < 3) return undefined;
    let alive = true;
    const t = setTimeout(() => {
      setSearching(true);
      searchTripsForCategory(q.trim())
        .then((rows) => alive && setResults(rows || []))
        .catch(() => alive && setResults([]))
        .finally(() => alive && setSearching(false));
    }, 300);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q]);

  const shown = q.trim().length >= 3 ? results : [];

  if (picked) {
    // Back to the search after saving, for the next trip on the list.
    return <ChangeTripDateModal trip={picked} onClose={() => setPicked(null)} onSaved={() => setQ("")} />;
  }

  return (
    <Shell
      title="Change Trip Date"
      subtitle="Superadmin: fix a trip encoded on the wrong day or in the wrong order"
      onClose={onClose}
      footer={
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-fg-muted hover:bg-surface-hover"
        >
          Close
        </button>
      }
    >
      <input
        id="find-trip-date"
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Shipment no., ticket or trip code (3+ characters)"
        className={inputClass}
      />
      {searching && <p className="text-xs text-fg-subtle">Searching...</p>}
      {!searching && q.trim().length >= 3 && shown.length === 0 && (
        <p className="text-sm text-fg-subtle">No trips found.</p>
      )}
      <div className="space-y-2">
        {shown.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setPicked(t)}
            className="flex w-full items-center justify-between gap-3 rounded-xl border border-border p-3 text-left text-sm transition hover:bg-surface-hover"
          >
            <span className="min-w-0">
              <span className="block truncate font-semibold">{t.ticket_no || t.trip_code}</span>
              <span className="block text-xs text-fg-subtle">
                {t.driver || "-"} · {t.trip_code}
              </span>
            </span>
            <span className="shrink-0 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              {fmtDay(t.date)}
            </span>
          </button>
        ))}
      </div>
    </Shell>
  );
}
