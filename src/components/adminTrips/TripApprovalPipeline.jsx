import { useCallback, useEffect, useState } from "react";
import { getApprovalPipeline } from "../../api/adminTripManagement/trips";
import SearchSelect from "../SearchSelect";
import SearchInput from "../ui/searchInput/SearchInput";
import Pagination from "../ui/pagination/Pagination";

const PAGE_SIZE = 15;

const STATUSES = [
  { value: "PENDING_MANUAL_APPROVAL", label: "Pending Superadmin (Manual Entry)", classes: "bg-primary/15 text-primary" },
  { value: "PENDING_APPROVAL", label: "Pending Approval", classes: "bg-warning/15 text-warning" },
  { value: "PENDING_OFFICE_REVIEW", label: "Pending Office Approval", classes: "bg-warning/15 text-warning" },
  { value: "PENDING_FINANCE_REVIEW", label: "Pending Finance Approval", classes: "bg-warning/15 text-warning" },
  { value: "COMPLETED", label: "Approved", classes: "bg-success/15 text-success" },
];

const StatusBadge = ({ trip }) => {
  const meta = STATUSES.find((s) => s.value === trip.status);
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${
        meta?.classes || "bg-surface-active text-fg-muted"
      }`}
    >
      {trip.status_label || meta?.label || trip.status}
    </span>
  );
};

const SourceBadge = ({ manual }) =>
  manual ? (
    <span className="inline-flex whitespace-nowrap rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold text-warning">
      Manual Entry
    </span>
  ) : (
    <span className="inline-flex whitespace-nowrap rounded-full bg-surface-active px-2 py-0.5 text-[10px] font-semibold text-fg-muted">
      Driver App
    </span>
  );

// Trip Dashboard list: every finished trip and where it is in the
// approval chain (coordinator -> office -> finance -> approved), with a
// status filter and search. Filtering and paging run on the server.
const TripApprovalPipeline = ({ refreshKey = 0 }) => {
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0, counts: {} });
  const [loading, setLoading] = useState(true);

  // Search a moment after typing stops, starting again from page 1.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    try {
      const res = await getApprovalPipeline({
        status,
        search: debouncedSearch,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      });
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [status, debouncedSearch, page]);

  // refreshKey: the dashboard's background refresh.
  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const counts = data.counts || {};
  const statusOptions = [
    { value: "", label: "All statuses" },
    ...STATUSES.filter(
      // The manual-entry stage only shows up when something is in it.
      (s) => s.value !== "PENDING_MANUAL_APPROVAL" || counts[s.value],
    ).map((s) => ({ value: s.value, label: s.label })),
  ];
  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="w-full sm:w-72">
          <SearchSelect
            value={statusOptions.find((o) => o.value === status) || statusOptions[0]}
            options={statusOptions}
            onChange={(option) => {
              setStatus(option?.value || "");
              setPage(1);
            }}
            placeholder="Filter by status"
          />
        </div>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search trip, shipment, driver, store..."
        />
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-fg-subtle">Loading...</p>
      ) : data.items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-fg-subtle">
          {debouncedSearch || status ? "No trips match your filters." : "No trips in approval yet."}
        </div>
      ) : (
        <>
          {/* DESKTOP */}
          <div className="hidden overflow-x-auto rounded-xl border border-border bg-surface md:block">
            <table className="w-full text-sm text-fg">
              <thead className="bg-surface-hover text-fg-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Trip Code</th>
                  <th className="px-4 py-3 text-left font-medium">Driver</th>
                  <th className="px-4 py-3 text-left font-medium">Shipment No.</th>
                  <th className="px-4 py-3 text-left font-medium">Stores</th>
                  <th className="px-4 py-3 text-left font-medium">Trip Date</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((trip) => (
                  <tr key={trip.id} className="border-t border-border hover:bg-surface-hover">
                    <td className="px-4 py-3">
                      <div className="font-medium uppercase">{trip.trip_code || `#${trip.id}`}</div>
                      <div className="mt-1">
                        <SourceBadge manual={trip.is_manual_entry} />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{trip.driver_name || "-"}</div>
                      {trip.driver_name !== trip.username && (
                        <div className="text-xs text-fg-subtle">{trip.username}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 uppercase">{trip.ticket_no || "-"}</td>
                    <td className="px-4 py-3">
                      {trip.stores?.length ? (
                        <ol className="space-y-0.5">
                          {trip.stores.map((name, index) => (
                            <li key={`${name}-${index}`}>
                              <span className="text-xs text-fg-subtle">{index + 1}.</span> {name}
                            </li>
                          ))}
                        </ol>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-3 text-fg-muted">
                      <div>{trip.start_time || "-"}</div>
                      {trip.end_time && (
                        <div className="text-xs text-fg-subtle">to {trip.end_time}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge trip={trip} />
                      {trip.returned && (
                        <div className="mt-1 text-[11px] font-semibold text-danger">
                          Sent back by Office
                        </div>
                      )}
                      {trip.status_since && (
                        <div className="mt-1 text-[11px] text-fg-subtle">since {trip.status_since}</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* MOBILE */}
          <div className="flex flex-col gap-3 md:hidden">
            {data.items.map((trip) => (
              <div key={trip.id} className="rounded-xl border border-border bg-surface p-4 text-sm text-fg">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold uppercase">{trip.trip_code || `#${trip.id}`}</p>
                    <p className="text-xs text-fg-subtle">{trip.driver_name || trip.username}</p>
                  </div>
                  <StatusBadge trip={trip} />
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <SourceBadge manual={trip.is_manual_entry} />
                  {trip.returned && (
                    <span className="rounded-full bg-danger/15 px-2 py-0.5 text-[10px] font-semibold text-danger">
                      Sent back by Office
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs text-fg-muted">Shipment: {trip.ticket_no || "-"}</p>
                <p className="mt-1 text-xs text-fg-muted">
                  {trip.stores?.length ? trip.stores.join(" → ") : "-"}
                </p>
                <p className="mt-1 text-xs text-fg-subtle">
                  {trip.start_time}
                  {trip.status_since && ` · status since ${trip.status_since}`}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-3 text-xs text-fg-subtle">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, data.total)} of {data.total}
          </p>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}
    </div>
  );
};

export default TripApprovalPipeline;
