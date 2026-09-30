import React, { useState } from "react";
import toast from "react-hot-toast";
import { cancelAssignedTrip } from "../../api/adminTripManagement/trips";
import { promptDialog } from "../ui/dialog/dialogService";
import usePagination from "../../hooks/usePagination";
import Pagination from "../ui/pagination/Pagination";
import EditAssignedTripModal from "./EditAssignedTripModal";
import { usePageCanEdit } from "../../hooks/usePageCanEdit";
import SearchInput from "../ui/searchInput/SearchInput";
import { matchesSearch } from "../../utils/search";

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

const Detail = ({ label, children }) => (
  <div>
    <p className="text-xs font-medium text-fg-subtle">{label}</p>
    <div className="mt-0.5 text-sm text-fg">{children || "-"}</div>
  </div>
);

// View / Edit / Delete for one row. Edit only while the driver hasn't
// started the trip; Edit and Delete only for people who can edit.
const TripActions = ({ trip, canEditPage, deleting, onView, onEdit, onDelete }) => (
  <div className="inline-flex flex-wrap items-center gap-2">
    <button
      type="button"
      onClick={onView}
      className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-fg hover:bg-surface-hover"
    >
      View
    </button>
    {canEditPage && (
      <button
        type="button"
        onClick={onEdit}
        disabled={!trip.editable}
        title={trip.editable ? undefined : "The driver already started this trip"}
        className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-40"
      >
        Edit
      </button>
    )}
    {canEditPage && (
      <button
        type="button"
        onClick={onDelete}
        disabled={deleting}
        className="rounded-lg border border-danger/30 px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger/10 disabled:opacity-50"
      >
        {deleting ? "Deleting..." : "Delete"}
      </button>
    )}
  </div>
);

// Everything about one assigned trip, with Edit and Delete. Delete
// cancels the trip (vehicle and helpers released, shipment numbers
// freed); it stays in history as Cancelled.
const AssignedTripViewModal = ({
  trip,
  canEditPage,
  deleting,
  onEdit,
  onDelete,
  onClose,
}) => (
  <div
    className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
    onMouseDown={(e) => e.target === e.currentTarget && onClose()}
  >
    <div className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-2xl border border-border bg-surface text-fg sm:rounded-2xl">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="text-lg font-bold">
            {trip.trip_code || `Trip #${trip.id}`}
          </h2>
          <p className="text-xs text-fg-subtle">
            {trip.current_step_label || "Assigned"}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded-lg px-2 py-1 text-xl leading-none text-fg-subtle hover:bg-surface-hover hover:text-fg"
        >
          &times;
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        <div className="grid grid-cols-2 gap-4">
          <Detail label="Driver">{trip.driver_name}</Detail>
          <Detail label="Vehicle">{trip.vehicle_unit}</Detail>
          <Detail label="Trip Category">{trip.trip_profile}</Detail>
          <Detail label="Origin">{trip.origin_store}</Detail>
          <Detail label="Dispatched By">{trip.dispatched_by_name}</Detail>
          <Detail label="Dispatched At">{trip.dispatched_at}</Detail>
        </div>

        <Detail label="Shipment No.">
          {trip.shipment_numbers?.length ? (
            <div className="flex flex-wrap gap-1.5">
              {trip.shipment_numbers.map((number) => (
                <span
                  key={number}
                  className="rounded-full bg-surface-active px-2.5 py-0.5 text-xs font-medium"
                >
                  {number}
                </span>
              ))}
            </div>
          ) : (
            trip.ticket_no
          )}
        </Detail>

        <Detail label="Destination(s)">
          <DestinationSteps destinations={trip.destinations} />
        </Detail>

        <Detail label="Helpers">
          {trip.helpers?.length
            ? trip.helpers.map((helper) => helper.name).join(", ")
            : "None"}
        </Detail>

        {!trip.editable && (
          <p className="rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
            The driver has already started this trip, so it can&apos;t be
            edited anymore.
          </p>
        )}
      </div>

      <div className="flex flex-wrap justify-end gap-2 border-t border-border px-5 py-3">
        {canEditPage && (
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="mr-auto rounded-xl border border-danger/40 px-4 py-2 text-sm font-medium text-danger hover:bg-danger/10 disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-fg-muted hover:bg-surface-hover"
        >
          Close
        </button>
        {canEditPage && trip.editable && (
          <button
            type="button"
            onClick={onEdit}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
          >
            Edit
          </button>
        )}
      </div>
    </div>
  </div>
);

// Trips the coordinator has dispatched but the driver hasn't checked
// out (started) yet -- see GET /admin/trips/assigned.
const AssignedTripsMonitor = ({ trips = [], onChanged }) => {
  const canEditPage = usePageCanEdit();
  const [cancellingId, setCancellingId] = useState(null);
  const [editingTrip, setEditingTrip] = useState(null);
  const [viewingTrip, setViewingTrip] = useState(null);

  // Undoes a dispatch made by mistake -- only offered here because a trip
  // still in this list hasn't been started by the driver yet.
  const handleCancel = async (trip) => {
    const reason = await promptDialog(
      `Delete ${trip.driver_name || "this"}'s trip ${trip.trip_code || ""}? Its vehicle and helpers are released and it's kept in history as Cancelled. Reason (required):`,
    );
    if (reason === null) return;
    if (!reason.trim()) {
      toast.error("A reason is required to delete a trip.");
      return;
    }

    try {
      setCancellingId(trip.id);
      await cancelAssignedTrip(trip.id, reason.trim());
      toast.success("Trip deleted.");
      setViewingTrip(null);
      if (onChanged) await onChanged();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to delete trip.");
    } finally {
      setCancellingId(null);
    }
  };

  const [search, setSearch] = useState("");
  const filteredTrips = trips.filter((trip) =>
    matchesSearch(
      search,
      trip.driver_name,
      trip.trip_code,
      trip.ticket_no,
      trip.vehicle_unit,
      trip.origin_store,
      trip.destinations,
      trip.dispatched_by_name,
    ),
  );
  const { page, setPage, totalPages, paginatedItems } = usePagination(
    filteredTrips,
    10,
  );

  return (
    <>
      <div className="mb-3 flex justify-end">
        <SearchInput value={search} onChange={setSearch} placeholder="Search driver, trip, shipment, store..." />
      </div>
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
                    <TripActions
                      trip={trip}
                      canEditPage={canEditPage}
                      deleting={cancellingId === trip.id}
                      onView={() => setViewingTrip(trip)}
                      onEdit={() => setEditingTrip(trip)}
                      onDelete={() => handleCancel(trip)}
                    />
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

              <div className="mt-3">
                <TripActions
                  trip={trip}
                  canEditPage={canEditPage}
                  deleting={cancellingId === trip.id}
                  onView={() => setViewingTrip(trip)}
                  onEdit={() => setEditingTrip(trip)}
                  onDelete={() => handleCancel(trip)}
                />
              </div>
            </div>
          ))
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      {viewingTrip && (
        <AssignedTripViewModal
          trip={viewingTrip}
          canEditPage={canEditPage}
          deleting={cancellingId === viewingTrip.id}
          onEdit={() => {
            setEditingTrip(viewingTrip);
            setViewingTrip(null);
          }}
          onDelete={() => handleCancel(viewingTrip)}
          onClose={() => setViewingTrip(null)}
        />
      )}

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
