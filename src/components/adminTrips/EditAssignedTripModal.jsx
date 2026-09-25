import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import SearchSelect from "../SearchSelect";
import {
  getAvailableDrivers,
  updateAssignedTrip,
} from "../../api/adminTripManagement/trips";
import { getStores } from "../../api/adminTripManagement/stores";
import {
  getAvailableHelpers,
  getAvailableVehicleUnits,
} from "../../api/tripManagement";

const getErrorMessage = (error) =>
  error.response?.data?.detail || error.message || "Something went wrong.";

const inputStyles =
  "w-full rounded-xl border border-border bg-background p-3 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30";

// Same caps as the dispatch form / backend (MAX_PLANNED_STOPS,
// MAX_SHIPMENT_NUMBERS).
const MAX_DESTINATION_STORES = 20;
const MAX_SHIPMENT_NUMBERS = 10;

const sameList = (a, b) =>
  a.length === b.length && a.every((value, index) => value === b[index]);

// Corrects a dispatched trip the driver hasn't started yet. Mirrors the
// dispatch form's fields, pre-filled with the trip's current values; the
// trip's own driver / vehicle / helpers are kept selectable even though
// they're "in use" (by this very trip).
export default function EditAssignedTripModal({ trip, onClose, onSaved }) {
  const [drivers, setDrivers] = useState([]);
  const [hubStores, setHubStores] = useState([]);
  const [destinationStores, setDestinationStores] = useState([]);
  const [vehicleUnits, setVehicleUnits] = useState([]);
  const [helpers, setHelpers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [driverId, setDriverId] = useState(trip.driver_id);
  const [vehicleUnitId, setVehicleUnitId] = useState(trip.vehicle_unit_id);
  const [originStoreId, setOriginStoreId] = useState(trip.origin_store_id);
  const [shipmentNumbers, setShipmentNumbers] = useState(
    trip.shipment_numbers || [],
  );
  const [shipmentNoInput, setShipmentNoInput] = useState("");
  const [destinationIds, setDestinationIds] = useState(
    trip.destination_store_ids || [],
  );
  const [helperIds, setHelperIds] = useState(
    (trip.helpers || []).map((h) => h.id),
  );
  const [destinationSearch, setDestinationSearch] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const [driverRes, storeRes, vehicleData] = await Promise.all([
          getAvailableDrivers(),
          getStores(),
          getAvailableVehicleUnits(),
        ]);

        const driverList = driverRes.data || [];
        // The trip's current driver must stay pickable.
        if (!driverList.some((d) => d.id === trip.driver_id)) {
          driverList.unshift({
            id: trip.driver_id,
            username: trip.driver_name,
            employee_name: trip.driver_name,
          });
        }
        setDrivers(driverList);

        const storeList = Array.isArray(storeRes.data)
          ? storeRes.data
          : storeRes.data?.items || [];
        setHubStores(storeList.filter((s) => s.is_hub));
        setDestinationStores(storeList.filter((s) => !s.is_hub));

        const vehicleList = Array.isArray(vehicleData)
          ? [...vehicleData]
          : [...(vehicleData.items || [])];
        // The trip's current vehicle is locked by this trip, so the
        // "available" list omits it.
        if (
          trip.vehicle_unit_id &&
          !vehicleList.some((v) => v.id === trip.vehicle_unit_id)
        ) {
          vehicleList.unshift({
            id: trip.vehicle_unit_id,
            unit_code: trip.vehicle_unit,
          });
        }
        setVehicleUnits(vehicleList);
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [trip]);

  // Helpers eligible for the chosen driver, plus this trip's own current
  // helpers (unavailable to everyone else because this trip holds them).
  useEffect(() => {
    if (!driverId) {
      setHelpers([]);
      return;
    }
    let cancelled = false;
    getAvailableHelpers(driverId)
      .then((list) => {
        if (cancelled) return;
        const merged = [...list];
        if (driverId === trip.driver_id) {
          (trip.helpers || []).forEach((h) => {
            if (!merged.some((m) => m.id === h.id)) {
              const [first, ...rest] = h.name.split(" ");
              merged.unshift({
                id: h.id,
                first_name: first,
                last_name: rest.join(" "),
              });
            }
          });
        }
        setHelpers(merged);
        // Drop selected helpers not eligible for the (new) driver.
        setHelperIds((prev) => prev.filter((id) => merged.some((m) => m.id === id)));
      })
      .catch(() => !cancelled && setHelpers([]));
    return () => {
      cancelled = true;
    };
  }, [driverId, trip]);

  const driverLabel = (driver) =>
    driver.employee_name && driver.employee_name !== driver.username
      ? `${driver.employee_name} (${driver.username})`
      : driver.username;

  const storeLabel = (store) =>
    store.profile ? `${store.name} (${store.profile})` : store.name;

  const toggleDestination = (id) =>
    setDestinationIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_DESTINATION_STORES) return prev;
      return [...prev, id];
    });

  const toggleHelper = (id) =>
    setHelperIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });

  const addShipmentNumber = () => {
    const value = shipmentNoInput.trim();
    if (!value) return;
    if (!/^\d{8}$/.test(value)) {
      toast.error("Shipment number must be exactly 8 digits (numbers only).");
      return;
    }
    if (shipmentNumbers.includes(value)) {
      toast.error("That shipment number is already added.");
      return;
    }
    if (shipmentNumbers.length >= MAX_SHIPMENT_NUMBERS) {
      toast.error(`Maximum of ${MAX_SHIPMENT_NUMBERS} shipment numbers allowed.`);
      return;
    }
    setShipmentNumbers((prev) => [...prev, value]);
    setShipmentNoInput("");
  };

  const filteredDestinations = destinationStores.filter((store) =>
    storeLabel(store).toLowerCase().includes(destinationSearch.toLowerCase()),
  );

  const storeName = (id) =>
    destinationStores.find((s) => s.id === id)?.name || `Store ${id}`;

  const hasChanges = useMemo(
    () =>
      driverId !== trip.driver_id ||
      vehicleUnitId !== trip.vehicle_unit_id ||
      originStoreId !== trip.origin_store_id ||
      !sameList(shipmentNumbers, trip.shipment_numbers || []) ||
      !sameList(destinationIds, trip.destination_store_ids || []) ||
      !sameList(
        [...helperIds].sort(),
        (trip.helpers || []).map((h) => h.id).sort(),
      ),
    [
      driverId,
      vehicleUnitId,
      originStoreId,
      shipmentNumbers,
      destinationIds,
      helperIds,
      trip,
    ],
  );

  const canSubmit =
    hasChanges &&
    driverId &&
    vehicleUnitId &&
    originStoreId &&
    shipmentNumbers.length > 0 &&
    destinationIds.length > 0;

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      await updateAssignedTrip(trip.id, {
        driver_id: driverId,
        vehicle_unit_id: vehicleUnitId,
        origin_store_id: originStoreId,
        destination_store_ids: destinationIds,
        shipment_numbers: shipmentNumbers,
        helper_ids: helperIds,
        reason: reason.trim() || null,
      });
      toast.success("Trip updated.");
      if (onSaved) await onSaved();
      onClose();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const showHelpers = helpers.length > 0 || helperIds.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-t-2xl border border-border bg-surface text-fg sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-border p-4">
          <div>
            <h2 className="text-base font-semibold">Edit Assigned Trip</h2>
            <p className="text-xs text-fg-muted">
              {trip.trip_code || ""} · only possible until the driver starts
              Checkout.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-fg-muted hover:bg-surface-hover"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {loading ? (
            <p className="py-6 text-center text-sm text-fg-subtle">
              Loading...
            </p>
          ) : (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium">Driver</label>
                <SearchSelect
                  value={drivers.find((d) => d.id === driverId)}
                  options={drivers}
                  onChange={(driver) => setDriverId(driver?.id || "")}
                  placeholder="Select driver"
                  getOptionLabel={(driver) => (driver ? driverLabel(driver) : "")}
                  getOptionValue={(driver) => driver?.id}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Vehicle Unit
                </label>
                <SearchSelect
                  value={vehicleUnits.find((v) => v.id === vehicleUnitId)}
                  options={vehicleUnits}
                  onChange={(vehicle) => setVehicleUnitId(vehicle?.id || "")}
                  placeholder="Select vehicle unit"
                  getOptionLabel={(vehicle) =>
                    vehicle?.plate_number || vehicle?.unit_code || ""
                  }
                  getOptionValue={(vehicle) => vehicle?.id}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Shipment Number(s) ({shipmentNumbers.length}/
                  {MAX_SHIPMENT_NUMBERS})
                </label>
                <div className="flex gap-2">
                  <input
                    inputMode="numeric"
                    maxLength={8}
                    value={shipmentNoInput}
                    onChange={(e) =>
                      setShipmentNoInput(e.target.value.replace(/\D/g, ""))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addShipmentNumber();
                      }
                    }}
                    placeholder="8-digit shipment number, then press Add"
                    className={inputStyles}
                  />
                  <button
                    type="button"
                    onClick={addShipmentNumber}
                    className="rounded-xl border border-border px-4 text-sm font-medium hover:bg-surface-hover"
                  >
                    Add
                  </button>
                </div>
                {shipmentNumbers.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {shipmentNumbers.map((n) => (
                      <span
                        key={n}
                        className="inline-flex items-center gap-1 rounded-full bg-surface-active px-2.5 py-1 text-xs font-medium"
                      >
                        {n}
                        <button
                          type="button"
                          onClick={() =>
                            setShipmentNumbers((prev) =>
                              prev.filter((x) => x !== n),
                            )
                          }
                          className="text-fg-subtle hover:text-danger"
                          aria-label={`Remove ${n}`}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Origin Hub
                </label>
                <SearchSelect
                  value={hubStores.find((s) => s.id === originStoreId)}
                  options={hubStores}
                  onChange={(store) => setOriginStoreId(store?.id || "")}
                  placeholder="Select origin hub"
                  getOptionLabel={(store) => store?.name || ""}
                  getOptionValue={(store) => store?.id}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Destination Stores ({destinationIds.length}/
                  {MAX_DESTINATION_STORES})
                </label>
                <p className="mb-2 text-xs text-fg-subtle">
                  Order matters: the first store sets the trip's rate profile.
                  To reorder, untick and re-tick.
                </p>
                {destinationIds.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {destinationIds.map((id, index) => (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium"
                      >
                        <span className="text-[10px] text-fg-subtle">
                          {index === 0 ? "1st" : `${index + 1}.`}
                        </span>
                        {storeName(id)}
                        <button
                          type="button"
                          onClick={() => toggleDestination(id)}
                          className="text-fg-subtle hover:text-danger"
                          aria-label={`Remove ${storeName(id)}`}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <input
                  value={destinationSearch}
                  onChange={(e) => setDestinationSearch(e.target.value)}
                  placeholder="Search stores"
                  className={`${inputStyles} mb-2`}
                />
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
                  {filteredDestinations.map((store) => (
                    <label
                      key={store.id}
                      className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-hover"
                    >
                      <input
                        type="checkbox"
                        checked={destinationIds.includes(store.id)}
                        onChange={() => toggleDestination(store.id)}
                        className="h-4 w-4 rounded border-border"
                      />
                      {storeLabel(store)}
                    </label>
                  ))}
                  {filteredDestinations.length === 0 && (
                    <p className="p-2 text-xs text-fg-subtle">
                      No stores found.
                    </p>
                  )}
                </div>
              </div>

              {showHelpers && (
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Helpers ({helperIds.length}/3)
                  </label>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {helpers.map((helper) => {
                      const isSelected = helperIds.includes(helper.id);
                      const isDisabled = !isSelected && helperIds.length >= 3;
                      return (
                        <label
                          key={helper.id}
                          className={`flex items-center gap-2 rounded-xl border p-3 text-sm transition-colors ${
                            isSelected
                              ? "border-primary bg-primary/10 text-fg"
                              : "border-border text-fg-muted"
                          } ${isDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-surface-hover"}`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={isDisabled}
                            onChange={() => toggleHelper(helper.id)}
                            className="h-4 w-4 rounded border-border"
                          />
                          {helper.first_name} {helper.last_name}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Reason for change (optional)
                </label>
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Customer changed the delivery order"
                  className={inputStyles}
                />
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border p-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium hover:bg-surface-hover"
          >
            Close
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || loading || !canSubmit}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
