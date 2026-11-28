import { MapPin, Truck, Users } from "lucide-react";
import { dateOnly } from "./tripDisplay";

// Driver Trip Management: the trip on the road now -- where it's going,
// how many stops are done, the truck and helpers. Date only.
const STEP_LABEL = {
  ASSIGNED: "Assigned",
  IN_TRANSIT: "On the way",
  ARRIVED: "Arrived at store",
  UNLOADING: "Unloading",
  DELIVERED: "Delivered",
  CHECKIN: "Back at the hub",
};

const ActiveTripCard = ({ activeTrip }) => {
  if (!activeTrip) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-dashed border-border bg-surface p-6 text-sm text-fg-muted">
        <Truck size={20} className="text-fg-subtle" />
        No active trip right now.
      </div>
    );
  }

  const stores = activeTrip.planned_stores || [];
  const total = activeTrip.total_stops ?? stores.length;
  const done = activeTrip.completed_stops ?? stores.filter((s) => s.delivered).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const vehicle = activeTrip.vehicle;
  const helpers = activeTrip.helpers || [];

  return (
    <div className="overflow-hidden rounded-2xl border border-primary/30 bg-surface">
      <div className="flex flex-wrap items-start justify-between gap-3 bg-primary/5 px-5 py-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">On the road</p>
          <p className="truncate text-xl font-bold text-fg">{activeTrip.ticket_no || "-"}</p>
          <p className="text-xs text-fg-subtle">
            {activeTrip.trip_rate_profile?.profile_name || "No category"}
            {activeTrip.start_time ? ` · Started ${dateOnly(activeTrip.start_time)}` : ""}
          </p>
        </div>
        {activeTrip.current_step && (
          <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
            {STEP_LABEL[activeTrip.current_step] || activeTrip.current_step}
          </span>
        )}
      </div>

      <div className="grid gap-4 px-5 py-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <div className="flex items-center justify-between text-xs text-fg-muted">
            <span className="flex items-center gap-1">
              <MapPin size={13} /> Stops
            </span>
            <span className="font-semibold text-fg">
              {done} of {total || "-"} delivered
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-hover">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
          {stores.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {stores.map((s) => (
                <li
                  key={s.store_id}
                  className={`rounded-full px-2.5 py-0.5 text-xs ${
                    s.delivered ? "bg-success/15 text-success" : "bg-surface-hover text-fg-muted"
                  }`}
                >
                  {s.delivered ? "✓ " : ""}
                  {s.store_name || "Store"}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="space-y-2 text-sm">
          <p className="flex items-start gap-2 text-fg">
            <Truck size={15} className="mt-0.5 shrink-0 text-fg-subtle" />
            <span>
              {vehicle ? [vehicle.unit_code, vehicle.plate_number].filter(Boolean).join(" · ") : "No vehicle"}
            </span>
          </p>
          <p className="flex items-start gap-2 text-fg">
            <Users size={15} className="mt-0.5 shrink-0 text-fg-subtle" />
            <span>{helpers.length ? helpers.map((h) => h.name).join(", ") : "No helper"}</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ActiveTripCard;
