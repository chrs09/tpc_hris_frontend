import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import SearchSelect from "../SearchSelect";
import { getStores } from "../../api/adminTripManagement/stores";
import { changeTripStore } from "../../api/adminTripManagement/trips";

// Trip Dashboard -> Active Trips -> Change store: the dispatch had a wrong
// store and the driver has already checked out. Swap a stop that isn't
// delivered yet for the right store -- same place in the route, its
// shipment numbers move with it, and the driver's app checks in there
// normally. Logged with the reason. See change_trip_store in
// app/api/admin/trips.py.
export default function ChangeStoreModal({ trip, onClose, onChanged }) {
  const stops = useMemo(() => trip.stops || [], [trip.stops]);
  const open = stops.filter((s) => !s.delivered);
  const [oldStoreId, setOldStoreId] = useState(open.length === 1 ? open[0].store_id : null);
  const [newStore, setNewStore] = useState(null);
  const [reason, setReason] = useState("");
  const [stores, setStores] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getStores()
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res.data) ? res.data : res.data?.items || [];
        setStores(list);
      })
      .catch(() => !cancelled && toast.error("Couldn't load the locations."));
    return () => {
      cancelled = true;
    };
  }, []);

  // Locations not already on this trip.
  const options = useMemo(() => {
    const onTrip = new Set(stops.map((s) => s.store_id));
    return stores
      .filter((s) => !onTrip.has(s.id))
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [stores, stops]);

  const save = async () => {
    if (!oldStoreId || !newStore || !reason.trim()) return;
    try {
      setSaving(true);
      const res = await changeTripStore(trip.id, oldStoreId, newStore.id, reason.trim());
      toast.success(res.data?.message || "Store changed.", { duration: res.data?.note ? 8000 : 4000 });
      await onChanged?.();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to change the store.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && !saving && onClose()}
    >
      <div className="w-full max-w-lg rounded-t-2xl border border-border bg-surface text-fg sm:rounded-2xl">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-lg font-bold">Change store</h2>
          <p className="text-xs text-fg-subtle">
            {trip.trip_code} · {trip.username} · {trip.vehicle_unit}
          </p>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div>
            <p className="mb-1.5 text-xs font-medium text-fg-subtle">Which stop is wrong?</p>
            <div className="space-y-1.5">
              {stops.map((s, i) => (
                <label
                  key={s.store_id}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm ${
                    s.delivered
                      ? "cursor-not-allowed border-border text-fg-subtle"
                      : oldStoreId === s.store_id
                        ? "cursor-pointer border-primary bg-primary/10"
                        : "cursor-pointer border-border hover:bg-surface-hover"
                  }`}
                >
                  <input
                    type="radio"
                    name="old-store"
                    disabled={s.delivered}
                    checked={oldStoreId === s.store_id}
                    onChange={() => setOldStoreId(s.store_id)}
                  />
                  <span className="text-xs tabular-nums text-fg-subtle">{i + 1}.</span>
                  <span className="min-w-0 flex-1 truncate">{s.name}</span>
                  {s.delivered && <span className="text-xs">Delivered</span>}
                </label>
              ))}
            </div>
            {!open.length && (
              <p className="mt-2 text-xs text-warning">
                Every stop is delivered. Use a Correction Request once the trip is finished.
              </p>
            )}
          </div>

          <div>
            <span className="mb-1.5 block text-xs font-medium text-fg-subtle">Correct store</span>
            <SearchSelect
              value={newStore}
              options={options}
              onChange={setNewStore}
              placeholder="Search a location"
              getOptionLabel={(s) => (s ? [s.name, s.area].filter(Boolean).join(" · ") : "")}
              getOptionValue={(s) => String(s?.id)}
            />
          </div>

          <div>
            <label htmlFor="change-store-reason" className="mb-1.5 block text-xs font-medium text-fg-subtle">
              Reason
            </label>
            <textarea
              id="change-store-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="e.g. Wrong outlet picked at dispatch."
              className="w-full rounded-lg border border-border bg-background p-2.5 text-sm text-fg"
            />
          </div>

          <p className="text-xs text-fg-subtle">
            The stop keeps its place in the route and its shipment numbers. The driver&apos;s app
            picks up the new store on its next refresh.
          </p>
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-fg-muted hover:bg-surface-hover"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || !oldStoreId || !newStore || !reason.trim()}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
          >
            {saving ? "Saving..." : "Change store"}
          </button>
        </div>
      </div>
    </div>
  );
}
