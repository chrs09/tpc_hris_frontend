import { useEffect, useState } from "react";
import { getTruckUtilization } from "../../api/adminTripManagement/fleet";
import UnitStatusBadge from "./UnitStatusBadge";

// Fleet Management -> Truck Utilization: per truck for a period -- trips,
// days used, hours on trips, downtime (breakdown / maintenance / hold /
// repairs), idle days, and utilization = days used / days in service.
const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const monthStart = () => {
  const d = new Date();
  return iso(new Date(d.getFullYear(), d.getMonth(), 1));
};
const inputStyles =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30";

const Bar = ({ value }) => (
  <div className="flex items-center gap-2">
    <div className="h-2 w-24 overflow-hidden rounded-full bg-surface-hover">
      <div
        className={`h-full rounded-full ${value >= 70 ? "bg-success" : value >= 40 ? "bg-warning" : "bg-danger"}`}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
    <span className="w-12 text-right tabular-nums">{value.toFixed(1)}%</span>
  </div>
);

export default function TruckUtilization() {
  const [dateFrom, setDateFrom] = useState(monthStart);
  const [dateTo, setDateTo] = useState(() => iso(new Date()));
  const [truckType, setTruckType] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!dateFrom || !dateTo) return undefined;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await getTruckUtilization(dateFrom, dateTo);
        if (!cancelled) setData(res);
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.detail || "Failed to load utilization.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [dateFrom, dateTo]);

  const units = (data?.units || []).filter((u) => !truckType || (u.truck_type || "No truck type") === truckType);
  const summary = truckType
    ? data?.by_truck_type.find((t) => t.truck_type === truckType)
    : data?.summary;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-surface p-4">
        <div className="w-40">
          <label htmlFor="util-from" className="mb-1 block text-xs font-medium text-fg-subtle">From</label>
          <input id="util-from" type="date" value={dateFrom} max={dateTo} onChange={(e) => setDateFrom(e.target.value)} className={inputStyles} />
        </div>
        <div className="w-40">
          <label htmlFor="util-to" className="mb-1 block text-xs font-medium text-fg-subtle">To</label>
          <input id="util-to" type="date" value={dateTo} min={dateFrom} onChange={(e) => setDateTo(e.target.value)} className={inputStyles} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["", ...(data?.by_truck_type || []).map((t) => t.truck_type)].map((t) => (
            <button
              key={t || "all"}
              type="button"
              onClick={() => setTruckType(t)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                truckType === t ? "border-primary bg-primary/10 text-primary" : "border-border text-fg-muted hover:bg-surface-hover"
              }`}
            >
              {t || "All types"}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p className="rounded-2xl border border-danger bg-danger/10 p-4 text-sm text-danger">{error}</p>
      ) : loading && !data ? (
        <p className="rounded-2xl border border-border bg-surface p-6 text-sm text-fg-subtle">Loading utilization...</p>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {[
              ["Utilization", `${(summary?.utilization ?? 0).toFixed(1)}%`],
              ["Trucks", summary?.trucks ?? 0],
              ["Trips", summary?.trips ?? 0],
              ["Downtime days", summary?.downtime_days ?? 0],
              ["Idle days", summary?.idle_days ?? 0],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-border bg-surface p-4">
                <p className="text-xs text-fg-subtle">{label}</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-fg">{value}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-fg-subtle">
            {data.period_days} days · Utilization = days a truck went out on a trip ÷ days it was in
            service (period minus breakdown, maintenance, hold and repair days).
          </p>

          <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-surface-hover text-xs uppercase tracking-wide text-fg-subtle">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Truck</th>
                  <th className="px-4 py-3 text-left font-medium">Type</th>
                  <th className="px-4 py-3 text-left font-medium">Now</th>
                  <th className="px-4 py-3 text-right font-medium">Trips</th>
                  <th className="px-4 py-3 text-right font-medium">Days used</th>
                  <th className="px-4 py-3 text-right font-medium">Hours on trips</th>
                  <th className="px-4 py-3 text-right font-medium">Downtime</th>
                  <th className="px-4 py-3 text-right font-medium">Idle</th>
                  <th className="px-4 py-3 text-left font-medium">Utilization</th>
                </tr>
              </thead>
              <tbody>
                {units.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-fg-subtle">No trucks in this period.</td>
                  </tr>
                ) : (
                  units.map((u) => (
                    <tr key={u.vehicle_unit_id} className="border-t border-border">
                      <td className="px-4 py-3">
                        <p className="font-medium text-fg">{u.unit_code}</p>
                        <p className="text-xs text-fg-subtle">{u.plate_number}</p>
                      </td>
                      <td className="px-4 py-3 text-fg-muted">{u.truck_type || "-"}</td>
                      <td className="px-4 py-3"><UnitStatusBadge unit={u} /></td>
                      <td className="px-4 py-3 text-right tabular-nums">{u.trips}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{u.days_used} / {u.days_in_service}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{u.hours_on_trips}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{u.downtime_days}d</td>
                      <td className="px-4 py-3 text-right tabular-nums">{u.idle_days}d</td>
                      <td className="px-4 py-3"><Bar value={u.utilization} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
