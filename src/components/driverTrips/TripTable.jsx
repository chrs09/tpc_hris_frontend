import usePagination from "../../hooks/usePagination";
import Pagination from "../ui/pagination/Pagination";
import StatusPill from "../ui/statusPill/StatusPill";
import { TABLE_HEAD, TABLE_ROW, TABLE_WRAP } from "../ui/table/tableStyles";
import { dateOnly, statusOf } from "./tripDisplay";

// Driver Trip Management: one list of the driver's trips. Dates only (the
// time is still saved); no duration.
const TripTable = ({ trips = [], title, subtitle, emptyText = "No trips here." }) => {
  const { page, setPage, totalPages, paginatedItems } = usePagination(trips, 10);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-fg">
            {title}
            <span className="ml-2 rounded-full bg-surface-active px-2 py-0.5 text-xs font-semibold text-fg-muted">
              {trips.length}
            </span>
          </h2>
          {subtitle && <p className="text-xs text-fg-subtle">{subtitle}</p>}
        </div>
      </div>

      {trips.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center text-sm text-fg-subtle">
          {emptyText}
        </p>
      ) : (
        <>
          {/* Desktop */}
          <div className={`hidden md:block ${TABLE_WRAP}`}>
            <table className="w-full text-sm">
              <thead className={TABLE_HEAD}>
                <tr>
                  <th className="px-4 py-3 text-left">Trip</th>
                  <th className="px-4 py-3 text-left">Deliver to</th>
                  <th className="px-4 py-3 text-left">Vehicle</th>
                  <th className="px-4 py-3 text-left">Helpers</th>
                  <th className="px-4 py-3 text-left">Started</th>
                  <th className="px-4 py-3 text-left">Finished</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((trip) => {
                  const st = statusOf(trip.status);
                  return (
                    <tr key={trip.id} className={`${TABLE_ROW} align-top`}>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-fg">{trip.ticket_no || "-"}</p>
                        <p className="text-xs text-fg-subtle">
                          {trip.trip_code || "-"}
                          {trip.trip_profile ? ` · ${trip.trip_profile}` : ""}
                        </p>
                        {trip.my_role && trip.my_role !== "driver" && (
                          <span className="mt-1 inline-block rounded bg-primary/10 px-1.5 text-[10px] font-semibold capitalize text-primary">
                            {String(trip.my_role).replace("_", " ")}
                          </span>
                        )}
                      </td>
                      <td className="max-w-[16rem] px-4 py-3 text-fg-muted">
                        {(trip.stores || []).length ? trip.stores.join(", ") : "-"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-fg-muted">{trip.vehicle || "-"}</td>
                      <td className="px-4 py-3 text-xs text-fg-muted">
                        {(trip.helpers || []).length
                          ? trip.helpers.map((h) => h.name).join(", ")
                          : "No helper"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 tabular-nums text-fg">{dateOnly(trip.start_time) || "-"}</td>
                      <td className="whitespace-nowrap px-4 py-3 tabular-nums text-fg">{dateOnly(trip.end_time) || "-"}</td>
                      <td className="px-4 py-3">
                        <StatusPill tone={st.tone}>{st.label}</StatusPill>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Phone */}
          <div className="flex flex-col gap-3 md:hidden">
            {paginatedItems.map((trip) => {
              const st = statusOf(trip.status);
              return (
                <div key={trip.id} className="rounded-2xl border border-border bg-surface p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-fg">{trip.ticket_no || "-"}</p>
                      <p className="text-xs text-fg-subtle">
                        {trip.trip_code || "-"}
                        {trip.trip_profile ? ` · ${trip.trip_profile}` : ""}
                      </p>
                    </div>
                    <StatusPill tone={st.tone}>{st.label}</StatusPill>
                  </div>
                  {(trip.stores || []).length > 0 && (
                    <p className="mt-2 text-sm text-fg-muted">{trip.stores.join(", ")}</p>
                  )}
                  <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3 text-sm">
                    <div>
                      <span className="block text-xs text-fg-subtle">Started</span>
                      {dateOnly(trip.start_time) || "-"}
                    </div>
                    <div>
                      <span className="block text-xs text-fg-subtle">Finished</span>
                      {dateOnly(trip.end_time) || "-"}
                    </div>
                    <div>
                      <span className="block text-xs text-fg-subtle">Vehicle</span>
                      {trip.vehicle || "-"}
                    </div>
                    <div>
                      <span className="block text-xs text-fg-subtle">Helpers</span>
                      {(trip.helpers || []).length ? trip.helpers.map((h) => h.name).join(", ") : "No helper"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}
    </section>
  );
};

export default TripTable;
