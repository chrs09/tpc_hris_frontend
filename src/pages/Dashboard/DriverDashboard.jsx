import React, { useEffect, useState } from "react";
import {
  checkIn,
  checkOut,
  completeTrip,
  getActiveTrip,
  getAvailableStores,
  getAvailableVehicleUnits,
  startTrip,
} from "../../api/tripManagement";

const getErrorMessage = (error) =>
  error.response?.data?.detail || error.message || "Something went wrong.";

const DriverDashboard = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [tripData, setTripData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [shipmentNo, setShipmentNo] = useState("");
  const [vehicleUnits, setVehicleUnits] = useState([]);
  const [stores, setStores] = useState([]);
  const [vehicleUnitId, setVehicleUnitId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [invoicePhoto, setInvoicePhoto] = useState(null);
  const [deliveryProofPhoto, setDeliveryProofPhoto] = useState(null);
  const [stampedInvoicePhoto, setStampedInvoicePhoto] = useState(null);

  const driverName = localStorage.getItem("username") || "Driver";

  const loadTrip = async () => {
    try {
      const activeTripData = await getActiveTrip();
      setTripData(activeTripData);

      if (!activeTripData.active_trip) {
        const [storeData, vehicleData] = await Promise.all([
          getAvailableStores(),
          getAvailableVehicleUnits(),
        ]);
        setStores(Array.isArray(storeData) ? storeData : storeData.items || []);
        setVehicleUnits(
          Array.isArray(vehicleData) ? vehicleData : vehicleData.items || [],
        );
      }
    } catch (error) {
      console.error(error);
      alert(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrip();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

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

  const selectedStore = stores.find((store) => String(store.id) === storeId);
  const selectedStoreHelperCount =
    selectedStore?.helper_count ?? selectedStore?.required_helper_count;

  const handleStartTrip = async () => {
    if (!shipmentNo.trim() || !vehicleUnitId || !storeId || !invoicePhoto) {
      alert(
        "Shipment number, vehicle unit, store, and invoice photo are required.",
      );
      return;
    }

    try {
      setActionLoading(true);
      const location = await getCurrentLocation();
      const formData = new FormData();

      formData.append("shipment_no", shipmentNo.trim());
      formData.append("vehicle_unit_id", vehicleUnitId);
      formData.append("store_id", storeId);
      formData.append("lat", location.lat);
      formData.append("long", location.long);
      formData.append("invoice_photo", invoicePhoto);

      await startTrip(formData);

      setShipmentNo("");
      setVehicleUnitId("");
      setStoreId("");
      setInvoicePhoto(null);
      await loadTrip();
    } catch (error) {
      alert(getErrorMessage(error));
    } finally {
      setActionLoading(false);
    }
  };

  const handleArrivedAtStore = async () => {
    try {
      setActionLoading(true);
      const location = await getCurrentLocation();
      await checkIn(tripData.active_trip.id, location);
      await loadTrip();
    } catch (error) {
      alert(getErrorMessage(error));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelivered = async () => {
    if (!deliveryProofPhoto) {
      alert("Upload delivery proof before marking this stop as delivered.");
      return;
    }

    try {
      setActionLoading(true);
      const location = await getCurrentLocation();
      const formData = new FormData();
      formData.append("lat", location.lat);
      formData.append("long", location.long);
      formData.append("delivery_proof_photo", deliveryProofPhoto);

      await checkOut(tripData.active_trip.id, tripData.latest_stop.id, formData);
      setDeliveryProofPhoto(null);
      await loadTrip();
    } catch (error) {
      alert(getErrorMessage(error));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteTrip = async () => {
    if (!stampedInvoicePhoto) {
      alert("Upload the stamped invoice before completing the trip.");
      return;
    }

    try {
      setActionLoading(true);
      const location = await getCurrentLocation();
      const formData = new FormData();
      formData.append("lat", location.lat);
      formData.append("long", location.long);
      formData.append("stamped_invoice_photo", stampedInvoicePhoto);

      await completeTrip(tripData.active_trip.id, formData);
      setStampedInvoicePhoto(null);
      await loadTrip();
    } catch (error) {
      alert(getErrorMessage(error));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;

  const trip = tripData?.active_trip;
  const hasOpenStop = tripData?.has_open_stop;
  const canCompleteTrip =
    !hasOpenStop &&
    (tripData?.can_complete ??
      tripData?.all_stops_completed ??
      Boolean(tripData?.latest_stop?.id));

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="mb-8 rounded-3xl bg-[#2b2b2b] p-5 text-white shadow-lg sm:p-6 lg:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">
              {getGreeting()}, {driverName}
            </h1>
            <p className="text-sm text-blue-200">
              {new Date().toLocaleDateString()}
            </p>
          </div>
          <div className="sm:text-right">
            <p className="text-sm text-blue-200">Current Time</p>
            <p className="text-lg font-semibold sm:text-xl">
              {currentTime.toLocaleTimeString()}
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-white p-4 text-gray-800 shadow-md sm:p-6">
          {!trip ? (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Shipment Number
                </label>
                <input
                  type="text"
                  placeholder="Enter shipment number"
                  value={shipmentNo}
                  onChange={(event) => setShipmentNo(event.target.value)}
                  className="w-full rounded-xl border p-3"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Vehicle Unit
                </label>
                <select
                  value={vehicleUnitId}
                  onChange={(event) => setVehicleUnitId(event.target.value)}
                  className="w-full rounded-xl border p-3"
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
                <label className="mb-1 block text-sm font-medium">Store</label>
                <select
                  value={storeId}
                  onChange={(event) => setStoreId(event.target.value)}
                  className="w-full rounded-xl border p-3"
                >
                  <option value="">Select store</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name || store.store_name}
                    </option>
                  ))}
                </select>
                {selectedStoreHelperCount !== undefined && (
                  <p className="mt-1 text-xs text-gray-500">
                    This store requires {selectedStoreHelperCount} helper
                    {selectedStoreHelperCount === 1 ? "" : "s"}.
                  </p>
                )}
              </div>

              <PhotoInput
                id="invoice-photo"
                label="Invoice Photo"
                onChange={setInvoicePhoto}
              />

              <button
                onClick={handleStartTrip}
                disabled={
                  actionLoading ||
                  !shipmentNo.trim() ||
                  !vehicleUnitId ||
                  !storeId ||
                  !invoicePhoto
                }
                className="w-full rounded-xl bg-yellow-400 px-6 py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {actionLoading ? "Processing..." : "Start Trip"}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <p className="font-semibold">
                  Shipment No: {trip.shipment_no || trip.ticket_no}
                </p>
                {trip.vehicle_unit && (
                  <p>Vehicle: {trip.vehicle_unit.plate_number}</p>
                )}
              </div>

              {!hasOpenStop && (
                <button
                  onClick={handleArrivedAtStore}
                  disabled={actionLoading}
                  className="w-full rounded-xl bg-[#2b2b2b] px-6 py-3 text-white disabled:opacity-50 sm:w-auto"
                >
                  {actionLoading ? "Processing..." : "Arrived at Store"}
                </button>
              )}

              {hasOpenStop && (
                <div className="space-y-3">
                  <PhotoInput
                    id="delivery-proof"
                    label="Delivery Proof"
                    helpText="A photo is required before you can mark this stop as delivered."
                    onChange={setDeliveryProofPhoto}
                  />
                  <button
                    onClick={handleDelivered}
                    disabled={actionLoading || !deliveryProofPhoto}
                    className="w-full rounded-xl bg-yellow-500 px-6 py-3 text-white disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                  >
                    {actionLoading ? "Processing..." : "Delivered"}
                  </button>
                </div>
              )}

              {canCompleteTrip && (
                <div className="space-y-3 border-t pt-4">
                  <PhotoInput
                    id="stamped-invoice"
                    label="Stamped Invoice Photo"
                    helpText="Upload the invoice with the receiving stamp before completing the trip."
                    onChange={setStampedInvoicePhoto}
                  />
                  <button
                    onClick={handleCompleteTrip}
                    disabled={actionLoading || !stampedInvoicePhoto}
                    className="w-full rounded-xl bg-green-600 px-6 py-3 text-white disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                  >
                    {actionLoading ? "Processing..." : "Complete Trip"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const PhotoInput = ({ id, label, helpText, onChange }) => (
  <div>
    <label htmlFor={id} className="mb-1 block text-sm font-medium">
      {label}
    </label>
    {helpText && <p className="mb-2 text-xs text-gray-500">{helpText}</p>}
    <input
      id={id}
      type="file"
      accept="image/*"
      capture="environment"
      required
      onChange={(event) => onChange(event.target.files?.[0] || null)}
      className="w-full rounded-lg border p-2"
    />
  </div>
);

export default DriverDashboard;
