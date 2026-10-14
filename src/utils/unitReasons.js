// Why a driver takes a unit other than their own (Trip Assignment / Edit
// Trip). Same keys as the backend (app/services/vehicle_assignment.py).
export const UNIT_REASONS = [
  { value: "ASSIGNED_UNIT_IN_REPAIR", label: "Assigned unit is under repair" },
  { value: "ASSIGNED_UNIT_BUSY", label: "Assigned unit not loaded / on another trip" },
  { value: "UNIT_DRIVER_ABSENT", label: "The unit's driver is not around (load must go out today)" },
  { value: "NEW_DRIVER", label: "New driver -- no assigned unit yet" },
  { value: "URGENT", label: "Urgent delivery" },
  { value: "OTHER", label: "Other" },
];

export const unitOptionLabel = (unit) => {
  if (!unit) return "";
  const name = unit.plate_number || unit.unit_code || "";
  const owner = unit.assigned_driver_name ? ` · ${unit.assigned_driver_name}` : " · no driver";
  return `${name}${owner}${unit.in_repair ? " · 🔧 In repair" : ""}`;
};

// { ownUnit, needsReason, suggested } for this driver + picked unit.
// allUnits: every unit (with assigned_driver_id / in_repair / is_available).
export const unitCheck = (allUnits, driverId, selectedUnit) => {
  const ownUnit = driverId
    ? allUnits.find((u) => String(u.assigned_driver_id) === String(driverId))
    : null;
  const needsReason = Boolean(
    selectedUnit &&
      (ownUnit ? selectedUnit.id !== ownUnit.id : selectedUnit.assigned_driver_id),
  );
  const suggested = !ownUnit
    ? "NEW_DRIVER"
    : ownUnit.in_repair
      ? "ASSIGNED_UNIT_IN_REPAIR"
      : ownUnit.is_available === false
        ? "ASSIGNED_UNIT_BUSY"
        : "";
  return { ownUnit, needsReason, suggested };
};
