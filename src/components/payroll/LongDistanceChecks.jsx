import { Fragment, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { ChevronDown, ChevronRight } from "lucide-react";
import SearchInput from "../ui/searchInput/SearchInput";
import { matchesSearch } from "../../utils/search";
import { getIncentiveStoreCheck, getIncentiveTripCheck } from "../../api/payroll/incentivePrograms";

// Long Distance checks (Incentive Policies -> Preview):
//   Trip check  -- every completed trip in the period with its level; the
//                  ones earning nothing say why.
//   Store check -- every store: its route-list city, location and trips
//                  this period, with what to fix.
// Backend: app/services/incentives.py (LongDistance).

const peso = (n) =>
  `₱${Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const errorText = (err, fallback) => err.response?.data?.detail || fallback;

const WAITING_LABEL = {
  ASSIGNED: "Assigned",
  ACTIVE: "In progress",
  PENDING_MANUAL_APPROVAL: "Manual entry, waiting",
  PENDING_APPROVAL: "Trip Approvals",
  PENDING_OFFICE_REVIEW: "Trip Document",
  PENDING_FINANCE_REVIEW: "Finance Trips",
};

const Chip = ({ children, tone = "muted" }) => {
  const tones = {
    muted: "bg-surface-hover text-fg-muted",
    ok: "bg-success/15 text-success",
    warn: "bg-warning/15 text-warning",
    bad: "bg-danger/15 text-danger",
    info: "bg-primary/15 text-primary",
  };
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
};

const Toggle = ({ options, value, onChange }) => (
  <div className="flex flex-wrap rounded-lg border border-border p-0.5 text-xs">
    {options.map(([key, label]) => (
      <button
        key={key}
        type="button"
        onClick={() => onChange(key)}
        className={`rounded-md px-2.5 py-1 ${value === key ? "bg-surface-active font-semibold text-fg" : "text-fg-muted"}`}
      >
        {label}
      </button>
    ))}
  </div>
);

const levelText = (row) =>
  row.level_source === "route"
    ? `Route list: ${row.city}`
    : row.level_source === "gps"
      ? `GPS ${row.km} km`
      : "";

// ---------------------------------------------------------------- trips

export function LongDistanceTripCheck({ programId }) {
  const [data, setData] = useState(null);
  const [show, setShow] = useState("all");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getIncentiveTripCheck(programId)
      .then((d) => !cancelled && setData(d))
      .catch((err) => !cancelled && toast.error(errorText(err, "Couldn't load the trip check.")));
    return () => {
      cancelled = true;
    };
  }, [programId]);

  const trips = useMemo(
    () =>
      (data?.trips || []).filter(
        (t) =>
          (show === "all" || (show === "earning" ? t.level > 0 : t.level === 0)) &&
          matchesSearch(search, t.ticket_no, t.driver, ...(t.helpers || []), ...t.stops.map((s) => s.name)),
      ),
    [data, show, search],
  );

  if (!data) return <p className="text-sm text-fg-subtle">Checking trips...</p>;

  const earning = data.trips.filter((t) => t.level > 0).length;
  const waiting = Object.entries(data.waiting || {});
  const waitingTotal = waiting.reduce((sum, [, n]) => sum + n, 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        <Chip>Applies to: {data.applies_to.join(", ") || "nobody"}</Chip>
        <Chip tone={data.route_count ? "muted" : "warn"}>Route list: {data.route_count} cities</Chip>
        <Chip tone={data.use_gps_distance ? "ok" : "warn"}>GPS distance: {data.use_gps_distance ? "on" : "off"}</Chip>
        <Chip tone={data.default_hub ? "muted" : "warn"}>Default hub: {data.default_hub || "not set"}</Chip>
      </div>

      <p className="text-sm text-fg">
        <b>{data.trips.length}</b> completed trip{data.trips.length === 1 ? "" : "s"} in this period ·{" "}
        <b className="text-success">{earning}</b> earning · <b className={data.trips.length - earning ? "text-warning" : ""}>{data.trips.length - earning}</b> earning nothing
      </p>
      {waitingTotal > 0 && (
        <p className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
          {waitingTotal} trip{waitingTotal === 1 ? "" : "s"} in this period aren&apos;t Completed yet and don&apos;t count:{" "}
          {waiting.map(([status, n]) => `${WAITING_LABEL[status] || status} ${n}`).join(" · ")}. Regenerate the run once
          Finance clears them.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Toggle
          options={[
            ["all", "All"],
            ["earning", "Earning"],
            ["zero", "Earning nothing"],
          ]}
          value={show}
          onChange={setShow}
        />
        <SearchInput value={search} onChange={setSearch} placeholder="Ticket, driver, store..." />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-surface-hover text-xs text-fg-subtle">
            <tr>
              <th className="w-6 px-2 py-2" />
              <th className="px-3 py-2">Trip</th>
              <th className="px-3 py-2">Driver / helpers</th>
              <th className="px-3 py-2">Farthest stop</th>
              <th className="px-3 py-2">Level</th>
              <th className="px-3 py-2 text-right">Driver / helper</th>
            </tr>
          </thead>
          <tbody>
            {trips.map((t) => {
              const expanded = open === t.trip_id;
              return (
                <Fragment key={t.trip_id}>
                  <tr
                    className="cursor-pointer border-t border-border hover:bg-surface-hover"
                    onClick={() => setOpen(expanded ? null : t.trip_id)}
                  >
                    <td className="px-2 py-2 text-fg-subtle">
                      {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </td>
                    <td className="px-3 py-2">
                      <p className="font-medium">{t.ticket_no || `Trip #${t.trip_id}`}</p>
                      <p className="text-xs text-fg-subtle">
                        {t.date} · from {t.origin || "—"}
                      </p>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <p className="font-medium text-fg">{t.driver}</p>
                      {!t.driver_linked && <p className="text-warning">Driver login has no employee record -- no line</p>}
                      {t.helpers.length > 0 && <p className="text-fg-subtle">{t.helpers.join(", ")}</p>}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {t.level > 0 ? (
                        <>
                          <p className="font-medium text-fg">{t.farthest_store}</p>
                          <p className="text-fg-subtle">{levelText(t)}</p>
                        </>
                      ) : (
                        <p className="text-warning">{data.reasons[t.reason] || "No level"}</p>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <Chip tone={t.level > 0 ? "ok" : "warn"}>{t.level}</Chip>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right text-xs tabular-nums">
                      {peso(t.driver_amount)} / {peso(t.helper_amount)}
                    </td>
                  </tr>
                  {expanded && (
                    <tr className="bg-surface-hover/50">
                      <td />
                      <td colSpan={5} className="px-3 pb-3 pt-1">
                        <p className="mb-1 text-xs text-fg-subtle">
                          Each stop is measured from the start hub on its own; the farthest (highest level) counts.
                        </p>
                        <ul className="space-y-1 text-xs">
                          {t.stops.map((s, i) => (
                            <li key={`${s.store_id}-${i}`} className="flex flex-wrap items-center gap-x-2">
                              <span className="font-medium text-fg">
                                {i + 1}. {s.name}
                              </span>
                              <Chip tone={s.level > 0 ? "ok" : "muted"}>level {s.level}</Chip>
                              <span className="text-fg-subtle">
                                {s.source === "route"
                                  ? `Route list: ${s.city}`
                                  : s.km != null
                                    ? `GPS ${s.km} km`
                                    : ""}
                                {s.reason ? ` ${data.reasons[s.reason] || s.reason}` : ""}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {trips.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-fg-subtle">
                  {data.trips.length ? "No trips match." : "No completed trips in this period yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- stores

// status -> [label, tone, what to do]
const storeStatus = (row, gpsOn) => {
  switch (row.status) {
    case "ok":
      return ["Ready", "ok", row.is_hub ? "Hub with a location." : `Earns level ${row.level} from the route list.`];
    case "route_no_location":
      return ["No location", "info", "Earns by the route list. Set its location for maps and arrival checks."];
    case "gps_only":
      return gpsOn
        ? ["GPS only", "muted", "City not on the route list -- earns by straight-line distance."]
        : ["Earns nothing", "bad", "City not on the route list and GPS distance is off. Add its city to the route list, or turn GPS on."];
    case "no_city_no_location":
      return ["Earns nothing", "bad", "No route city in its name/address and no location. Add the city to its address, or set its location."];
    case "hub_no_location":
      return ["Hub, no location", "bad", "Distances from this hub can't be measured. Set its location."];
    default:
      return [row.status, "muted", ""];
  }
};

const PROBLEM = (row, gpsOn) =>
  ["no_city_no_location", "hub_no_location"].includes(row.status) || (row.status === "gps_only" && !gpsOn);

export function LongDistanceStoreCheck({ programId }) {
  const [data, setData] = useState(null);
  const [show, setShow] = useState("problems");
  const [onTrips, setOnTrips] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    getIncentiveStoreCheck(programId)
      .then((d) => !cancelled && setData(d))
      .catch((err) => !cancelled && toast.error(errorText(err, "Couldn't load the store check.")));
    return () => {
      cancelled = true;
    };
  }, [programId]);

  const gpsOn = Boolean(data?.use_gps_distance);
  const base = useMemo(() => (data?.stores || []).filter((r) => !onTrips || r.trips > 0 || r.is_hub), [data, onTrips]);
  const counts = useMemo(
    () => ({
      problems: base.filter((r) => PROBLEM(r, gpsOn)).length,
      no_location: base.filter((r) => !r.has_location).length,
      gps_only: base.filter((r) => r.status === "gps_only").length,
      all: base.length,
    }),
    [base, gpsOn],
  );
  const rows = useMemo(
    () =>
      base
        .filter((r) =>
          show === "problems"
            ? PROBLEM(r, gpsOn)
            : show === "no_location"
              ? !r.has_location
              : show === "gps_only"
                ? r.status === "gps_only"
                : true,
        )
        .filter((r) => matchesSearch(search, r.name, r.address, r.area, r.city))
        .sort((a, b) => b.trips - a.trips || a.name.localeCompare(b.name)),
    [base, show, search, gpsOn],
  );

  if (!data) return <p className="text-sm text-fg-subtle">Checking stores...</p>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <Chip tone={data.default_hub ? "muted" : "warn"}>Default hub: {data.default_hub || "not set"}</Chip>
        {data.default_hub && !data.default_hub_has_location && <Chip tone="bad">Default hub has no location</Chip>}
        <Chip tone={gpsOn ? "ok" : "warn"}>GPS distance: {gpsOn ? "on" : "off"}</Chip>
        <Link to="/dashboard/admin/stores" className="ml-auto text-xs font-semibold text-primary hover:underline">
          Edit stores &rarr;
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Toggle
          options={[
            ["problems", `Needs fixing (${counts.problems})`],
            ["no_location", `No location (${counts.no_location})`],
            ["gps_only", `GPS only (${counts.gps_only})`],
            ["all", `All (${counts.all})`],
          ]}
          value={show}
          onChange={setShow}
        />
        <label className="flex items-center gap-2 text-xs text-fg-muted">
          <input type="checkbox" checked={onTrips} onChange={(e) => setOnTrips(e.target.checked)} />
          Only stores on trips this period
        </label>
      </div>
      <SearchInput value={search} onChange={setSearch} placeholder="Store, address, city..." />

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-surface-hover text-xs text-fg-subtle">
            <tr>
              <th className="px-3 py-2">Store</th>
              <th className="px-3 py-2">Route city</th>
              <th className="px-3 py-2">Location</th>
              <th className="px-3 py-2 text-right">Trips</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const [label, tone, todo] = storeStatus(r, gpsOn);
              return (
                <tr key={r.id} className="border-t border-border align-top">
                  <td className="px-3 py-2">
                    <p className="font-medium">
                      {r.name} {r.is_hub && <Chip tone="info">Hub</Chip>}
                    </p>
                    <p className="text-xs text-fg-subtle">{[r.address, r.area].filter(Boolean).join(" · ") || "No address"}</p>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {r.city ? (
                      <>
                        <p className="font-medium text-fg">{r.city}</p>
                        <p className="text-fg-subtle">level {r.level}</p>
                      </>
                    ) : (
                      <span className="text-fg-subtle">{r.is_hub ? "—" : "Not found"}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {r.has_location ? (
                      <span className="text-fg-muted">{r.km_from_hub != null ? `${r.km_from_hub} km from hub` : "Set"}</span>
                    ) : (
                      <span className="text-danger">None (0,0)</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right text-xs tabular-nums">{r.trips}</td>
                  <td className="px-3 py-2 text-xs">
                    <Chip tone={tone}>{label}</Chip>
                    <p className="mt-1 max-w-[16rem] text-fg-subtle">{todo}</p>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-fg-subtle">
                  {show === "problems" ? "Nothing to fix here." : "No stores match."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
