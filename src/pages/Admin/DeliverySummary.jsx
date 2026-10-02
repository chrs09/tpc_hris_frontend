import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import api from "../../api/services/api";
import SectionTabs from "../../components/ui/sectionTabs/SectionTabs";
import SearchInput from "../../components/ui/searchInput/SearchInput";
import { matchesSearch } from "../../utils/search";
import { exportDeliverySummaryExcel } from "../../utils/trips/deliverySummaryExcel";

const getErrorMessage = (error) =>
  error.response?.data?.detail || error.message || "Something went wrong.";

const thisMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const longDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

const monthLabel = (month) =>
  new Date(`${month}-01T00:00:00`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

const STATUS_STYLES = {
  Yes: "text-success",
  Absent: "text-danger",
  LEAVE: "text-warning",
};

// Columns of the daily records, same order as the spreadsheet tabs.
const RECORD_COLUMNS = [
  ["Date of Transaction", (r) => longDate(r.date)],
  ["Origin", (r) => r.origin || ""],
  ["Driver", (r) => r.driver || ""],
  ["Stay-In / Pullout", () => ""],
  ["Plate Number", (r) => r.plate || ""],
  ["Type of Truck", (r) => r.truck_type || ""],
  ["Category", (r) => r.categories.join(", ")],
  ["Helper", (r) => r.helpers.join(", ")],
  ["Trip", (r) => r.status],
  ["First Dispatch", (r) => r.first_time || ""],
  ["Last Return", (r) => r.last_time || ""],
  ["Total Trips", (r) => r.trips],
];

// Delivery Summary -- the monthly Coca-Cola delivery report, laid out like
// the "Tytan Prime Coca-Cola Delivery Summary" sheet and built from the
// trips: a Total Trips Summary tab (drivers per truck type, locations,
// daily, and a driver / plate / date lookup) and a records tab per truck
// type. Every driver, location and day is listed, 0s included.
export default function DeliverySummary() {
  const [month, setMonth] = useState(thisMonth());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("summary");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    api
      .get("/admin/delivery-summary", { params: { month } })
      .then((res) => {
        if (cancelled) return;
        setData(res.data);
        setTab("summary");
      })
      .catch((error) => !cancelled && toast.error(getErrorMessage(error)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [month]);

  const changeMonth = (value) => {
    if (!value) return;
    setLoading(true);
    setMonth(value);
  };

  // Driver rows grouped per truck type, like the 6W DS / 10W VAN blocks.
  const driverBlocks = useMemo(
    () =>
      (data?.truck_types || [])
        .map((truck) => ({
          truck,
          rows: data.by_driver.filter((r) => r.truck_type === truck),
        }))
        .filter((block) => block.rows.length),
    [data],
  );

  const [exporting, setExporting] = useState(false);
  const exportExcel = async () => {
    if (!data) return;
    try {
      setExporting(true);
      await exportDeliverySummaryExcel({
        data,
        monthLabel: monthLabel(month),
        driverBlocks,
        recordColumns: RECORD_COLUMNS,
        longDate,
      });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setExporting(false);
    }
  };

  const records = data && tab !== "summary" ? data.records[tab] || [] : [];
  const visibleRecords = records.filter((r) =>
    matchesSearch(search, r.driver, r.origin, r.plate, r.categories, r.helpers, r.status, r.date),
  );

  return (
    <div className="space-y-5">
      <SectionTabs group="Trip Management" />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-fg">Delivery Summary</h1>
          <p className="mt-1 text-sm text-fg-subtle">
            Coca-Cola delivery summary for the month, built from the trips
            (cancelled trips aren&apos;t counted).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="month"
            value={month}
            onChange={(e) => changeMonth(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-fg"
          />
          <button
            type="button"
            onClick={exportExcel}
            disabled={!data || loading || exporting}
            className="rounded-lg bg-success px-4 py-2 text-sm font-semibold text-success-foreground disabled:opacity-50"
          >
            {exporting ? "Exporting..." : "Export Excel"}
          </button>
        </div>
      </div>

      {data && (
        <div className="flex gap-1 overflow-x-auto border-b border-border">
          {[
            ["summary", "Total Trips Summary"],
            ...data.truck_types.map((t) => [t, `${t} Records ${monthLabel(month)}`]),
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setTab(key);
                setSearch("");
              }}
              className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium ${
                tab === key
                  ? "border-primary text-primary"
                  : "border-transparent text-fg-subtle hover:text-fg"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {loading || !data ? (
        <p className="py-10 text-center text-sm text-fg-subtle">Loading...</p>
      ) : tab === "summary" ? (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          {/* DRIVERS */}
          <div className="space-y-4">
            <h2 className="text-center text-lg font-bold text-fg">DRIVERS</h2>
            {driverBlocks.map((block) => (
              <SheetTable
                key={block.truck}
                head={["Count", `Month of ${monthLabel(month)} · Driver`, "Type of Truck", "Total Trips"]}
                rows={block.rows.map((r, i) => [i + 1, r.driver, r.truck_type, r.trips])}
                total={block.rows.reduce((sum, r) => sum + r.trips, 0)}
              />
            ))}
          </div>

          {/* LOCATION + lookup */}
          <div className="space-y-4">
            <h2 className="text-center text-lg font-bold text-fg">LOCATION</h2>
            <SheetTable
              head={[`Month of ${monthLabel(month)} · Location`, "Type of Truck", "Total Trips"]}
              rows={data.by_location.map((r) => [r.location, r.truck_type, r.trips])}
              total={data.total_trips}
            />
            <TripLookup data={data} />
          </div>

          {/* DAILY */}
          <div className="space-y-4">
            <h2 className="text-center text-lg font-bold text-fg">DAILY</h2>
            <SheetTable
              head={[`Month of ${monthLabel(month)} · By Date`, "Location", "Total Trips"]}
              rows={data.by_day.map((r) => [longDate(r.date), r.location, r.trips])}
              total={data.total_trips}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-end">
            <SearchInput value={search} onChange={setSearch} placeholder="Search driver, plate, origin..." />
          </div>
          <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
            <table className="w-full text-sm text-fg">
              <thead className="bg-success/15 text-fg">
                <tr>
                  {RECORD_COLUMNS.map(([title]) => (
                    <th key={title} className="whitespace-nowrap px-3 py-2 text-left font-semibold">
                      {title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleRecords.map((r) => (
                  <tr key={`${r.date}-${r.driver_id}`} className="border-t border-border">
                    {RECORD_COLUMNS.map(([title, get]) => (
                      <td
                        key={title}
                        className={`whitespace-nowrap px-3 py-2 ${
                          title === "Trip" ? `font-semibold ${STATUS_STYLES[r.status] || ""}` : ""
                        }`}
                      >
                        {get(r) === "" ? <span className="text-fg-subtle">--</span> : get(r)}
                      </td>
                    ))}
                  </tr>
                ))}
                {visibleRecords.length === 0 && (
                  <tr>
                    <td colSpan={RECORD_COLUMNS.length} className="px-3 py-8 text-center text-fg-subtle">
                      {records.length ? "No records match." : `No ${tab} trips in ${monthLabel(month)} yet.`}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-fg-subtle">
            {records.length} driver-days · {records.reduce((sum, r) => sum + r.trips, 0)} trips.
            Stay-In / Pullout isn&apos;t recorded in the system yet.
          </p>
        </div>
      )}
    </div>
  );
}

// A summary block styled like the sheet: orange/green header, green total.
const SheetTable = ({ head, rows, total }) => (
  <div className="overflow-hidden rounded-xl border border-border">
    <div className="max-h-[60vh] overflow-y-auto">
      <table className="w-full text-sm text-fg">
        <thead className="sticky top-0">
          <tr>
            {head.map((h, i) => (
              <th
                key={h}
                className={`px-2 py-2 text-center text-xs font-bold text-black ${
                  i === 0 && head[0] === "Count" ? "bg-amber-400" : "bg-green-500"
                }`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-border bg-green-500/10">
              {row.map((cell, j) => (
                <td
                  key={j}
                  className={`px-2 py-1 text-center ${
                    head[0] === "Count" && j === 0 ? "bg-amber-400/80 font-semibold text-black" : ""
                  } ${j === row.length - 1 ? "font-semibold" : ""}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={head.length} className="px-2 py-4 text-center text-fg-subtle">
                --
              </td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr className="bg-green-600 font-bold text-white">
            <td colSpan={head.length - 1} className="px-2 py-1.5 text-right">
              Total
            </td>
            <td className="px-2 py-1.5 text-center">{total}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
);

// The sheet's lookup box: Driver + Plate No. + Date of Transaction ->
// Total Trips.
function TripLookup({ data }) {
  const allRecords = useMemo(
    () => Object.values(data.records || {}).flat(),
    [data],
  );
  const drivers = [...new Set(data.by_driver.map((r) => r.driver))].sort();
  const [driver, setDriver] = useState("");
  const [plate, setPlate] = useState("");
  const [date, setDate] = useState("");

  const plates = [
    ...new Set(allRecords.filter((r) => r.driver === driver && r.plate).map((r) => r.plate)),
  ];
  const matches = allRecords.filter(
    (r) =>
      r.driver === driver &&
      (!plate || r.plate === plate) &&
      (!date || r.date === date),
  );
  const total = driver ? matches.reduce((sum, r) => sum + r.trips, 0) : null;

  const field = "w-full rounded border border-border bg-background px-2 py-1 text-sm text-fg";
  return (
    <div className="rounded-xl border-2 border-fg/40 bg-surface p-3">
      <table className="w-full text-sm text-fg">
        <tbody>
          <tr>
            <td className="w-36 py-1 pr-2 font-medium">Driver:</td>
            <td className="py-1">
              <select
                value={driver}
                onChange={(e) => {
                  setDriver(e.target.value);
                  setPlate("");
                }}
                className={field}
              >
                <option value="">Select driver</option>
                {drivers.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </td>
            <td rowSpan={3} className="w-24 border-l border-border pl-2 text-center">
              <p className="text-xs text-fg-subtle">Total Trips</p>
              <p className="text-2xl font-bold">{total ?? "--"}</p>
            </td>
          </tr>
          <tr>
            <td className="py-1 pr-2 font-medium">Plate No.:</td>
            <td className="py-1">
              <select value={plate} onChange={(e) => setPlate(e.target.value)} className={field}>
                <option value="">Any plate</option>
                {plates.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </td>
          </tr>
          <tr>
            <td className="py-1 pr-2 font-medium">Date of Transaction:</td>
            <td className="py-1">
              <select value={date} onChange={(e) => setDate(e.target.value)} className={field}>
                <option value="">Whole month</option>
                {data.by_day.map((d) => (
                  <option key={d.date} value={d.date}>
                    {longDate(d.date)}
                  </option>
                ))}
              </select>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
