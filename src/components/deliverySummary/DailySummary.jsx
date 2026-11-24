import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import api from "../../api/services/api";
import SearchInput from "../ui/searchInput/SearchInput";
import { matchesSearch } from "../../utils/search";

// Delivery Summary -> Daily Summary: every trip dispatched on one day
// (backend: GET /admin/delivery-summary/daily), with Type of Truck and
// Origin Hub filters and previous / next day. Defaults to today.

const phToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });

const shiftDay = (iso, days) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const dayLabel = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

const STATUS_STYLES = {
  Assigned: "bg-surface-active text-fg-muted",
  "On trip": "bg-primary/15 text-primary",
  Delivered: "bg-primary/15 text-primary",
  Returned: "bg-danger/15 text-danger",
  Blocked: "bg-danger/25 text-danger",
  Verified: "bg-success/15 text-success",
  Cleared: "bg-success/25 text-success",
};

const selectStyles =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30";

export default function DailySummary() {
  const today = phToday();
  const [day, setDay] = useState(today);
  const [truck, setTruck] = useState("");
  const [hub, setHub] = useState("");
  const [search, setSearch] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    api
      .get("/admin/delivery-summary/daily", { params: { day } })
      .then((res) => {
        if (cancelled) return;
        setData(res.data);
        setError("");
      })
      .catch((err) => !cancelled && setError(err.response?.data?.detail || "Failed to load the day's trips."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [day]);

  const goTo = (next) => {
    if (!next || next === day || next > today) return;
    setLoading(true);
    setDay(next);
  };

  const trips = useMemo(() => data?.trips || [], [data]);
  const shown = trips.filter(
    (t) =>
      (!truck || t.truck_type === truck) &&
      (!hub || t.origin === hub) &&
      matchesSearch(search, t.shipment, t.trip_code, t.driver, t.plate, t.helpers, t.outlets),
  );

  // Counts per truck type for what's shown.
  const perTruck = {};
  shown.forEach((t) => {
    perTruck[t.truck_type] = (perTruck[t.truck_type] || 0) + 1;
  });

  return (
    <div className="space-y-4">
      {/* DAY + FILTERS */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-surface p-4">
        <div>
          <span className="mb-1 block text-xs font-medium text-fg-subtle">Date</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => goTo(shiftDay(day, -1))}
              title="Previous day"
              aria-label="Previous day"
              className="rounded-lg border border-border p-2 text-fg-muted hover:bg-surface-hover"
            >
              <ChevronLeft size={16} />
            </button>
            <input
              type="date"
              value={day}
              max={today}
              onChange={(e) => goTo(e.target.value)}
              className={selectStyles}
            />
            <button
              type="button"
              onClick={() => goTo(shiftDay(day, 1))}
              disabled={day >= today}
              title="Next day"
              aria-label="Next day"
              className="rounded-lg border border-border p-2 text-fg-muted hover:bg-surface-hover disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
            {day !== today && (
              <button
                type="button"
                onClick={() => goTo(today)}
                className="ml-1 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-primary hover:bg-surface-hover"
              >
                Today
              </button>
            )}
          </div>
        </div>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-fg-subtle">Type of Truck</span>
          <select value={truck} onChange={(e) => setTruck(e.target.value)} className={selectStyles}>
            <option value="">All truck types</option>
            {(data?.truck_types || []).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-fg-subtle">Origin Hub</span>
          <select value={hub} onChange={(e) => setHub(e.target.value)} className={selectStyles}>
            <option value="">All hubs</option>
            {(data?.hubs || []).map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </label>
        <div className="ml-auto">
          <SearchInput value={search} onChange={setSearch} placeholder="Search shipment, driver, outlet..." />
        </div>
      </div>

      {/* HEADLINE */}
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-2 text-lg font-bold text-fg">{dayLabel(day)}</h2>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          {shown.length} trip{shown.length === 1 ? "" : "s"}
          {shown.length !== trips.length ? ` of ${trips.length}` : ""}
        </span>
        {Object.entries(perTruck).map(([t, n]) => (
          <span key={t} className="rounded-full border border-border px-3 py-1 text-xs text-fg-muted">
            {t} <b className="tabular-nums text-fg">{n}</b>
          </span>
        ))}
      </div>

      {/* TABLE */}
      {loading ? (
        <p className="py-10 text-center text-sm text-fg-subtle">Loading...</p>
      ) : error ? (
        <p className="rounded-2xl border border-danger bg-danger/10 p-6 text-sm text-danger">{error}</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full min-w-[1200px] text-sm text-fg">
            <thead className="bg-success/15 text-fg">
              <tr>
                {["#", "Dispatched", "Shipment", "Trip Category", "Driver / helpers", "Plate", "Type of Truck", "Origin Hub", "Outlets", "Status"].map(
                  (h) => (
                    <th key={h} className="whitespace-nowrap px-3 py-2 text-left font-semibold">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {shown.map((t, i) => (
                <tr key={t.trip_id} className="border-t border-border align-top">
                  <td className="px-3 py-2 tabular-nums text-fg-subtle">{i + 1}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {t.time || "-"}
                    {t.end_time && <span className="block text-xs text-fg-subtle">Back {t.end_time}</span>}
                  </td>
                  <td className="px-3 py-2">
                    <p className="font-medium">{t.shipment || "-"}</p>
                    {t.trip_code && <p className="text-xs text-fg-subtle">{t.trip_code}</p>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">{t.trip_category || "-"}</td>
                  <td className="px-3 py-2">
                    <p>{t.driver || "-"}</p>
                    {t.helpers.length > 0 && (
                      <p className="max-w-xs text-xs text-fg-muted">Helper: {t.helpers.join(", ")}</p>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">{t.plate || "-"}</td>
                  <td className="whitespace-nowrap px-3 py-2">{t.truck_type}</td>
                  <td className="px-3 py-2">{t.origin || "-"}</td>
                  <td className="px-3 py-2">
                    {t.outlets.length ? (
                      <ul className="max-w-[240px] space-y-0.5 text-xs text-fg-muted">
                        {t.outlets.map((name, j) => (
                          <li key={`${name}-${j}`}>
                            {t.outlets.length > 1 && <span className="text-fg-subtle">{j + 1}. </span>}
                            {name}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-fg-subtle">-</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        STATUS_STYLES[t.status] || "bg-surface-active text-fg-muted"
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
              {shown.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-3 py-10 text-center text-fg-subtle">
                    {trips.length ? "No trips match these filters." : "No trips dispatched this day."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
