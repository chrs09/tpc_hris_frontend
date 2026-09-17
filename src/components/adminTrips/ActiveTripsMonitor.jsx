import React, { useState } from "react";
import TripGpsLogsModal from "./TripGpsLogsModal";
import usePagination from "../../hooks/usePagination";
import Pagination from "../ui/pagination/Pagination";

// Badge color per current_step -- mirrors CURRENT_STEP_LABELS in
// app/api/admin/trips.py so the live status a driver's own button tap
// triggers (Checkout, Arrived, Unloading, Delivered, Checkin) reads at
// a glance here.
const STEP_BADGE_STYLES = {
  ASSIGNED: "bg-surface-active text-fg-muted",
  IN_TRANSIT: "bg-primary/15 text-primary",
  ARRIVED: "bg-warning/15 text-warning",
  UNLOADING: "bg-warning/15 text-warning",
  DELIVERED: "bg-success/15 text-success",
  RETURNING: "bg-primary/15 text-primary",
  CHECKIN: "bg-success/15 text-success",
};

const StepBadge = ({ step, label }) => (
  <span
    className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${
      STEP_BADGE_STYLES[step] || "bg-surface-active text-fg-muted"
    }`}
  >
    {label || step || "-"}
  </span>
);

const ActiveTripsMonitor = ({ trips = [] }) => {
  const [selectedTripId, setSelectedTripId] = useState(null);
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
              <th className="px-4 py-3 text-left font-medium">Ticket</th>
              <th className="px-4 py-3 text-left font-medium">Started</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Current Stop</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>

          <tbody>
            {trips.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-6 text-fg-subtle">
                  No active trips
                </td>
              </tr>
            ) : (
              paginatedItems.map((trip) => (
                <tr
                  key={trip.id}
                  className="border-t border-border hover:bg-surface-hover"
                >
                  <td className="px-4 py-4 capitalize">
                    {trip.username}
                    {trip.started_outside_hub_range && (
                      <span
                        title="Started outside any hub's GPS range"
                        className="ml-2 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold normal-case text-warning"
                      >
                        ⚠ Outside Hub
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4 uppercase">{trip.trip_code || "-"}</td>
                  <td className="px-4 py-4 capitalize">{trip.ticket_no}</td>
                  <td className="px-4 py-4">
                    {new Date(trip.start_time).toLocaleString()}
                  </td>
                  <td className="px-4 py-4">
                    <StepBadge
                      step={trip.current_step}
                      label={trip.current_step_label}
                    />
                    {trip.total_stops != null && (
                      <span className="ml-2 text-xs text-fg-subtle">
                        {trip.completed_stops ?? 0}/{trip.total_stops} stops
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4">{trip.current_stop || "-"}</td>
                  <td className="px-4 py-4 text-right">
                    <button
                      onClick={() => setSelectedTripId(trip.id)}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-fg-muted transition hover:bg-surface-hover"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MOBILE CARDS */}
      <div className="md:hidden flex flex-col gap-3">
        {trips.length === 0 ? (
          <div className="text-center text-fg-subtle py-6">No active trips</div>
        ) : (
          paginatedItems.map((trip) => (
            <div
              key={trip.id}
              className="bg-surface border border-border text-fg p-4 rounded-xl"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold capitalize">
                  {trip.username}
                  {trip.started_outside_hub_range && (
                    <span
                      title="Started outside any hub's GPS range"
                      className="ml-2 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold normal-case text-warning"
                    >
                      ⚠ Outside Hub
                    </span>
                  )}
                </p>
                <button
                  onClick={() => setSelectedTripId(trip.id)}
                  className="shrink-0 rounded-lg border border-border px-3 py-1 text-xs font-medium text-fg-muted transition hover:bg-surface-hover"
                >
                  View
                </button>
              </div>

              <div className="text-sm mt-2">
                <span className="text-fg-muted block">Trip Code</span>
                {trip.trip_code || "-"}
              </div>

              <div className="text-sm mt-2">
                <span className="text-fg-muted block capitalize">Ticket</span>
                {trip.ticket_no}
              </div>

              <div className="mt-2 text-sm">
                <span className="text-fg-muted block">Started</span>
                {new Date(trip.start_time).toLocaleString()}
              </div>

              <div className="mt-2 flex items-center gap-2 text-sm">
                <StepBadge
                  step={trip.current_step}
                  label={trip.current_step_label}
                />
                {trip.total_stops != null && (
                  <span className="text-xs text-fg-subtle">
                    {trip.completed_stops ?? 0}/{trip.total_stops} stops
                  </span>
                )}
              </div>

              <div className="mt-2 text-sm">
                <span className="text-fg-muted block">Current Stop</span>
                {trip.current_stop || "-"}
              </div>
            </div>
          ))
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      {selectedTripId && (
        <TripGpsLogsModal
          tripId={selectedTripId}
          onClose={() => setSelectedTripId(null)}
        />
      )}
    </>
  );
};

export default ActiveTripsMonitor;
