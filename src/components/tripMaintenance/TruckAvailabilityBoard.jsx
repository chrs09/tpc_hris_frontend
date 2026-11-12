import { useEffect, useMemo, useState } from "react";
import { getFleetBoard } from "../../api/adminTripManagement/fleet";
import UnitStatusBadge from "./UnitStatusBadge";

// Trip Dispatch: which trucks can be assigned right now. Groups:
// Available / Assigned + In transit / Motorpool (breakdown, maintenance) /
// Not available (hold, retired). Refreshes every 30s.
const GROUP_STYLES = {
  available: "border-success/40 bg-success/10 text-success",
  in_use: "border-primary/40 bg-primary/10 text-primary",
  motorpool: "border-warning/40 bg-warning/10 text-warning",
  not_available: "border-danger/40 bg-danger/10 text-danger",
};

export default function TruckAvailabilityBoard() {
  const [board, setBoard] = useState(null);
  const [group, setGroup] = useState("available");
  const [truckType, setTruckType] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await getFleetBoard();
        if (!cancelled) setBoard(data);
      } catch {
        if (!cancelled) setBoard((prev) => prev);
      }
    };
    load();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 30000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const truckTypes = useMemo(
    () => [...new Set((board?.units || []).map((u) => u.truck_type).filter(Boolean))].sort(),
    [board],
  );
  if (!board) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-4 text-sm text-fg-subtle">
        Loading truck availability...
      </div>
    );
  }

  const byType = truckType ? board.units.filter((u) => u.truck_type === truckType) : board.units;
  const counts = {};
  byType.forEach((u) => {
    counts[u.status_group] = (counts[u.status_group] || 0) + 1;
  });
  if (!truckType) counts.not_available = board.counts.not_available;
  const rows = byType.filter((u) => u.status_group === group);

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-fg">Truck Availability</h2>
          <p className="text-xs text-fg-subtle">
            Live from Fleet Management and trips. Only Available trucks can be dispatched.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["", ...truckTypes].map((t) => (
            <button
              key={t || "all"}
              type="button"
              onClick={() => setTruckType(t)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                truckType === t ? "border-primary bg-primary/10 text-primary" : "border-border text-fg-muted hover:bg-surface-hover"
              }`}
            >
              {t || "All types"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {board.groups.map((g) => (
          <button
            key={g.key}
            type="button"
            onClick={() => setGroup(g.key)}
            className={`rounded-xl border p-3 text-left transition ${GROUP_STYLES[g.key]} ${
              group === g.key ? "ring-2 ring-offset-0 ring-current" : "opacity-90 hover:opacity-100"
            }`}
          >
            <p className="text-2xl font-bold tabular-nums">{counts[g.key] || 0}</p>
            <p className="text-xs font-semibold">{g.label}</p>
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-4 text-center text-sm text-fg-subtle">
          No trucks here{truckType ? ` for ${truckType}` : ""}.
        </p>
      ) : (
        <div className="max-h-64 overflow-auto rounded-xl border border-border">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="sticky top-0 bg-surface-hover text-xs uppercase tracking-wide text-fg-subtle">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Truck</th>
                <th className="px-3 py-2 text-left font-medium">Type</th>
                <th className="px-3 py-2 text-left font-medium">Driver</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} className="border-t border-border">
                  <td className="px-3 py-2">
                    <p className="font-medium text-fg">{u.unit_code}</p>
                    <p className="text-xs text-fg-subtle">{u.plate_number}</p>
                  </td>
                  <td className="px-3 py-2 text-fg-muted">{u.truck_type || "-"}</td>
                  <td className="px-3 py-2 text-fg-muted">{u.assigned_driver_name || "-"}</td>
                  <td className="px-3 py-2">
                    <UnitStatusBadge unit={u} />
                    {(u.status_reason || u.trip_code) && (
                      <p className="mt-1 max-w-xs text-xs text-fg-subtle">
                        {u.trip_code ? `Trip ${u.trip_code}` : u.status_reason}
                        {u.status_until ? ` · back ${u.status_until}` : ""}
                      </p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
