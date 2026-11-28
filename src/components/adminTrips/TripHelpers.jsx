import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Pencil, Users, X } from "lucide-react";
import { getAvailableHelpers } from "../../api/tripManagement";
import { updateTripHelpers } from "../../api/adminTripManagement/trips";

// Trip Dashboard -> the Helpers column, and the pop-up to fix a trip's
// helpers while it's assigned or on the road (coordinators included).

export function HelpersCell({ trip, canEdit = false, onEdit }) {
  const helpers = trip.helpers || [];
  return (
    <div className="flex min-w-[8rem] items-start gap-1.5">
      <div className="min-w-0 flex-1">
        {helpers.length === 0 ? (
          <span className="text-xs text-fg-subtle">No helper</span>
        ) : (
          <ul className="space-y-0.5">
            {helpers.map((h) => (
              <li key={h.id} className="text-xs leading-snug text-fg">
                {h.name.replace(" (Driver as Helper)", "")}
                {h.is_driver && (
                  <span className="ml-1 rounded bg-primary/15 px-1 text-[10px] font-semibold text-primary">
                    Driver
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      {canEdit && (
        <button
          type="button"
          onClick={() => onEdit(trip)}
          title="Edit helpers"
          aria-label="Edit helpers"
          className="shrink-0 rounded-md p-1 text-fg-subtle transition hover:bg-surface-hover hover:text-primary"
        >
          <Pencil size={13} />
        </button>
      )}
    </div>
  );
}

// finished: a trip that's already done (Trip Approval Status) -- helpers
// out on other trips now are still pickable, it's about the past.
export function EditHelpersModal({ trip, onClose, onSaved, finished = false }) {
  const current = trip.helpers || [];
  const [driverAsHelper, setDriverAsHelper] = useState(current.some((h) => h.is_driver));
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(current.map((h) => h.id));
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getAvailableHelpers(trip.driver_id, driverAsHelper)
      .then((list) => {
        if (!alive) return;
        // This trip's own helpers stay pickable (they're busy on it).
        const merged = [...(list || [])].map((o) =>
          finished || current.some((c) => c.id === o.id) ? { ...o, busy_trip: null } : o,
        );
        current.forEach((c) => {
          if (!merged.some((m) => m.id === c.id)) {
            merged.unshift({
              id: c.id,
              first_name: c.name.replace(" (Driver as Helper)", ""),
              last_name: "",
              is_driver: c.is_driver,
            });
          }
        });
        setOptions(merged);
      })
      .catch(() => alive && setOptions(current.map((c) => ({ id: c.id, first_name: c.name, last_name: "" }))))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.driver_id, driverAsHelper]);

  const toggle = (id) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 3 ? prev : [...prev, id],
    );

  const save = async () => {
    try {
      setSaving(true);
      await updateTripHelpers(trip.id, selected, reason);
      toast.success("Helpers updated.");
      await onSaved?.();
      onClose();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Couldn't update the helpers.");
    } finally {
      setSaving(false);
    }
  };

  const unchanged =
    selected.length === current.length && selected.every((id) => current.some((c) => c.id === id));

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && !saving && onClose()}
    >
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-t-2xl border border-border bg-surface text-fg shadow-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users size={16} />
            </span>
            <div>
              <h3 className="text-base font-semibold">Edit Helpers</h3>
              <p className="text-xs text-fg-subtle">
                {trip.trip_code || "Trip"} · {trip.driver_name || trip.username || "driver"} · up to 3
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
            className="rounded-lg p-1.5 text-fg-muted hover:bg-surface-hover hover:text-fg disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">Helpers ({selected.length}/3)</p>
            <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-fg-muted">
              <input
                id="edit-helpers-driver-as-helper"
                type="checkbox"
                checked={driverAsHelper}
                onChange={(e) => setDriverAsHelper(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              Driver as Helper
            </label>
          </div>

          {loading ? (
            <p className="text-sm text-fg-subtle">Loading helpers...</p>
          ) : options.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-fg-subtle">
              No available helpers.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {options.map((o) => {
                const on = selected.includes(o.id);
                const disabled = !on && (selected.length >= 3 || Boolean(o.busy_trip));
                return (
                  <label
                    key={o.id}
                    title={o.busy_trip ? `Out on ${o.busy_trip}` : undefined}
                    className={`flex items-center gap-2 rounded-xl border p-3 text-sm transition ${
                      on ? "border-primary bg-primary/10" : "border-border"
                    } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-surface-hover"}`}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={disabled}
                      onChange={() => toggle(o.id)}
                      className="h-4 w-4 accent-primary"
                    />
                    <span className="min-w-0">
                      <span className="block truncate">
                        {o.first_name} {o.last_name}
                      </span>
                      {o.is_driver && (
                        <span className="block text-[11px] text-primary">
                          Driver{o.busy_trip ? `, on ${o.busy_trip}` : ""}
                        </span>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>
          )}

          {finished && (
            <p className="rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs text-fg-muted">
              This trip is finished. Added helpers get paid for it on the trip&apos;s date (if they have
              attendance that day). A pay run already generated needs <b>Edit &amp; regenerate</b>. Locked
              payrolls can&apos;t be changed.
            </p>
          )}

          <div>
            <label htmlFor="edit-helpers-reason" className="mb-1 block text-sm font-medium">
              Reason (optional)
            </label>
            <input
              id="edit-helpers-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Wrong helper picked at dispatch"
              className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-fg focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <p className="mt-1 text-[11px] text-fg-subtle">Saved in the trip's change log with who changed it.</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
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
            disabled={saving || unchanged}
            className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save helpers"}
          </button>
        </div>
      </div>
    </div>
  );
}

// How the trip was carried out (Trip Details header): the driver's phone,
// a manual entry, or with steps done by the office (Trip Bypass).
const SOURCE_STYLE = {
  app: { label: "Driver App", cls: "bg-surface-active text-fg-muted" },
  manual: { label: "Manual Entry", cls: "bg-warning/15 text-warning" },
  bypass: { label: "Bypass", cls: "bg-danger/15 text-danger" },
};

export function TripSourceBadge({ source, bypassedSteps = [] }) {
  if (!source) return null;
  const meta = SOURCE_STYLE[source] || SOURCE_STYLE.app;
  return (
    <span
      title={
        source === "bypass" && bypassedSteps.length
          ? `Done by the office: ${bypassedSteps.join(", ")}`
          : undefined
      }
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold normal-case ${meta.cls}`}
    >
      {meta.label}
      {source === "bypass" && bypassedSteps.length > 0 && (
        <span className="font-normal opacity-80">· {bypassedSteps.join(", ")}</span>
      )}
    </span>
  );
}
