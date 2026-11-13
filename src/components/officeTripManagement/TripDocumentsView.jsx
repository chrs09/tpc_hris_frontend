import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import SearchSelect from "../SearchSelect";
import { getTripDocuments } from "../../api/officeTripManagement/trip";

// Trip Document -> All Trips: every trip in the period with its document
// status (worked out on the backend: get_trip_documents in
// app/api/office/trips.py), who's responsible for it now, and filters for
// shipment, driver and period covered.

const STATUS_STYLES = {
  assigned: "bg-surface-active text-fg-muted",
  delivered: "bg-primary/15 text-primary",
  submitted: "bg-primary/15 text-primary",
  pending: "bg-warning/20 text-warning",
  returned: "bg-danger/15 text-danger",
  verified: "bg-success/15 text-success",
  cleared: "bg-success/25 text-success",
  blocked: "bg-danger/25 text-danger",
  cancelled: "bg-surface-active text-fg-subtle",
};

const pad = (n) => String(n).padStart(2, "0");
const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
// Default period: the last 30 days, so trips from the end of last month
// (still being reviewed) don't drop out on the 1st.
const thirtyDaysAgo = () => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return isoDate(d);
};

const inputStyles =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30";

export default function TripDocumentsView() {
  const [dateFrom, setDateFrom] = useState(thirtyDaysAgo);
  const [dateTo, setDateTo] = useState(() => isoDate(new Date()));
  const [shipment, setShipment] = useState("");
  const [query, setQuery] = useState("");
  const [driverId, setDriverId] = useState(null);
  const [status, setStatus] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Shipment search: wait until typing pauses.
  useEffect(() => {
    const timer = setTimeout(() => setQuery(shipment.trim()), 350);
    return () => clearTimeout(timer);
  }, [shipment]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await getTripDocuments({
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          q: query || undefined,
        });
        if (!cancelled) setData(res.data);
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.detail || "Failed to load trips.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [dateFrom, dateTo, query]);

  const statuses = data?.statuses || [];
  const trips = useMemo(() => data?.trips || [], [data]);

  const drivers = useMemo(() => {
    const seen = new Map();
    trips.forEach((t) => {
      if (t.driver_id && !seen.has(t.driver_id)) {
        seen.set(t.driver_id, { id: t.driver_id, name: t.driver_name || `Driver #${t.driver_id}` });
      }
    });
    return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [trips]);

  const byDriver = driverId ? trips.filter((t) => t.driver_id === driverId) : trips;
  const counts = useMemo(() => {
    const out = {};
    byDriver.forEach((t) => {
      out[t.status] = (out[t.status] || 0) + 1;
    });
    return out;
  }, [byDriver]);
  const shown = status ? byDriver.filter((t) => t.status === status) : byDriver;

  return (
    <div className="space-y-4">
      {/* FILTERS */}
      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label htmlFor="docs-from" className="mb-1 block text-xs font-medium text-fg-subtle">
            Period from
          </label>
          <input
            id="docs-from"
            type="date"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={(e) => setDateFrom(e.target.value)}
            className={inputStyles}
          />
        </div>
        <div>
          <label htmlFor="docs-to" className="mb-1 block text-xs font-medium text-fg-subtle">
            Period to
          </label>
          <input
            id="docs-to"
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(e) => setDateTo(e.target.value)}
            className={inputStyles}
          />
        </div>
        <div>
          <label htmlFor="docs-shipment" className="mb-1 block text-xs font-medium text-fg-subtle">
            Shipment
          </label>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
            <input
              id="docs-shipment"
              value={shipment}
              onChange={(e) => setShipment(e.target.value)}
              placeholder="Shipment no. or trip code"
              className={`${inputStyles} pl-9`}
            />
          </div>
        </div>
        <div>
          <span className="mb-1 block text-xs font-medium text-fg-subtle">Driver</span>
          <SearchSelect
            value={drivers.find((d) => d.id === driverId) || null}
            options={drivers}
            onChange={(d) => setDriverId(d ? d.id : null)}
            placeholder="All drivers"
            getOptionLabel={(d) => d?.name || ""}
            getOptionValue={(d) => String(d?.id)}
          />
        </div>
      </div>

      {/* STATUS CHIPS: numbered in flow order */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setStatus("")}
          className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
            !status ? "border-primary bg-primary/10 text-primary" : "border-border text-fg-muted hover:bg-surface-hover"
          }`}
        >
          All <span className="tabular-nums">{byDriver.length}</span>
        </button>
        {statuses.map((s) => (
          <button
            key={s.key}
            type="button"
            title={`${s.meaning} · ${s.responsible}`}
            onClick={() => setStatus(status === s.key ? "" : s.key)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
              status === s.key
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-fg-muted hover:bg-surface-hover"
            }`}
          >
            {s.no}. {s.label} <span className="tabular-nums">{counts[s.key] || 0}</span>
          </button>
        ))}
      </div>

      {status && (
        <p className="text-xs text-fg-subtle">
          {statuses.find((s) => s.key === status)?.meaning} · Responsible:{" "}
          {statuses.find((s) => s.key === status)?.responsible}
        </p>
      )}

      {/* TABLE */}
      {loading ? (
        <p className="rounded-2xl border border-border bg-surface p-6 text-sm text-fg-subtle">Loading trips...</p>
      ) : error ? (
        <p className="rounded-2xl border border-danger bg-danger/10 p-6 text-sm text-danger">{error}</p>
      ) : shown.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface p-10 text-center text-sm text-fg-subtle">
          No trips match these filters.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-subtle">
                <th className="px-4 py-3 font-semibold">Trip date</th>
                <th className="px-4 py-3 font-semibold">Shipment</th>
                <th className="px-4 py-3 font-semibold">Driver</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Responsible</th>
                <th className="px-4 py-3 font-semibold">Since</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((t) => (
                <tr key={t.trip_id} className="border-b border-border last:border-0 align-top">
                  <td className="whitespace-nowrap px-4 py-3 text-fg-muted">{t.trip_date || "-"}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-fg">{t.ticket_no || "-"}</p>
                    {t.trip_code && <p className="text-xs text-fg-subtle">{t.trip_code}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-fg">{t.driver_name || "-"}</p>
                    {t.plate_number && <p className="text-xs text-fg-subtle">{t.plate_number}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      title={t.meaning}
                      className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${
                        STATUS_STYLES[t.status] || STATUS_STYLES.cancelled
                      }`}
                    >
                      {t.status_no <= 8 ? `${t.status_no}. ` : ""}
                      {t.status_label}
                    </span>
                    {t.note && <p className="mt-1 max-w-xs text-xs text-fg-subtle">{t.note}</p>}
                  </td>
                  <td className="px-4 py-3 text-fg-muted">{t.responsible}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-fg-muted">
                    {t.since || "-"}
                    {t.hours_waiting != null && (
                      <span
                        className={`block text-xs ${
                          t.status === "pending" ? "font-semibold text-warning" : "text-fg-subtle"
                        }`}
                      >
                        {t.hours_waiting}h waiting
                      </span>
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
