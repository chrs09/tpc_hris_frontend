import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getAvailableDrivers } from "../../api/adminTripManagement/trips";
import {
  getAvailableHelpers,
  getAvailableStores,
  getAvailableVehicleUnits,
  startTrip,
} from "../../api/tripManagement";

const getErrorMessage = (error) =>
  error.response?.data?.detail || error.message || "Something went wrong.";

const getCurrentLocation = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported on this device."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          lat: position.coords.latitude,
          long: position.coords.longitude,
        }),
      () => reject(new Error("Location permission is required.")),
    );
  });

const inputStyles =
  "w-full rounded-xl border border-border bg-background p-3 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30";

// Lets a trip manager (admin/superadmin/coordinator_admin) start a trip on
// behalf of a driver from the office -- the driver then just checks
// in/out from their own phone for the rest of the trip. Same fields as
// the driver's own Start Trip form; the only addition is picking which
// driver it's for. The backend still requires lat/long like the driver
// flow, but skips the strict hub-radius check for this trip-manager path.
export default function StartTripForDriverCard({
  onStarted,
  alwaysExpanded = false,
}) {
  const [expanded, setExpanded] = useState(alwaysExpanded);

  const [drivers, setDrivers] = useState([]);
  const [stores, setStores] = useState([]);
  const [vehicleUnits, setVehicleUnits] = useState([]);
  const [helpers, setHelpers] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  const [driverId, setDriverId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [vehicleUnitId, setVehicleUnitId] = useState("");
  const [shipmentNo, setShipmentNo] = useState("");
  const [selectedHelperIds, setSelectedHelperIds] = useState([]);
  const [invoicePhoto, setInvoicePhoto] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!expanded) return;

    const loadOptions = async () => {
      try {
        setLoadingOptions(true);
        const [driverRes, storeRes, vehicleData] = await Promise.all([
          getAvailableDrivers(),
          getAvailableStores(),
          getAvailableVehicleUnits(),
        ]);

        setDrivers(driverRes.data || []);
        setStores(Array.isArray(storeRes) ? storeRes : storeRes.items || []);
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

  const selectedStore = stores.find((store) => String(store.id) === storeId);
  const selectedStoreHelperCount =
    selectedStore?.helper_count ?? selectedStore?.required_helper_count ?? 0;
  const helpersRequired = selectedStoreHelperCount > 0;
  const helpersSatisfied =
    !helpersRequired ||
    (selectedHelperIds.length >= 1 &&
      selectedHelperIds.length <= selectedStoreHelperCount);

  const toggleHelper = (helperId) => {
    setSelectedHelperIds((prev) => {
      if (prev.includes(helperId)) return prev.filter((id) => id !== helperId);
      if (prev.length >= selectedStoreHelperCount) return prev;
      return [...prev, helperId];
    });
  };

  const handleStoreChange = (value) => {
    setStoreId(value);
    setSelectedHelperIds([]);
  };

  const resetForm = () => {
    setDriverId("");
    setStoreId("");
    setVehicleUnitId("");
    setShipmentNo("");
    setSelectedHelperIds([]);
    setInvoicePhoto(null);
  };

  const canSubmit =
    driverId &&
    storeId &&
    vehicleUnitId &&
    shipmentNo.trim() &&
    invoicePhoto &&
    helpersSatisfied;

  const handleSubmit = async () => {
    if (!canSubmit) {
      toast.error("Fill in all fields (including helpers, if required).");
      return;
    }

    try {
      setSubmitting(true);

      const location = await getCurrentLocation();
      const formData = new FormData();
      formData.append("shipment_no", shipmentNo.trim());
      formData.append("vehicle_unit_id", vehicleUnitId);
      formData.append("store_id", storeId);
      formData.append("driver_id", driverId);
      formData.append("lat", location.lat);
      formData.append("long", location.long);
      formData.append("photo", invoicePhoto);
      formData.append("helper_ids", JSON.stringify(selectedHelperIds));

      await startTrip(formData);

      toast.success("Trip started for driver.");
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
          <h3 className="text-sm font-semibold text-fg">
            Start Trip for Driver
          </h3>
          <p className="mt-1 text-xs text-fg-subtle">
            Dispatch a trip on a driver's behalf; they check in/out from
            their own phone afterward.
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
              <div>
                <label className="mb-1 block text-sm font-medium text-fg">
                  Driver
                </label>
                <select
                  value={driverId}
                  onChange={(e) => setDriverId(e.target.value)}
                  className={inputStyles}
                >
                  <option value="">Select driver</option>
                  {drivers.map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.employee_name
                        ? `${driver.employee_name} (${driver.username})`
                        : driver.username}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-fg">
                  Shipment Number
                </label>
                <input
                  type="text"
                  value={shipmentNo}
                  onChange={(e) => setShipmentNo(e.target.value)}
                  placeholder="Enter shipment number"
                  className={inputStyles}
                />
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
                  Store
                </label>
                <select
                  value={storeId}
                  onChange={(e) => handleStoreChange(e.target.value)}
                  className={inputStyles}
                >
                  <option value="">Select store</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name || store.store_name}
                    </option>
                  ))}
                </select>
                {helpersRequired && (
                  <p className="mt-1 text-xs text-fg-muted">
                    This store requires up to {selectedStoreHelperCount}{" "}
                    helper{selectedStoreHelperCount === 1 ? "" : "s"}. Select
                    at least 1.
                  </p>
                )}
              </div>

              {helpersRequired && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-fg">
                    Helpers ({selectedHelperIds.length}/
                    {selectedStoreHelperCount})
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
                          !isSelected &&
                          selectedHelperIds.length >= selectedStoreHelperCount;
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
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-fg">
                  Invoice Photo
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setInvoicePhoto(e.target.files?.[0] || null)
                  }
                  className="w-full rounded-lg border border-border bg-background p-2 text-sm text-fg"
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitting || !canSubmit}
                className="w-full rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {submitting ? "Starting..." : "Start Trip"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
