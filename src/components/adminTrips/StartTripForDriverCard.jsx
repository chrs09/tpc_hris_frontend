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

// Lets a trip manager (admin/superadmin/coordinator_admin) dispatch a
// trip to a driver from the office -- this is Step 0 of the 7-step
// driver flow (Checkout, Start Trip, Arrived, Start Unloading,
// Delivered, Back to Source, Checkin). Only the driver, vehicle, origin
// hub, and helpers are picked here; the shipment number and destination
// store are unknown until the driver photographs the Invoice/LM at
// their own Checkout step (OCR-assisted, driver-confirmed).
export default function StartTripForDriverCard({
  onStarted,
  alwaysExpanded = false,
}) {
  const [expanded, setExpanded] = useState(alwaysExpanded);

  const [drivers, setDrivers] = useState([]);
  const [hubStores, setHubStores] = useState([]);
  const [vehicleUnits, setVehicleUnits] = useState([]);
  const [helpers, setHelpers] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  const [driverId, setDriverId] = useState("");
  const [originStoreId, setOriginStoreId] = useState("");
  const [vehicleUnitId, setVehicleUnitId] = useState("");
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

  const resetForm = () => {
    setDriverId("");
    setOriginStoreId("");
    setVehicleUnitId("");
    setSelectedHelperIds([]);
  };

  const canSubmit = driverId && originStoreId && vehicleUnitId;

  const handleSubmit = async () => {
    if (!canSubmit) {
      toast.error("Select a driver, origin hub, and vehicle.");
      return;
    }

    try {
      setSubmitting(true);

      const formData = new FormData();
      formData.append("driver_id", driverId);
      formData.append("vehicle_unit_id", vehicleUnitId);
      formData.append("origin_store_id", originStoreId);
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
            Assign a driver, vehicle, and origin hub. The driver fills in the
            shipment number and destination at their own Checkout step.
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
