import { useEffect, useMemo, useState } from "react";
import { Eye, Search } from "lucide-react";
import SearchSelect from "../SearchSelect";
import { urlQuery } from "../../utils/search";
import TripDetailsModal from "../adminTrips/TripDetailsModal";
import StatusPill from "../ui/statusPill/StatusPill";
import { TABLE_HEAD, TABLE_ROW, TABLE_WRAP } from "../ui/table/tableStyles";
import { getTripDocuments } from "../../api/officeTripManagement/trip";

// Trip Document -> All Trips: every trip in the period with its document
// status (worked out on the backend: get_trip_documents in
// app/api/office/trips.py), who's responsible for it now, and filters for
// shipment, driver / helper and period covered. View opens the trip's
// details read-only (same window as the Trip Dashboard's View), and the
// trip counter shows how many were each person's 1st, 2nd, 3rd... trip
// of the day.

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

const ordinal = (n) => {
  if (n % 100 >= 11 && n % 100 <= 13) return `${n}th`;
  return `${n}${{ 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th"}`;
};

// Trip counter buckets: 1st, 2nd, 3rd, then 4th and up together.
const COUNTER = [1, 2, 3, 4];
const bucketLabel = (n) => (n === 4 ? "4th+" : ordinal(n));

// One key per person: their employee id, or the driver's user id when the
// driver has no employee record.
const driverKey = (t) => (t.driver_employee_id ? `e${t.driver_employee_id}` : `u${t.driver_id}`);

const inputStyles =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30";

export default function TripDocumentsView() {
  // Opened from a global search result (?q=): that shipment, any date.
  const [dateFrom, setDateFrom] = useState(() => (urlQuery() ? "" : thirtyDaysAgo()));
  const [dateTo, setDateTo] = useState(() => isoDate(new Date()));
  const [shipment, setShipment] = useState(urlQuery);
  const [query, setQuery] = useState(urlQuery);
  const [personKey, setPersonKey] = useState(null);
  const [status, setStatus] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewing, setViewing] = useState(null);

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

  // Everyone on these trips -- drivers and helpers -- for the filter. A
  // helper who also drove (relief driver) shows once as "Driver & helper".
  const people = useMemo(() => {
    const seen = new Map();
    const add = (key, name, role) => {
      const p = seen.get(key) || { key, name, roles: new Set() };
      p.roles.add(role);
      seen.set(key, p);
    };
    trips.forEach((t) => {
      if (t.driver_id) add(driverKey(t), t.driver_name || `Driver #${t.driver_id}`, "Driver");
      (t.helpers || []).forEach((h) => add(`e${h.employee_id}`, h.name, "Helper"));
    });
    return [...seen.values()]
      .map((p) => ({ ...p, role: [...p.roles].sort().join(" & ") }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [trips]);
  const person = people.find((p) => p.key === personKey) || null;

  // Which trip of the day this was -- for the chosen person, else the driver.
  const tripNoOf = (t) => {
    if (!personKey || personKey === driverKey(t)) return t.trip_no;
    const helper = (t.helpers || []).find((h) => `e${h.employee_id}` === personKey);
    return helper ? helper.trip_no : t.trip_no;
  };

  const byPerson = personKey
    ? trips.filter(
        (t) => driverKey(t) === personKey || (t.helpers || []).some((h) => `e${h.employee_id}` === personKey),
      )
    : trips;
  const counts = useMemo(() => {
    const out = {};
    byPerson.forEach((t) => {
      out[t.status] = (out[t.status] || 0) + 1;
    });
    return out;
  }, [byPerson]);
  const shown = status ? byPerson.filter((t) => t.status === status) : byPerson;

  // Trip counter over what's listed (cancelled trips aren't counted).
  const tripCounts = {};
  shown.forEach((t) => {
    const n = tripNoOf(t);
    if (!n || t.status === "cancelled") return;
    const bucket = Math.min(n, 4);
    tripCounts[bucket] = (tripCounts[bucket] || 0) + 1;
  });

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
          <span className="mb-1 block text-xs font-medium text-fg-subtle">Driver / helper</span>
          <SearchSelect
            value={person}
            options={people}
            onChange={(p) => setPersonKey(p ? p.key : null)}
            placeholder="All drivers and helpers"
            getOptionLabel={(p) => (p ? `${p.name} · ${p.role}` : "")}
            getOptionValue={(p) => p?.key}
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
          All <span className="tabular-nums">{byPerson.length}</span>
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

      {/* TRIP COUNTER: 1st / 2nd / 3rd / 4th+ trip of the day */}
      {!loading && !error && (
        <div className="flex flex-wrap items-stretch gap-2">
          {COUNTER.map((n) => (
            <div
              key={n}
              className="min-w-[96px] rounded-xl border border-border bg-surface px-3 py-2"
              title={`Trips that were ${person ? `${person.name}'s` : "the driver's"} ${bucketLabel(n)} trip of the day`}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">{bucketLabel(n)} trip</p>
              <p className="text-lg font-bold tabular-nums text-fg">{tripCounts[n] || 0}</p>
            </div>
          ))}
          <p className="self-center text-xs text-fg-subtle">
            Which trip of the day it was for {person ? person.name : "each driver"}
            {status ? ", in the chosen status" : ""}.
          </p>
        </div>
      )}

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
        <div className={TABLE_WRAP}>
          <table className="w-full min-w-[980px] text-sm">
            <thead className={TABLE_HEAD}>
              <tr className="text-left">
                <th className="px-4 py-3">Trip date</th>
                <th className="px-4 py-3">Shipment</th>
                <th className="px-4 py-3">Trip</th>
                <th className="px-4 py-3">Driver / helpers</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Responsible</th>
                <th className="px-4 py-3">Since</th>
                <th className="px-4 py-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((t) => {
                const tripNo = tripNoOf(t);
                return (
                  <tr key={t.trip_id} className={`${TABLE_ROW} align-top`}>
                    <td className="whitespace-nowrap px-4 py-3 text-fg-muted">{t.trip_date || "-"}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setViewing(t)}
                        className="text-left font-medium text-primary hover:underline"
                        title="View trip details"
                      >
                        {t.ticket_no || t.trip_code || `Trip #${t.trip_id}`}
                      </button>
                      {t.trip_code && t.ticket_no && <p className="text-xs text-fg-subtle">{t.trip_code}</p>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {tripNo ? (
                        <span
                          className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                            tripNo === 1 ? "bg-primary/10 text-primary" : "bg-surface-active text-fg-muted"
                          }`}
                        >
                          {ordinal(tripNo)}
                        </span>
                      ) : (
                        <span className="text-fg-subtle">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-fg">{t.driver_name || "-"}</p>
                      {t.plate_number && <p className="text-xs text-fg-subtle">{t.plate_number}</p>}
                      {(t.helpers || []).length > 0 && (
                        <p className="mt-0.5 max-w-xs text-xs text-fg-muted">
                          Helper: {t.helpers.map((h) => h.name).join(", ")}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill colors={STATUS_STYLES[t.status] || STATUS_STYLES.cancelled} title={t.meaning}>
                        {t.status_no <= 8 ? `${t.status_no}. ` : ""}
                        {t.status_label}
                      </StatusPill>
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
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setViewing(t)}
                        className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-fg-muted hover:bg-surface-hover hover:text-fg"
                      >
                        <Eye size={13} /> View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {viewing && (
        <TripDetailsModal
          trip={{
            id: viewing.trip_id,
            trip_code: viewing.trip_code,
            driver_name: viewing.driver_name,
            status_label: `${viewing.status_label} · ${viewing.responsible}`,
          }}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  );
}
