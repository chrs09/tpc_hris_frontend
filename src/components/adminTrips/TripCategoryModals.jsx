import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { AlertTriangle, Tags, X } from "lucide-react";
import { getActiveRateProfiles } from "../../api/adminTripManagement/tripMaintenance";
import {
  changeTripCategory,
  checkTripCategory,
  moveStoreTrips,
  previewStoreTrips,
  searchTripsForCategory,
} from "../../api/adminTripManagement/tripCategory";

// Change a trip's category after the fact. A trip keeps the category its
// store had when the trip was made; these fix it on purpose. Trips in a
// locked payroll, or a category with no rate for the trip's truck, are
// refused. Every change is logged on the trip. A pay run already
// generated keeps its figures until it's regenerated.

const errorText = (error, fallback) => error?.response?.data?.detail || fallback;
const peso = (n) => `₱${Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
const fmtDay = (d) =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "-";

function Shell({ title, subtitle, onClose, busy, children, footer, wide = false }) {
  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}
    >
      <div
        className={`flex max-h-[90vh] w-full flex-col rounded-t-2xl border border-border bg-surface text-fg shadow-2xl sm:rounded-2xl ${
          wide ? "max-w-3xl" : "max-w-lg"
        }`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Tags size={16} />
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

const PayRunNote = () => (
  <p className="rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs text-fg-muted">
    A pay run that&apos;s already generated keeps its saved figures. After this, open that cutoff in
    Payroll and use <b>Edit &amp; regenerate</b> so the new rate shows. Trips in a locked payroll are
    never changed.
  </p>
);

const ReasonInput = ({ id, value, onChange }) => (
  <div>
    <label htmlFor={id} className="mb-1 block text-sm font-medium">
      Reason (optional)
    </label>
    <input
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="e.g. Store moved from PUP to WS"
      className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-fg focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
    />
    <p className="mt-1 text-[11px] text-fg-subtle">Saved on the trip&apos;s Remarks with who changed it.</p>
  </div>
);

// One trip (trip details / Correction page).
// trip: { id, trip_code, ticket_no, category, category_id }
export function ChangeTripCategoryModal({ trip, onClose, onSaved }) {
  const [profiles, setProfiles] = useState([]);
  const [profileId, setProfileId] = useState("");
  const [check, setCheck] = useState(null);
  const [checking, setChecking] = useState(false);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getActiveRateProfiles()
      .then((res) => setProfiles(Array.isArray(res) ? res : res?.data || []))
      .catch(() => setProfiles([]));
  }, []);

  useEffect(() => {
    if (!profileId) {
      setCheck(null);
      return undefined;
    }
    let alive = true;
    setChecking(true);
    checkTripCategory(trip.id, profileId)
      .then((row) => alive && setCheck(row))
      .catch((error) => alive && setCheck({ ok: false, problem: errorText(error, "Couldn't check this category.") }))
      .finally(() => alive && setChecking(false));
    return () => {
      alive = false;
    };
  }, [trip.id, profileId]);

  const save = async () => {
    try {
      setSaving(true);
      const res = await changeTripCategory(trip.id, Number(profileId), reason.trim());
      toast.success(res.message || "Trip category changed.");
      await onSaved?.();
      onClose();
    } catch (error) {
      toast.error(errorText(error, "Couldn't change the category."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Shell
      title="Change Trip Category"
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
            disabled={saving || checking || !check?.ok}
            className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
          >
            {saving ? "Saving..." : "Change category"}
          </button>
        </>
      }
    >
      <div className="rounded-xl border border-border bg-surface-hover p-3 text-sm">
        <p className="text-xs text-fg-subtle">Current category</p>
        <p className="font-semibold">{trip.category || "None"}</p>
      </div>

      <div>
        <label htmlFor="trip-category-new" className="mb-1 block text-sm font-medium">
          New category
        </label>
        <select
          id="trip-category-new"
          value={profileId}
          onChange={(e) => setProfileId(e.target.value)}
          className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-fg focus:border-primary focus:outline-none"
        >
          <option value="">Pick a category...</option>
          {profiles
            .filter((p) => p.id !== trip.category_id)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.profile_name || p.code}
              </option>
            ))}
        </select>
        {checking && <p className="mt-1 text-xs text-fg-subtle">Checking...</p>}
        {!checking && check && (
          <p className={`mt-1 text-xs font-medium ${check.ok ? "text-success" : "text-danger"}`}>
            {check.ok ? `Driver 1st-trip rate under this category: ${peso(check.new_rate)}` : check.problem}
          </p>
        )}
      </div>

      <ReasonInput id="trip-category-reason" value={reason} onChange={setReason} />
      <PayRunNote />
    </Shell>
  );
}

// After a store's category changes (Edit Store): move its existing trips.
// store: { id, name }; profileId: the store's new category.
export function StoreTripsCategoryModal({ store, profileId, onClose }) {
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState([]);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    previewStoreTrips(store.id, profileId)
      .then((res) => {
        setData(res);
        setSelected(res.trips.filter((t) => t.ok).map((t) => t.id));
      })
      .catch((error) => {
        toast.error(errorText(error, "Couldn't load this store's trips."));
        onClose();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.id, profileId]);

  const movable = data?.trips.filter((t) => t.ok) || [];
  const toggle = (id) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const save = async () => {
    try {
      setSaving(true);
      const res = await moveStoreTrips(store.id, profileId, selected, reason.trim());
      toast.success(`${res.changed} trip${res.changed === 1 ? "" : "s"} moved to ${data.category}.`);
      if (res.skipped?.length) toast.error(`${res.skipped.length} skipped: ${res.skipped[0].problem}`);
      onClose();
    } catch (error) {
      toast.error(errorText(error, "Couldn't update the trips."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Shell
      wide
      title="Update existing trips?"
      subtitle={`${store.name} is now ${data?.category || "..."}`}
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
            Leave old trips as they are
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || selected.length === 0}
            className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
          >
            {saving ? "Updating..." : `Move ${selected.length} trip${selected.length === 1 ? "" : "s"}`}
          </button>
        </>
      }
    >
      {!data ? (
        <p className="text-sm text-fg-subtle">Loading trips...</p>
      ) : data.trips.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-fg-subtle">
          No existing trips to this store use another category. Nothing to update.
        </p>
      ) : (
        <>
          <p className="text-sm text-fg-muted">
            Trips keep the category the store had when they were made. Tick the trips to move to{" "}
            <b>{data.category}</b>. Greyed-out trips can&apos;t be moved.
          </p>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-surface-hover text-xs text-fg-muted">
                <tr>
                  <th className="px-3 py-2 text-left">
                    <input
                      type="checkbox"
                      aria-label="Select all"
                      checked={movable.length > 0 && selected.length === movable.length}
                      onChange={(e) => setSelected(e.target.checked ? movable.map((t) => t.id) : [])}
                      className="h-4 w-4 accent-primary"
                    />
                  </th>
                  <th className="px-3 py-2 text-left font-semibold">Date</th>
                  <th className="px-3 py-2 text-left font-semibold">Driver</th>
                  <th className="px-3 py-2 text-left font-semibold">Shipment</th>
                  <th className="px-3 py-2 text-left font-semibold">Category</th>
                </tr>
              </thead>
              <tbody>
                {data.trips.map((t) => (
                  <tr key={t.id} className={`border-t border-border ${t.ok ? "" : "opacity-60"}`}>
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        aria-label={`Move trip ${t.trip_code || t.id}`}
                        checked={selected.includes(t.id)}
                        disabled={!t.ok}
                        onChange={() => toggle(t.id)}
                        className="h-4 w-4 accent-primary"
                      />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">{fmtDay(t.date)}</td>
                    <td className="px-3 py-2">{t.driver || "-"}</td>
                    <td className="px-3 py-2">
                      {t.shipment || "-"}
                      <span className="block text-[11px] text-fg-subtle">{t.trip_code}</span>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {t.old_category || "None"} → <b>{t.new_category}</b>
                      {t.ok ? (
                        <span className="block text-success">{peso(t.new_rate)} driver 1st trip</span>
                      ) : (
                        <span className="flex items-center gap-1 text-danger">
                          <AlertTriangle size={11} /> {t.problem}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ReasonInput id="store-trips-reason" value={reason} onChange={setReason} />
          <PayRunNote />
        </>
      )}
    </Shell>
  );
}

// Correction page: find any trip (cleared ones too) and change its category.
export function FindTripCategoryModal({ onClose }) {
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
    return <ChangeTripCategoryModal trip={picked} onClose={() => setPicked(null)} onSaved={() => onClose()} />;
  }

  return (
    <Shell
      title="Change Trip Category"
      subtitle="Any trip, even one Finance already cleared, as long as its payroll isn't locked"
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
        id="find-trip-category"
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Shipment no., ticket or trip code (3+ characters)"
        className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-fg focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
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
                {fmtDay(t.date)} · {t.driver || "-"} · {t.trip_code}
              </span>
            </span>
            <span className="shrink-0 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              {t.category || "No category"}
            </span>
          </button>
        ))}
      </div>
    </Shell>
  );
}
