import React from "react";
import usePagination from "../../hooks/usePagination";
import Pagination from "../ui/pagination/Pagination";

// Trips the coordinator has dispatched but the driver hasn't checked
// out (started) yet -- see GET /admin/trips/assigned.
const AssignedTripsMonitor = ({ trips = [] }) => {
  const { page, setPage, totalPages, paginatedItems } = usePagination(
    trips,
    10,
  );

  return (
    <>
      {/* DESKTOP TABLE */}
      <div className="hidden md:block bg-surface border border-border rounded-xl overflow-hidden">
        <table className="w-full text-fg text-sm">
          <thead className="bg-surface-hover text-fg-muted">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Driver</th>
              <th className="px-4 py-3 text-left font-medium">Trip Code</th>
              <th className="px-4 py-3 text-left font-medium">
                Shipment No.
              </th>
              <th className="px-4 py-3 text-left font-medium">Vehicle</th>
              <th className="px-4 py-3 text-left font-medium">
                Destination(s)
              </th>
              <th className="px-4 py-3 text-left font-medium">
                Dispatched At
              </th>
            </tr>
          </thead>

          <tbody>
            {trips.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center py-6 text-fg-subtle">
                  No assigned trips
                </td>
              </tr>
            ) : (
              paginatedItems.map((trip) => (
                <tr
                  key={trip.id}
                  className="border-t border-border hover:bg-surface-hover"
                >
                  <td className="px-4 py-4">{trip.driver_name || "-"}</td>
                  <td className="px-4 py-4 uppercase">
                    {trip.trip_code || "-"}
                  </td>
                  <td className="px-4 py-4">{trip.ticket_no || "-"}</td>
                  <td className="px-4 py-4">{trip.vehicle_unit || "-"}</td>
                  <td className="px-4 py-4">
                    {trip.destinations?.length > 0
                      ? trip.destinations.join(", ")
                      : "-"}
                  </td>
                  <td className="px-4 py-4">{trip.dispatched_at || "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MOBILE CARDS */}
      <div className="md:hidden flex flex-col gap-3">
        {trips.length === 0 ? (
          <div className="text-center text-fg-subtle py-6">
            No assigned trips
          </div>
        ) : (
          paginatedItems.map((trip) => (
            <div
              key={trip.id}
              className="bg-surface border border-border text-fg p-4 rounded-xl"
            >
              <p className="font-semibold">{trip.driver_name || "-"}</p>

              <div className="mt-2 text-sm">
                <span className="text-fg-muted block">Trip Code</span>
                {trip.trip_code || "-"}
              </div>

              <div className="mt-2 text-sm">
                <span className="text-fg-muted block">Shipment No.</span>
                {trip.ticket_no || "-"}
              </div>

              <div className="mt-2 text-sm">
                <span className="text-fg-muted block">Vehicle</span>
                {trip.vehicle_unit || "-"}
              </div>

              <div className="mt-2 text-sm">
                <span className="text-fg-muted block">Destination(s)</span>
                {trip.destinations?.length > 0
                  ? trip.destinations.join(", ")
                  : "-"}
              </div>

              <div className="mt-2 text-sm">
                <span className="text-fg-muted block">Dispatched At</span>
                {trip.dispatched_at || "-"}
              </div>
            </div>
          ))
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </>
  );
};

export default AssignedTripsMonitor;
