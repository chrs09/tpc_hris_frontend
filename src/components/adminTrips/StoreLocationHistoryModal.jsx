import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { MapPin, X } from "lucide-react";
import { getStoreLocationHistory, applySuggestedStoreLocation } from "../../api/adminTripManagement/stores";
import { confirmDialog } from "../ui/dialog/dialogService";

// Customers -> a store's Location history: every change to its
// coordinates (from drivers' unloading photos, an accepted suggestion, or
// an edit), the recent unloading points, and the measured spot when it
// differs from the saved one (backend: app/services/store_location.py).

const pin = (lat, lng) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
const coords = (lat, lng) =>
  lat == null || lng == null ? "--" : `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`;
const SOURCE_STYLES = {
  AUTO_FIRST: "bg-primary/15 text-primary",
  AUTO_CONSENSUS: "bg-success/15 text-success",
  SUGGESTION_ACCEPTED: "bg-warning/15 text-warning",
  MANUAL: "bg-surface-active text-fg-muted",
};

export default function StoreLocationHistoryModal({ store, canEdit, onClose, onChanged }) {
  const [data, setData] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getStoreLocationHistory(store.id)
      .then((res) => setData(res.data))
      .catch((error) => toast.error(error.response?.data?.detail || "Couldn't load the location history."));
  }, [store.id]);

  const accept = async () => {
    const s = data.suggestion;
    if (
      !(await confirmDialog(
        `Move ${data.name} to the measured spot (${coords(s.lat, s.long)})${
          s.distance_m != null ? `, ${s.distance_m} m from the saved one` : ""
        }?`,
      ))
    ) {
      return;
    }
    try {
      setSaving(true);
      const res = await applySuggestedStoreLocation(store.id);
      setData(res.data);
      toast.success("Store location updated.");
      onChanged?.();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Couldn't update the location.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-border bg-surface text-fg shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">Location history</h2>
            <p className="text-sm text-fg-muted">{store.name}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-fg-muted hover:bg-surface-hover">
            <X size={18} />
          </button>
        </div>

        {!data ? (
          <p className="p-6 text-sm text-fg-subtle">Loading...</p>
        ) : (
          <div className="space-y-5 overflow-y-auto px-5 py-4">
            <div className="rounded-xl bg-surface-hover p-3 text-sm">
              <p className="text-xs text-fg-subtle">Saved location</p>
              {data.latitude != null ? (
                <a
                  href={pin(data.latitude, data.longitude)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                >
                  <MapPin size={14} /> {coords(data.latitude, data.longitude)}
                </a>
              ) : (
                <p className="font-semibold text-warning">No location yet -- set by the first unloading photo.</p>
              )}
              <p className="mt-1 text-xs text-fg-subtle">
                Updated automatically when {data.rules.min_samples}+ unloading photos from{" "}
                {data.rules.min_drivers}+ drivers agree within {data.rules.cluster_radius_m} m. GPS less
                accurate than {data.rules.max_accuracy_m} m is ignored.
              </p>
            </div>

            {data.suggestion && (
              <div className="rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm">
                <p className="font-semibold text-fg">
                  Measured from unloading photos: {coords(data.suggestion.lat, data.suggestion.long)}
                  {data.suggestion.distance_m != null && ` · ${data.suggestion.distance_m} m from saved`}
                </p>
                <p className="mt-0.5 text-xs text-fg-muted">
                  {data.suggestion.samples} photo{data.suggestion.samples === 1 ? "" : "s"} from{" "}
                  {data.suggestion.drivers} driver{data.suggestion.drivers === 1 ? "" : "s"} -- not enough to
                  move it automatically yet.
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <a
                    href={pin(data.suggestion.lat, data.suggestion.long)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    <MapPin size={12} /> Check it in Google Maps
                  </a>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={accept}
                      disabled={saving}
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Use this location"}
                    </button>
                  )}
                </div>
              </div>
            )}

            <div>
              <h3 className="mb-2 text-sm font-semibold">Coordinate changes</h3>
              {data.changes.length === 0 ? (
                <p className="text-xs text-fg-subtle">No changes recorded yet.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full min-w-[620px] text-xs">
                    <thead className="bg-surface-hover text-fg-muted">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">When</th>
                        <th className="px-3 py-2 text-left font-medium">How</th>
                        <th className="px-3 py-2 text-left font-medium">From → To</th>
                        <th className="px-3 py-2 text-left font-medium">Moved</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.changes.map((c) => (
                        <tr key={c.id} className="border-t border-border align-top">
                          <td className="px-3 py-2 whitespace-nowrap text-fg-muted">
                            {c.at}
                            {c.changed_by && <span className="block text-fg-subtle">by {c.changed_by}</span>}
                          </td>
                          <td className="px-3 py-2">
                            <span className={`rounded-full px-2 py-0.5 font-semibold ${SOURCE_STYLES[c.source] || SOURCE_STYLES.MANUAL}`}>
                              {c.source_label}
                            </span>
                            {c.sample_count ? (
                              <span className="mt-1 block text-fg-subtle">
                                {c.sample_count} photo{c.sample_count === 1 ? "" : "s"}, {c.driver_count} driver
                                {c.driver_count === 1 ? "" : "s"}
                              </span>
                            ) : null}
                          </td>
                          <td className="px-3 py-2 text-fg-muted">
                            <span className="line-through">{coords(c.old_latitude, c.old_longitude)}</span>
                            <br />
                            <a
                              href={pin(c.new_latitude, c.new_longitude)}
                              target="_blank"
                              rel="noreferrer"
                              className="font-semibold text-primary hover:underline"
                            >
                              {coords(c.new_latitude, c.new_longitude)}
                            </a>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-fg-muted">
                            {c.distance_m != null ? `${c.distance_m} m` : "first"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold">Recent unloading photos (GPS)</h3>
              {data.points.length === 0 ? (
                <p className="text-xs text-fg-subtle">No unloading photos with GPS yet.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full min-w-[560px] text-xs">
                    <thead className="bg-surface-hover text-fg-muted">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">When</th>
                        <th className="px-3 py-2 text-left font-medium">Driver · trip</th>
                        <th className="px-3 py-2 text-left font-medium">GPS</th>
                        <th className="px-3 py-2 text-left font-medium">From saved spot</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.points.map((p) => (
                        <tr key={p.stop_id} className="border-t border-border">
                          <td className="px-3 py-2 whitespace-nowrap text-fg-muted">{p.at || "--"}</td>
                          <td className="px-3 py-2 text-fg-muted">
                            {p.driver_name || "--"}
                            {p.trip_code ? ` · ${p.trip_code}` : ""}
                          </td>
                          <td className="px-3 py-2">
                            <a href={pin(p.lat, p.long)} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                              {coords(p.lat, p.long)}
                            </a>
                            {p.accuracy_m != null && (
                              <span className={`ml-1 ${p.accuracy_m > data.rules.max_accuracy_m ? "text-danger" : "text-fg-subtle"}`}>
                                ±{Math.round(p.accuracy_m)} m
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-fg-muted">
                            {p.distance_m != null ? `${p.distance_m} m` : "--"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
