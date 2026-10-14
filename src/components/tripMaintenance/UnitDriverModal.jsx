import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import SearchSelect from "../SearchSelect";
import { getUnitDrivers, setUnitDriver } from "../../api/adminTripManagement/tripMaintenance";

// Fleet Management -> Vehicle List: the driver this unit belongs to. One
// driver per unit and one unit per driver -- picking a driver who has
// another unit moves them here. Trip Assignment then picks the unit for
// them automatically.
const NO_DRIVER = { id: "", name: "No assigned driver" };

export default function UnitDriverModal({ unit, onClose, onSaved }) {
  const [drivers, setDrivers] = useState([]);
  const [driverId, setDriverId] = useState(unit.assigned_driver_id || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getUnitDrivers()
      .then(setDrivers)
      .catch(() => toast.error("Couldn't load the drivers."));
  }, []);

  const options = [NO_DRIVER, ...drivers];
  const selected = options.find((d) => String(d.id) === String(driverId)) || NO_DRIVER;
  const otherUnit = selected.unit_id && selected.unit_id !== unit.id ? selected.unit_label : null;
  const label = (d) =>
    d.id === ""
      ? d.name
      : `${d.name}${d.unit_label && d.unit_id !== unit.id ? ` -- has ${d.unit_label}` : ""}`;

  const save = async () => {
    try {
      setSaving(true);
      const res = await setUnitDriver(unit.id, driverId);
      toast.success(
        res.moved_from
          ? `${res.assigned_driver_name} moved from ${res.moved_from} to this unit.`
          : driverId
            ? `${res.assigned_driver_name} assigned.`
            : "Assigned driver removed.",
      );
      onSaved?.();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Couldn't save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 text-fg shadow-xl">
        <h2 className="text-lg font-semibold">Assigned driver</h2>
        <p className="mt-1 text-sm text-fg-muted">
          {unit.unit_code ? `${unit.unit_code} · ` : ""}
          {unit.plate_number}. Trip Assignment picks this unit for the driver
          automatically; using another unit needs a reason.
        </p>
        <div className="mt-4">
          <SearchSelect
            value={selected}
            options={options}
            onChange={(d) => setDriverId(d?.id || "")}
            placeholder="Pick a driver"
            getOptionLabel={label}
            getOptionValue={(d) => d?.id}
          />
          {otherUnit && (
            <p className="mt-2 text-xs text-warning">
              {selected.name} is assigned to {otherUnit} now -- saving moves them to this
              unit, and {otherUnit} will have no driver.
            </p>
          )}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm text-fg-muted hover:bg-surface-hover"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
