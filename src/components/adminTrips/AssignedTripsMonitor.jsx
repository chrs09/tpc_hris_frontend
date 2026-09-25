import React, { useState } from "react";
import toast from "react-hot-toast";
import { cancelAssignedTrip } from "../../api/adminTripManagement/trips";
import { promptDialog } from "../ui/dialog/dialogService";
import usePagination from "../../hooks/usePagination";
import Pagination from "../ui/pagination/Pagination";
import EditAssignedTripModal from "./EditAssignedTripModal";

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
const AssignedTripsMonitor = ({ trips = [], onChanged }) => {
  const [cancellingId, setCancellingId] = useState(null);
  const [editingTrip, setEditingTrip] = useState(null);

  // Undoes a dispatch made by mistake -- only offered here because a trip
  // still in this list hasn't been started by the driver yet.
  const handleCancel = async (trip) => {
    const reason = await promptDialog(
      `Cancel ${trip.driver_name || "this"}'s trip ${trip.trip_code || ""}? Its vehicle and helpers are released. Reason (required):`,
    );
    if (reason === null) return;
    if (!reason.trim()) {
      toast.error("A reason is required to cancel a trip.");
      return;
    }

    try {
      setCancellingId(trip.id);
      await cancelAssignedTrip(trip.id, reason.trim());
      toast.success("Trip cancelled.");
      if (onChanged) await onChanged();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to cancel trip.");
    } finally {
      setCancellingId(null);
    }
  };

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
              <th className="px-4 py-3" />
            </tr>
          </thead>

          <tbody>
            {trips.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center py-6 text-fg-subtle">
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
                  <td className="px-4 py-4 text-right whitespace-nowrap">
                    {trip.editable && (
                      <button
                        onClick={() => setEditingTrip(trip)}
                        className="mr-2 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-fg hover:bg-surface-hover"
                      >
                        Edit
                      </button>
                    )}
                    <button
                      onClick={() => handleCancel(trip)}
                      disabled={cancellingId === trip.id}
                      className="rounded-lg border border-danger/30 px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger/10 disabled:opacity-50"
                    >
                      {cancellingId === trip.id ? "Cancelling..." : "Cancel"}
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

              {trip.editable && (
                <button
                  onClick={() => setEditingTrip(trip)}
                  className="mt-3 mr-2 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-fg hover:bg-surface-hover"
                >
                  Edit trip
                </button>
              )}
              <button
                onClick={() => handleCancel(trip)}
                disabled={cancellingId === trip.id}
                className="mt-3 rounded-lg border border-danger/30 px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger/10 disabled:opacity-50"
              >
                {cancellingId === trip.id ? "Cancelling..." : "Cancel trip"}
              </button>
            </div>
          ))
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      {editingTrip && (
        <EditAssignedTripModal
          trip={editingTrip}
          onClose={() => setEditingTrip(null)}
          onSaved={onChanged}
        />
      )}
    </>
  );
};

export default AssignedTripsMonitor;
