import React from "react";
import usePagination from "../../hooks/usePagination";
import Pagination from "../ui/pagination/Pagination";

const calculateDuration = (start, end) => {
  if (!start || !end) return "-";

  const startDate = new Date(start);
  const endDate = new Date(end);

  const diffMs = endDate - startDate;

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  return `${hours}h ${minutes}m`;
};

const TripTable = ({ trips = [], title }) => {
  const { page, setPage, totalPages, paginatedItems: paginatedTrips } =
    usePagination(trips, 2);

  return (
    <div className="mb-10">
      <h2 className="text-lg font-semibold mb-4 text-fg">{title}</h2>

      {/* ================= DESKTOP TABLE ================= */}
      <div className="hidden md:block overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface-hover text-fg-muted">
            <tr>
              <th className="p-3 text-left font-medium">Trip Code</th>
              <th className="p-3 text-left font-medium">Ticket</th>
              <th className="p-3 text-left font-medium">Start</th>
              <th className="p-3 text-left font-medium">End</th>
              <th className="p-3 text-left font-medium">Duration</th>
              <th className="p-3 text-left font-medium">Status</th>
            </tr>
          </thead>

          <tbody>
            {paginatedTrips.map((trip) => (
              <tr key={trip.id} className="border-t border-border bg-surface">
                <td className="p-3 text-fg">{trip.trip_code || "-"}</td>
                <td className="p-3 text-fg">{trip.ticket_no}</td>
                <td className="p-3 text-fg">{trip.start_time}</td>
                <td className="p-3 text-fg">{trip.end_time || "-"}</td>
                <td className="p-3 text-fg">
                  {calculateDuration(trip.start_time, trip.end_time)}
                </td>
                <td className="p-3">
                  <span
                    className={`px-3 py-1 text-xs rounded-full font-semibold
                        ${
                          trip.status === "COMPLETED"
                            ? "bg-success/15 text-success"
                            : "bg-warning/15 text-warning"
                        }`}
                  >
                    {trip.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ================= MOBILE CARDS ================= */}
      <div className="md:hidden flex flex-col gap-3">
        {paginatedTrips.map((trip) => (
          <div
            key={trip.id}
            className="bg-surface border border-border text-fg rounded-xl p-4 shadow-sm"
          >
            <div className="text-sm mb-2">
              <span className="text-fg-muted">Trip Code</span>
              <div className="font-semibold">{trip.trip_code || "-"}</div>
            </div>

            <div className="text-sm mb-2">
              <span className="text-fg-muted">Ticket</span>
              <div className="font-semibold">{trip.ticket_no}</div>
            </div>

            <div className="flex justify-between text-sm mb-2">
              <div>
                <span className="text-fg-muted block">Start</span>
                {trip.start_time}
              </div>

              <div>
                <span className="text-fg-muted block">End</span>
                {trip.end_time || "-"}
              </div>
            </div>

            <div className="text-right">
              <span
                className={`px-3 py-1 text-xs rounded-full font-semibold
                    ${
                      trip.status === "COMPLETED"
                        ? "bg-success/15 text-success"
                        : "bg-warning/15 text-warning"
                    }`}
              >
                {trip.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ================= PAGINATION ================= */}
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
};

export default TripTable;
