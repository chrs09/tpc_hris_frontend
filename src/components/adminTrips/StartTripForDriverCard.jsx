import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getAvailableDrivers } from "../../api/adminTripManagement/trips";
import { getStores } from "../../api/adminTripManagement/stores";
import {
  getAvailableHelpers,
  getAvailableVehicleUnits,
  dispatchTrip,
} from "../../api/tripManagement";

const getErrorMessage = (error) =>
  error.response?.data?.detail || error.message || "Something went wrong.";

const inputStyles =
  "w-full rounded-xl border border-border bg-background p-3 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30";

// A trip can cover multiple delivery stores -- capped here to match the
// backend's MAX_PLANNED_STOPS.
const MAX_DESTINATION_STORES = 20;

// A single truck/trip can carry multiple shipments -- capped here to
// match the backend's MAX_SHIPMENT_NUMBERS.
const MAX_SHIPMENT_NUMBERS = 10;

// Lets a trip manager (admin/superadmin/coordinator_admin) dispatch a
// trip to a driver from the office -- this is Step 0 of the driver flow
// (Checkout, Start Trip, Arrived, Start Unloading, Delivered, Checkin).
// The driver, vehicle, origin hub, destination store(s), and helpers
// are all picked here; the driver's own Checkout step only records the
// odometer reading and the required photos. Trip category (rate
// profile, decides driver/helper pay) is derived automatically on the
// backend from the first destination store's own rate profile -- not
// picked here.
export default function StartTripForDriverCard({
  onStarted,
  alwaysExpanded = false,
}) {
  const [expanded, setExpanded] = useState(alwaysExpanded);

  const [drivers, setDrivers] = useState([]);
  const [hubStores, setHubStores] = useState([]);
  const [destinationStores, setDestinationStores] = useState([]);
  const [vehicleUnits, setVehicleUnits] = useState([]);
  const [helpers, setHelpers] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [destinationSearch, setDestinationSearch] = useState("");
  const [driverSearch, setDriverSearch] = useState("");
  const [driverDropdownOpen, setDriverDropdownOpen] = useState(false);

  const [driverId, setDriverId] = useState("");
  const [originStoreId, setOriginStoreId] = useState("");
  const [vehicleUnitId, setVehicleUnitId] = useState("");
  const [shipmentNumbers, setShipmentNumbers] = useState([]);
  const [shipmentNoInput, setShipmentNoInput] = useState("");
  const [selectedDestinationIds, setSelectedDestinationIds] = useState([]);
  const [selectedHelperIds, setSelectedHelperIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!expanded) return;

    const loadOptions = async () => {
      try {
        setLoadingOptions(true);
        const [driverRes, storeRes, vehicleData] = await Promise.all([
          getAvailableDrivers(),
          getStores(),
          getAvailableVehicleUnits(),
        ]);

        setDrivers(driverRes.data || []);

        const storeList = Array.isArray(storeRes.data)
          ? storeRes.data
          : storeRes.data?.items || [];
        setHubStores(storeList.filter((store) => store.is_hub));
        setDestinationStores(storeList.filter((store) => !store.is_hub));

        setVehicleUnits(
          Array.isArray(vehicleData) ? vehicleData : vehicleData.items || [],
        );
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setLoadingOptions(false);
      }
    };

    loadOptions();
  }, [expanded]);

  useEffect(() => {
    if (!driverId) {
      setHelpers([]);
      setSelectedHelperIds([]);
      return;
    }

    getAvailableHelpers(driverId)
      .then(setHelpers)
      .catch(() => setHelpers([]));
  }, [driverId]);

  const toggleHelper = (helperId) => {
    setSelectedHelperIds((prev) => {
      if (prev.includes(helperId)) return prev.filter((id) => id !== helperId);
      if (prev.length >= 3) return prev;
      return [...prev, helperId];
    });
  };

  // Order matters: the first store selected becomes the trip's primary
  // destination and sets its pay rate profile (see dispatch_trip on the
  // backend), so this appends/removes rather than re-sorting.
  const toggleDestination = (storeId) => {
    setSelectedDestinationIds((prev) => {
      if (prev.includes(storeId)) return prev.filter((id) => id !== storeId);
      if (prev.length >= MAX_DESTINATION_STORES) return prev;
      return [...prev, storeId];
    });
  };

  const removeDestination = (storeId) => {
    setSelectedDestinationIds((prev) => prev.filter((id) => id !== storeId));
  };

  // A single truck/trip can carry multiple shipments (e.g. several
  // DRs/manifests loaded together) -- entered one at a time here rather
  // than as a single free-text field.
  const addShipmentNumber = () => {
    const value = shipmentNoInput.trim();
    if (!value) return;
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

  const removeShipmentNumber = (value) => {
    setShipmentNumbers((prev) => prev.filter((n) => n !== value));
  };

  const filteredDestinationStores = destinationStores.filter((store) =>
    store.name.toLowerCase().includes(destinationSearch.toLowerCase()),
  );

  // e.g. "2 RK GEN. MERCHANDISE (WS)" -- profile is the store's channel
  // code (WS = Wholesaler, DP, KD, KA, PUP; see StoreProfile in
  // app/models/stores.py), shown so the coordinator can tell channels
  // apart at a glance when picking destinations.
  const storeLabel = (store) =>
    store.profile ? `${store.name} (${store.profile})` : store.name;

  const driverLabel = (driver) =>
    driver.employee_name
      ? `${driver.employee_name} (${driver.username})`
      : driver.username;

  const selectedDriver = drivers.find((d) => String(d.id) === String(driverId));

  const filteredDrivers = drivers.filter((driver) =>
    driverLabel(driver).toLowerCase().includes(driverSearch.toLowerCase()),
  );

  const selectDriver = (driver) => {
    setDriverId(driver.id);
    setDriverSearch("");
    setDriverDropdownOpen(false);
  };

  const resetForm = () => {
    setDriverId("");
    setOriginStoreId("");
    setVehicleUnitId("");
    setShipmentNumbers([]);
    setShipmentNoInput("");
    setSelectedDestinationIds([]);
    setSelectedHelperIds([]);
    setDestinationSearch("");
    setDriverSearch("");
    setDriverDropdownOpen(false);
  };

  const canSubmit =
    driverId &&
    originStoreId &&
    vehicleUnitId &&
    shipmentNumbers.length > 0 &&
    selectedDestinationIds.length > 0;

  const handleSubmit = async () => {
    if (!canSubmit) {
      toast.error(
        "Select a driver, origin hub, vehicle, shipment number, and at least one destination store.",
      );
      return;
    }

    try {
      setSubmitting(true);

      const formData = new FormData();
      formData.append("driver_id", driverId);
      formData.append("vehicle_unit_id", vehicleUnitId);
      formData.append("origin_store_id", originStoreId);
      formData.append("shipment_no", JSON.stringify(shipmentNumbers));
      formData.append(
        "destination_store_ids",
        JSON.stringify(selectedDestinationIds),
      );
      formData.append("helper_ids", JSON.stringify(selectedHelperIds));

      await dispatchTrip(formData);

      toast.success("Trip dispatched to driver.");
      resetForm();
      if (!alwaysExpanded) setExpanded(false);
      onStarted?.();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-fg">Dispatch Trip</h3>
          <p className="mt-1 text-xs text-fg-subtle">
            Assign a driver, vehicle, origin hub, shipment number(s), and
            destination store(s). The driver's own Checkout step only
            records the odometer reading and photos.
          </p>
        </div>
        {!alwaysExpanded && (
          <button
            onClick={() => setExpanded((prev) => !prev)}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-fg-muted transition hover:bg-surface-hover"
          >
            {expanded ? "Close" : "Open"}
          </button>
        )}
      </div>

      {expanded && (
        <div className="mt-4 space-y-4">
          {loadingOptions ? (
            <p className="text-sm text-fg-muted">Loading options...</p>
          ) : (
            <>
              <div className="relative">
                <label className="mb-1 block text-sm font-medium text-fg">
                  Driver
                </label>
                <input
                  type="text"
                  value={
                    driverDropdownOpen
                      ? driverSearch
                      : selectedDriver
                        ? driverLabel(selectedDriver)
                        : ""
                  }
                  onChange={(e) => setDriverSearch(e.target.value)}
                  onFocus={() => {
                    setDriverSearch("");
                    setDriverDropdownOpen(true);
                  }}
                  onBlur={() =>
                    setTimeout(() => setDriverDropdownOpen(false), 150)
                  }
                  placeholder="Search driver..."
                  className={inputStyles}
                />

                {driverDropdownOpen && (
                  <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-border bg-surface shadow-lg">
                    {filteredDrivers.length === 0 ? (
                      <p className="p-3 text-xs text-fg-subtle">
                        No drivers match.
                      </p>
                    ) : (
                      filteredDrivers.map((driver) => (
                        <button
                          type="button"
                          key={driver.id}
                          onMouseDown={() => selectDriver(driver)}
                          className={`block w-full px-3 py-2 text-left text-sm hover:bg-surface-hover ${
                            String(driver.id) === String(driverId)
                              ? "bg-primary/10 text-fg"
                              : "text-fg-muted"
                          }`}
                        >
                          {driverLabel(driver)}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-fg">
                  Vehicle Unit
                </label>
                <select
                  value={vehicleUnitId}
                  onChange={(e) => setVehicleUnitId(e.target.value)}
                  className={inputStyles}
                >
                  <option value="">Select vehicle unit</option>
                  {vehicleUnits.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.plate_number || vehicle.unit_code}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-fg">
                  Shipment Number(s) ({shipmentNumbers.length}/
                  {MAX_SHIPMENT_NUMBERS})
                </label>
                <p className="mb-2 text-xs text-fg-subtle">
                  A single trip can carry multiple shipments -- add each
                  one separately.
                </p>

                {shipmentNumbers.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {shipmentNumbers.map((number) => (
                      <span
                        key={number}
                        className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                      >
                        {number}
                        <button
                          type="button"
                          onClick={() => removeShipmentNumber(number)}
                          className="text-primary/70 hover:text-primary"
                          aria-label={`Remove ${number}`}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={shipmentNoInput}
                    onChange={(e) => setShipmentNoInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addShipmentNumber();
                      }
                    }}
                    placeholder="Enter shipment number"
                    disabled={shipmentNumbers.length >= MAX_SHIPMENT_NUMBERS}
                    className={inputStyles}
                  />
                  <button
                    type="button"
                    onClick={addShipmentNumber}
                    disabled={
                      !shipmentNoInput.trim() ||
                      shipmentNumbers.length >= MAX_SHIPMENT_NUMBERS
                    }
                    className="shrink-0 rounded-xl border border-border px-4 py-2 text-sm font-medium text-fg transition hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-fg">
                  Origin Hub
                </label>
                <select
                  value={originStoreId}
                  onChange={(e) => setOriginStoreId(e.target.value)}
                  className={inputStyles}
                >
                  <option value="">Select origin hub</option>
                  {hubStores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-fg">
                  Destination Stores ({selectedDestinationIds.length}/
                  {MAX_DESTINATION_STORES})
                </label>
                <p className="mb-2 text-xs text-fg-subtle">
                  A trip can cover multiple stores under one dispatch -- the
                  driver visits each in turn. The first store selected sets
                  the trip's pay rate.
                </p>

                {selectedDestinationIds.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {selectedDestinationIds.map((storeId, index) => {
                      const store = destinationStores.find(
                        (s) => s.id === storeId,
                      );
                      return (
                        <span
                          key={storeId}
                          className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-fg"
                        >
                          {index === 0 && (
                            <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                              1st
                            </span>
                          )}
                          {store ? storeLabel(store) : `Store #${storeId}`}
                          <button
                            type="button"
                            onClick={() => removeDestination(storeId)}
                            className="text-fg-muted hover:text-danger"
                          >
                            ✕
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                <input
                  type="text"
                  value={destinationSearch}
                  onChange={(e) => setDestinationSearch(e.target.value)}
                  placeholder="Search stores..."
                  className={`${inputStyles} mb-2`}
                />

                <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
                  {filteredDestinationStores.length === 0 ? (
                    <p className="p-2 text-xs text-fg-subtle">
                      No stores match.
                    </p>
                  ) : (
                    filteredDestinationStores.map((store) => {
                      const isSelected = selectedDestinationIds.includes(
                        store.id,
                      );
                      const isDisabled =
                        !isSelected &&
                        selectedDestinationIds.length >= MAX_DESTINATION_STORES;
                      return (
                        <label
                          key={store.id}
                          className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors ${
                            isSelected ? "bg-primary/10 text-fg" : "text-fg-muted"
                          } ${isDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-surface-hover"}`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={isDisabled}
                            onChange={() => toggleDestination(store.id)}
                            className="h-4 w-4 rounded border-border"
                          />
                          {storeLabel(store)}
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-fg">
                  Helpers ({selectedHelperIds.length}/3)
                </label>
                {!driverId ? (
                  <p className="text-xs text-fg-subtle">
                    Select a driver first.
                  </p>
                ) : helpers.length === 0 ? (
                  <p className="text-xs text-fg-subtle">
                    No available helpers found.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {helpers.map((helper) => {
                      const isSelected = selectedHelperIds.includes(
                        helper.id,
                      );
                      const isDisabled =
                        !isSelected && selectedHelperIds.length >= 3;
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
                )}
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitting || !canSubmit}
                className="w-full rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {submitting ? "Dispatching..." : "Dispatch Trip"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
