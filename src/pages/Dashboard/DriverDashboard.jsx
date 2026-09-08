import React, { useEffect, useState, useCallback } from "react";
import {
  checkIn,
  checkOut,
  completeTrip,
  getActiveTrip,
  getAvailableStores,
  getAvailableVehicleUnits,
  startTrip,
} from "../../api/tripManagement";
import { getMyTrips, getTripSummary, getWallet } from "../../api/driver/trips";
import { getMyLeaveRequests } from "../../api/leave";
import WalletCard from "../../components/driverDashboard/WalletCard";
import LeaveHistoryList from "../../components/leave/LeaveHistoryList";
import LeaveRequestModal from "../../components/leave/LeaveRequestModal";
import DashboardCard from "../../components/dashboard/DashboardCard";
import SummaryCard from "../../components/driverTrips/SummaryCard";
import ActiveTripCard from "../../components/driverTrips/ActiveTripCard";
import TripTable from "../../components/driverTrips/TripTable";
import useIsDesktop from "../../hooks/useIsDesktop";

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

  const [tripHistory, setTripHistory] = useState([]);
  const [tripSummary, setTripSummary] = useState(null);
  const [walletQuick, setWalletQuick] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [activeTab, setActiveTab] = useState("trip");
  const isDesktop = useIsDesktop();

  const driverName = localStorage.getItem("username") || "Driver";

  const loadLeaves = useCallback(async () => {
    try {
      const data = await getMyLeaveRequests();
      setLeaves(data);
    } catch (error) {
      console.error("Failed to load leave requests:", error);
    }
  }, []);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const trips = await getMyTrips();
        setTripHistory(trips);
      } catch (error) {
        console.error("Failed to load trip history:", error);
      }
    };

    // Same counts shown on the standalone Trip Management page
    // (src/pages/Driver/DriverTrips.jsx) -- surfaced here too so a driver
    // never has to leave the dashboard to see them.
    const loadSummary = async () => {
      try {
        const summary = await getTripSummary();
        setTripSummary(summary);
      } catch (error) {
        console.error("Failed to load trip summary:", error);
      }
    };

    // Lightweight fetch just for the Wallet quick card's headline number;
    // the full Wallet tab/card does its own richer fetch (cutoff list,
    // transactions) when it's actually opened.
    const loadWalletQuick = async () => {
      try {
        const wallet = await getWallet();
        setWalletQuick(wallet);
      } catch (error) {
        console.error("Failed to load wallet summary:", error);
      }
    };

    loadHistory();
    loadSummary();
    loadWalletQuick();
    loadLeaves();
  }, [loadLeaves]);

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

      await checkOut(
        tripData.active_trip.id,
        tripData.latest_stop.id,
        formData,
      );
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

  if (loading) return <div className="p-6 text-fg-muted">Loading...</div>;

  const trip = tripData?.active_trip;
  const hasOpenStop = tripData?.has_open_stop;
  const canCompleteTrip =
    !hasOpenStop &&
    (tripData?.can_complete ??
      tripData?.all_stops_completed ??
      Boolean(tripData?.latest_stop?.id));

  const pendingTrips = tripHistory.filter((t) => t.status === "PENDING_APPROVAL");
  const completedTrips = tripHistory.filter((t) => t.status === "COMPLETED");

  const TABS = [
    { key: "trip", label: "Trip" },
    { key: "wallet", label: "Wallet" },
    { key: "history", label: "Trips" },
    { key: "leave", label: "Leave" },
  ];

  const inputStyles =
    "w-full rounded-xl border border-border bg-background p-3 text-fg focus:outline-none focus:ring-2 focus:ring-primary/30";

  const tripWorkflowContent = (
    <>
      {!trip ? (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-fg">
                  Shipment Number
                </label>
                <input
                  type="text"
                  placeholder="Enter shipment number"
                  value={shipmentNo}
                  onChange={(event) => setShipmentNo(event.target.value)}
                  className={inputStyles}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-fg">
                  Vehicle Unit
                </label>
                <select
                  value={vehicleUnitId}
                  onChange={(event) => setVehicleUnitId(event.target.value)}
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
                <label className="mb-1 block text-sm font-medium text-fg">Store</label>
                <select
                  value={storeId}
                  onChange={(event) => setStoreId(event.target.value)}
                  className={inputStyles}
                >
                  <option value="">Select store</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name || store.store_name}
                    </option>
                  ))}
                </select>
                {selectedStoreHelperCount !== undefined && (
                  <p className="mt-1 text-xs text-fg-muted">
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
                className="w-full rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {actionLoading ? "Processing..." : "Start Trip"}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <p className="font-semibold text-fg">
                  Shipment No: {trip.shipment_no || trip.ticket_no}
                </p>
                {trip.vehicle_unit && (
                  <p className="text-fg-muted">Vehicle: {trip.vehicle_unit.plate_number}</p>
                )}
              </div>

              {!hasOpenStop && (
                <button
                  onClick={handleArrivedAtStore}
                  disabled={actionLoading}
                  className="w-full rounded-xl border border-border bg-surface-active px-6 py-3 text-fg transition-colors hover:bg-surface-hover disabled:opacity-50 sm:w-auto"
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
                    className="w-full rounded-xl bg-primary px-6 py-3 text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                  >
                    {actionLoading ? "Processing..." : "Delivered"}
                  </button>
                </div>
              )}

              {canCompleteTrip && (
                <div className="space-y-3 border-t border-border pt-4">
                  <PhotoInput
                    id="stamped-invoice"
                    label="Stamped Invoice Photo"
                    helpText="Upload the invoice with the receiving stamp before completing the trip."
                    onChange={setStampedInvoicePhoto}
                  />
                  <button
                    onClick={handleCompleteTrip}
                    disabled={actionLoading || !stampedInvoicePhoto}
                    className="w-full rounded-xl bg-success px-6 py-3 text-success-foreground transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                  >
                    {actionLoading ? "Processing..." : "Complete Trip"}
                  </button>
                </div>
              )}
            </div>
          )}
    </>
  );

  const leaveContent = (
    <LeaveHistoryList leaves={leaves} onChanged={loadLeaves} />
  );

  const fileLeaveButton = (
    <button
      onClick={() => setShowLeaveModal(true)}
      className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
    >
      + File Leave
    </button>
  );

  // The 4 at-a-glance cards requested for the driver dashboard: Current
  // Trip, Wallet, Trip Summary, File Leave. On the mobile tabbed layout
  // each (except File Leave, which is always a direct action) switches
  // to its matching tab; on the desktop grid every section is already
  // visible below, so the cards are informational only.
  const quickCards = (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <QuickCard
        label="Current Trip"
        value={trip ? `#${trip.shipment_no || trip.ticket_no}` : "None"}
        sub={trip ? "Active now" : "No active trip"}
        onClick={!isDesktop ? () => setActiveTab("trip") : undefined}
      />
      <QuickCard
        label="Wallet"
        value={`₱${(walletQuick?.earnings ?? 0).toLocaleString()}`}
        sub={walletQuick?.cutoff_label || "This cutoff"}
        onClick={!isDesktop ? () => setActiveTab("wallet") : undefined}
      />
      <QuickCard
        label="Trip Summary"
        value={tripSummary?.total_completed ?? 0}
        sub={`${tripSummary?.pending_trips ?? 0} pending approval`}
        onClick={!isDesktop ? () => setActiveTab("history") : undefined}
      />
      <QuickCard
        label="File Leave"
        value={leaves.length}
        sub="+ New request"
        onClick={() => setShowLeaveModal(true)}
        highlight
      />
    </div>
  );

  // Same content that used to only live behind the "Trip Management" >
  // "Trips" sidebar link (src/pages/Driver/DriverTrips.jsx) -- brought
  // onto the dashboard so a driver sees it all in one place.
  const tripManagementContent = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard title="Active Trips" value={tripSummary?.active_trips ?? 0} />
        <SummaryCard title="Pending Approval" value={tripSummary?.pending_trips ?? 0} />
        <SummaryCard title="Completed Today" value={tripSummary?.completed_today ?? 0} />
        <SummaryCard title="Total Completed" value={tripSummary?.total_completed ?? 0} />
      </div>
      <ActiveTripCard activeTrip={trip} />
      <TripTable title="Trips Waiting For Admin Approval" trips={pendingTrips} />
      <TripTable title="Completed Trips (Payroll Reference)" trips={completedTrips} />
    </div>
  );

  return (
    <div
      className={
        isDesktop
          ? "min-h-screen space-y-4 bg-background p-4"
          : "mx-auto min-h-screen max-w-md space-y-5 bg-background px-4 pb-10 pt-4"
      }
    >
      <div className="rounded-3xl border border-border bg-linear-to-br from-primary/10 via-surface to-surface p-5 text-fg shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">
              {getGreeting()}, {driverName}
            </h1>
            <p className="text-sm text-fg-muted">
              {new Date().toLocaleDateString()}
            </p>
          </div>
          <div className="sm:text-right">
            <p className="text-sm text-fg-muted">Current Time</p>
            <p className="text-lg font-semibold sm:text-xl">
              {currentTime.toLocaleTimeString()}
            </p>
          </div>
        </div>
      </div>

      {quickCards}

      {isDesktop ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <DashboardCard title="Current Trip" className="xl:col-span-2">
            <div className="rounded-2xl border border-border bg-background p-4 text-fg sm:p-6">
              {tripWorkflowContent}
            </div>
          </DashboardCard>

          <WalletCard />

          <DashboardCard title="Leave Requests" action={fileLeaveButton}>
            {leaveContent}
          </DashboardCard>

          <div className="xl:col-span-2">
            <h2 className="mb-3 text-base font-bold text-fg">
              Trip Management
            </h2>
            {tripManagementContent}
          </div>
        </div>
      ) : (
        <>
          {/* TABS */}
          <div className="grid grid-cols-4 gap-1 rounded-2xl bg-surface-active p-1">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-xl py-2 text-xs font-semibold transition-colors ${
                  activeTab === tab.key
                    ? "bg-primary text-primary-foreground shadow"
                    : "text-fg-muted"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "trip" && (
            <div className="rounded-2xl border border-border bg-surface p-4 text-fg sm:p-6">
              {tripWorkflowContent}
            </div>
          )}

          {activeTab === "wallet" && (
            <section>
              <WalletCard />
            </section>
          )}

          {activeTab === "history" && (
            <section>
              <h2 className="mb-3 text-base font-bold text-fg">
                Trip Management
              </h2>
              {tripManagementContent}
            </section>
          )}

          {activeTab === "leave" && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-bold text-fg">
                  Leave Requests
                </h2>
                {fileLeaveButton}
              </div>
              {leaveContent}
            </section>
          )}
        </>
      )}

      {showLeaveModal && (
        <LeaveRequestModal
          onClose={() => setShowLeaveModal(false)}
          onFiled={loadLeaves}
        />
      )}
    </div>
  );
};

// One of the 4 at-a-glance dashboard cards (Current Trip / Wallet / Trip
// Summary / File Leave). Renders as a button (clickable) when `onClick`
// is passed, otherwise a plain info tile.
const QuickCard = ({ label, value, sub, onClick, highlight }) => {
  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      onClick={onClick}
      className={`rounded-2xl border border-border bg-surface p-4 text-left text-fg shadow-sm ${
        onClick ? "cursor-pointer transition-colors hover:bg-surface-hover" : ""
      } ${highlight ? "ring-2 ring-primary" : ""}`}
    >
      <p className="text-xs text-fg-muted">{label}</p>
      <p className="mt-1 truncate text-xl font-bold">{value}</p>
      {sub && <p className="mt-1 truncate text-xs text-fg-subtle">{sub}</p>}
    </Tag>
  );
};

const PhotoInput = ({ id, label, helpText, onChange }) => (
  <div>
    <label htmlFor={id} className="mb-1 block text-sm font-medium text-fg">
      {label}
    </label>
    {helpText && <p className="mb-2 text-xs text-fg-muted">{helpText}</p>}
    <input
      id={id}
      type="file"
      accept="image/*"
      capture="environment"
      required
      onChange={(event) => onChange(event.target.files?.[0] || null)}
      className="w-full rounded-lg border border-border bg-background p-2 text-fg"
    />
  </div>
);

export default DriverDashboard;
