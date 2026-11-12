import { useState } from "react";
import toast from "react-hot-toast";
import { X } from "lucide-react";
import { setVehicleUnitStatus } from "../../api/adminTripManagement/fleet";

// Fleet Management -> Vehicle List -> Set status. Assigned / In transit
// come from the unit's trips, so only these are set by hand.
const OPTIONS = [
  { key: "available", label: "Available", hint: "Free to assign in Trip Dispatch." },
  { key: "breakdown", label: "Breakdown", hint: "Broke down / under repair. Reason required." },
  { key: "maintenance", label: "Maintenance", hint: "Scheduled maintenance." },
  { key: "hold", label: "Hold", hint: "Restricted by fleet/admin for use. Reason required." },
  { key: "retired", label: "Retired", hint: "Not in service any more. Reason required; removed from the active list." },
];
const NEEDS_REASON = ["breakdown", "hold", "retired"];
const HAS_UNTIL = ["breakdown", "maintenance", "hold"];

export default function FleetStatusModal({ unit, onClose, onSaved }) {
  const current = ["breakdown", "maintenance", "hold", "retired"].includes(unit.status)
    ? unit.status
    : "available";
  const [status, setStatus] = useState(current);
  const [reason, setReason] = useState(current === "available" ? "" : unit.status_reason || "");
  const [until, setUntil] = useState(unit.status_until || "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    try {
      setSaving(true);
      const res = await setVehicleUnitStatus(unit.id, {
        status,
        reason: status === "available" ? null : reason.trim(),
        until: HAS_UNTIL.includes(status) ? until : null,
      });
      toast.success(res.message);
      onSaved?.();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to set the status.");
    } finally {
      setSaving(false);
    }
  };

  const blocked = NEEDS_REASON.includes(status) && !reason.trim();

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-2xl border border-border bg-surface text-fg sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-lg font-bold">Set status</h2>
            <p className="text-xs text-fg-subtle">
              {unit.unit_code} · {unit.plate_number}
              {unit.trip_code ? ` · on trip ${unit.trip_code}` : ""}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-fg-muted hover:bg-surface-hover">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div className="space-y-2">
            {OPTIONS.map((o) => (
              <label
                key={o.key}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm ${
                  status === o.key ? "border-primary bg-primary/10" : "border-border hover:bg-surface-hover"
                }`}
              >
                <input
                  type="radio"
                  name="fleet-status"
                  checked={status === o.key}
                  onChange={() => setStatus(o.key)}
                  className="mt-0.5 accent-primary"
                />
                <span>
                  <span className="block font-semibold">{o.label}</span>
                  <span className="text-xs text-fg-subtle">{o.hint}</span>
                </span>
              </label>
            ))}
          </div>
          {status !== "available" && (
            <div>
              <label htmlFor="fleet-reason" className="mb-1 block text-xs font-medium text-fg-subtle">
                Reason{NEEDS_REASON.includes(status) ? "" : " (optional)"}
              </label>
              <textarea
                id="fleet-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={500}
                placeholder="e.g. Clutch problem, at Mandaue motorpool"
                className="min-h-[64px] w-full rounded-xl border border-border bg-background p-3 text-sm"
              />
            </div>
          )}
          {HAS_UNTIL.includes(status) && (
            <div>
              <label htmlFor="fleet-until" className="mb-1 block text-xs font-medium text-fg-subtle">
                Expected back in service (optional)
              </label>
              <input
                id="fleet-until"
                type="date"
                value={until}
                onChange={(e) => setUntil(e.target.value)}
                className="w-full rounded-xl border border-border bg-background p-3 text-sm"
              />
            </div>
          )}
          <p className="text-xs text-fg-subtle">
            Assigned and In transit are set by the unit&apos;s trips. A unit that isn&apos;t
            Available can&apos;t be picked in Trip Dispatch.
          </p>
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <button type="button" onClick={onClose} className="rounded-xl border border-border px-4 py-2 text-sm">
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || blocked}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save status"}
          </button>
        </div>
      </div>
    </div>
  );
}
