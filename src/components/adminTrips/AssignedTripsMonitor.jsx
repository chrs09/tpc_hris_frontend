import React from "react";
import usePagination from "../../hooks/usePagination";
import Pagination from "../ui/pagination/Pagination";

// Renders a trip's planned route as an ordered stop-by-stop chain
// instead of a flat "Store A, Store B, Store C" string, so a
// coordinator can see the intended visiting order at a glance. These
// trips are still ASSIGNED (driver hasn't checked out yet), so every
// stop is shown as "pending" -- no per-store arrival/unload/POD
// status exists yet; that appears once the trip is active (see
// TripGpsLogsModal's Delivery Stops timeline).
const DestinationSteps = ({ destinations }) => {
  if (!destinations?.length) return "-";

  return (
    <ol className="flex flex-wrap items-center gap-1">
      {destinations.map((name, index) => (
        <li key={`${name}-${index}`} className="flex items-center gap-1">
          <span className="inline-flex items-center gap-1 rounded-full bg-surface-active px-2 py-0.5 text-xs font-medium text-fg-muted">
            <span className="text-[10px] text-fg-subtle">{index + 1}.</span>
            {name}
          </span>
          {index < destinations.length - 1 && (
            <span className="text-fg-subtle" aria-hidden="true">
              →
            </span>
          )}
        </li>
      ))}
    </ol>
  );
};

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
                Dispatched By
              </th>
              <th className="px-4 py-3 text-left font-medium">
                Dispatched At
              </th>
            </tr>
          </thead>

          <tbody>
            {trips.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-6 text-fg-subtle">
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
                    <DestinationSteps destinations={trip.destinations} />
                  </td>
                  <td className="px-4 py-4">
                    {trip.dispatched_by_name || "-"}
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
                <span className="text-fg-muted block mb-1">
                  Destination(s)
                </span>
                <DestinationSteps destinations={trip.destinations} />
              </div>

              <div className="mt-2 text-sm">
                <span className="text-fg-muted block">Dispatched By</span>
                {trip.dispatched_by_name || "-"}
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
