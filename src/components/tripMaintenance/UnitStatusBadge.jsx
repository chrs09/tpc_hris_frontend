// A truck's fleet status (app/services/fleet_status.py): Available,
// Assigned, In transit, Breakdown, Maintenance, Hold or Retired. Units from
// an older payload (no `status`) fall back to In repair / On a trip /
// Available.
const FLEET_STATUS_STYLES = {
  available: "bg-success/15 text-success",
  assigned: "bg-primary/15 text-primary",
  in_transit: "bg-primary/25 text-primary",
  breakdown: "bg-danger/15 text-danger",
  maintenance: "bg-warning/15 text-warning",
  hold: "bg-surface-active text-fg-muted",
  retired: "bg-surface-active text-fg-subtle",
};

export default function UnitStatusBadge({ unit }) {
  let key = unit.status;
  let label = unit.status_label;
  if (!key) {
    key = unit.in_repair ? "maintenance" : unit.is_available === false ? "in_transit" : "available";
    label = unit.in_repair ? "In repair" : unit.is_available === false ? "On a trip" : "Available";
  }
  const detail = [
    unit.status_reason || unit.in_repair?.text,
    unit.trip_code && `Trip ${unit.trip_code}`,
    unit.status_since && `since ${unit.status_since}`,
    unit.status_until && `back ${unit.status_until}`,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <span
      title={detail || undefined}
      className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${
        FLEET_STATUS_STYLES[key] || FLEET_STATUS_STYLES.available
      }`}
    >
      {label}
    </span>
  );
}
