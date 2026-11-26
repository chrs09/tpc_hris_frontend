import React, { useEffect, useState, useCallback } from "react";
import {
  checkIn,
  checkOut,
  checkinTrip,
  checkoutTrip,
  getActiveTrip,
  startUnloading,
} from "../../api/tripManagement";
import { getMyTrips, getTripSummary, getWallet } from "../../api/driver/trips";
import { getMyLeaveRequests } from "../../api/leave";
import { getMyCashAdvanceBalance } from "../../api/cashAdvanceRequests";
import WalletCard from "../../components/driverDashboard/WalletCard";
import MyPayslipsList from "../../components/payslips/MyPayslipsList";
import useMyTripExpenses from "../../components/tripExpenses/MyTripExpenses";
import LeaveHistoryList from "../../components/leave/LeaveHistoryList";
import LeaveRequestModal from "../../components/leave/LeaveRequestModal";
import DashboardCard from "../../components/dashboard/DashboardCard";
import {
  Boxes,
  CalendarPlus,
  Car,
  CheckCheck,
  Clock,
  Navigation,
  Package,
  Trophy,
  Wallet,
  Zap,
} from "lucide-react";
import ActiveTripCard from "../../components/driverTrips/ActiveTripCard";
import TripTable from "../../components/driverTrips/TripTable";
import useIsDesktop from "../../hooks/useIsDesktop";
import { alertDialog } from "../../components/ui/dialog/dialogService";

const getErrorMessage = (error) =>
  error.response?.data?.detail || error.message || "Something went wrong.";

const DriverDashboard = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [tripData, setTripData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // ---- Step 1: Checkout ----
  const [odometerReading, setOdometerReading] = useState("");
  const [invoicePhoto, setInvoicePhoto] = useState(null);
  const [lmPhoto, setLmPhoto] = useState(null);
  const [lmStampedPhoto, setLmStampedPhoto] = useState(null);

  // ---- Step 4: Start Unloading ----
  const [unloadingPhoto, setUnloadingPhoto] = useState(null);

  // ---- Step 5: Delivered ----
  const [deliveryProofPhoto, setDeliveryProofPhoto] = useState(null);

  // ---- Step 6: Checkin ----
  const [stampedInvoicePhoto, setStampedInvoicePhoto] = useState(null);

  const [tripHistory, setTripHistory] = useState([]);
  const [tripSummary, setTripSummary] = useState(null);
  const [walletQuick, setWalletQuick] = useState(null);
  // Cash advance still owed (approved, not fully paid) -- same tile as the
  // mobile driver dashboard.
  const [caBalance, setCaBalance] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [activeTab, setActiveTab] = useState("trip");
  // Trip budgets (released, then liquidated) and expense reports.
  const tripExpenses = useMyTripExpenses();
  const isDesktop = useIsDesktop();

  const driverName =
    (localStorage.getItem("full_name") || localStorage.getItem("username") || "Driver").split(" ")[0];

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

    getMyCashAdvanceBalance()
      .then((data) => setCaBalance(data.total_outstanding ?? 0))
      .catch((error) => console.error("Failed to load cash advance balance:", error));

    loadHistory();
    loadSummary();
    loadWalletQuick();
    loadLeaves();
  }, [loadLeaves]);

  const loadTrip = async () => {
    try {
      const activeTripData = await getActiveTrip();
      setTripData(activeTripData);
    } catch (error) {
      console.error(error);
      alertDialog(getErrorMessage(error));
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

  // ---- Step 1: Checkout ----
  // Destination store(s) are picked by the coordinator at dispatch now --
  // this only records the odometer reading and three required photos,
  // and immediately starts the trip (no separate "Start Trip" step).
  const handleCheckout = async () => {
    if (!odometerReading.trim() || !invoicePhoto || !lmPhoto || !lmStampedPhoto) {
      alertDialog(
        "Odometer reading, invoice photo, LM photo, and LM (stamped checkout) photo are all required.",
      );
      return;
    }

    try {
      setActionLoading(true);
      const location = await getCurrentLocation();
      const formData = new FormData();
      formData.append("odometer_reading", odometerReading.trim());
      formData.append("lat", location.lat);
      formData.append("long", location.long);
      formData.append("invoice_photo", invoicePhoto);
      formData.append("lm_photo", lmPhoto);
      formData.append("lm_checkout_stamped_photo", lmStampedPhoto);

      await checkoutTrip(tripData.active_trip.id, formData);

      setOdometerReading("");
      setInvoicePhoto(null);
      setLmPhoto(null);
      setLmStampedPhoto(null);
      await loadTrip();
    } catch (error) {
      alertDialog(getErrorMessage(error));
    } finally {
      setActionLoading(false);
    }
  };

  // ---- Step 2: Arrived at Store (button only) ----
  const handleArrivedAtStore = async () => {
    try {
      setActionLoading(true);
      const location = await getCurrentLocation();
      await checkIn(tripData.active_trip.id, location);
      await loadTrip();
    } catch (error) {
      alertDialog(getErrorMessage(error));
    } finally {
      setActionLoading(false);
    }
  };

  // ---- Step 4: Start Unloading ----
  const handleStartUnloading = async () => {
    if (!unloadingPhoto) {
      alertDialog("Upload a picture of the unloading before continuing.");
      return;
    }

    try {
      setActionLoading(true);
      const location = await getCurrentLocation();
      const formData = new FormData();
      formData.append("lat", location.lat);
      formData.append("long", location.long);
      formData.append("photo", unloadingPhoto);

      await startUnloading(
        tripData.active_trip.id,
        tripData.latest_stop.id,
        formData,
      );
      setUnloadingPhoto(null);
      await loadTrip();
    } catch (error) {
      alertDialog(getErrorMessage(error));
    } finally {
      setActionLoading(false);
    }
  };

  // ---- Step 5: Delivered ----
  const handleDelivered = async () => {
    if (!deliveryProofPhoto) {
      alertDialog("Upload delivery proof before marking this stop as delivered.");
      return;
    }

    try {
      setActionLoading(true);
      const location = await getCurrentLocation();
      const formData = new FormData();
      formData.append("lat", location.lat);
      formData.append("long", location.long);
      formData.append("proof_photo", deliveryProofPhoto);

      await checkOut(
        tripData.active_trip.id,
        tripData.latest_stop.id,
        formData,
      );
      setDeliveryProofPhoto(null);
      await loadTrip();
    } catch (error) {
      alertDialog(getErrorMessage(error));
    } finally {
      setActionLoading(false);
    }
  };

  // ---- Step 6: Checkin (final step) ----
  const handleCheckin = async () => {
    if (!stampedInvoicePhoto) {
      alertDialog("Upload the stamped invoice before checking in.");
      return;
    }

    try {
      setActionLoading(true);
      const location = await getCurrentLocation();
      const formData = new FormData();
      formData.append("lat", location.lat);
      formData.append("long", location.long);
      formData.append("stamped_invoice_photo", stampedInvoicePhoto);

      await checkinTrip(tripData.active_trip.id, formData);
      setStampedInvoicePhoto(null);
      await loadTrip();
    } catch (error) {
      alertDialog(getErrorMessage(error));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="p-6 text-fg-muted">Loading...</div>;

  const trip = tripData?.active_trip;
  const currentStep = trip?.current_step;

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
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-fg-muted">
          No trip assigned. Your coordinator will dispatch a trip to you
          from the office.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <p className="font-semibold text-fg">
              Shipment No: {trip.ticket_no || "N/A"}
            </p>
            <p className="text-fg-muted">Step: {currentStep}</p>
            <p className="text-fg-muted">
              Trip Category: {trip.trip_rate_profile?.profile_name || "N/A"}
            </p>
            <p className="font-semibold text-fg">
              {trip.planned_stores?.length > 1
                ? `Destinations: ${trip.planned_stores.map((s) => s.store_name || `Store #${s.store_id}`).join(", ")}`
                : `Destination: ${trip.destination_name || "N/A"}`}
            </p>
          </div>

          {currentStep === "ASSIGNED" && (
            <div className="space-y-4">
              <PhotoInput
                id="invoice-photo"
                label="Invoice Photo"
                onChange={setInvoicePhoto}
              />
              <PhotoInput
                id="lm-photo"
                label="LM (Loading Manifest) Photo"
                onChange={setLmPhoto}
              />
              <PhotoInput
                id="lm-stamped-photo"
                label="LM Stamped 'Checkout' Photo"
                helpText="The LM physically stamped/marked as checked out."
                onChange={setLmStampedPhoto}
              />

              <div>
                <label className="mb-1 block text-sm font-medium text-fg">
                  Odometer Reading
                </label>
                <input
                  type="number"
                  placeholder="Enter odometer reading"
                  value={odometerReading}
                  onChange={(event) => setOdometerReading(event.target.value)}
                  className={inputStyles}
                />
              </div>

              <button
                onClick={handleCheckout}
                disabled={
                  actionLoading ||
                  !odometerReading.trim() ||
                  !invoicePhoto ||
                  !lmPhoto ||
                  !lmStampedPhoto
                }
                className="w-full rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {actionLoading ? "Processing..." : "Confirm Checkout"}
              </button>
            </div>
          )}

          {currentStep === "IN_TRANSIT" && (
            <button
              onClick={handleArrivedAtStore}
              disabled={actionLoading}
              className="w-full rounded-xl border border-border bg-surface-active px-6 py-3 text-fg transition-colors hover:bg-surface-hover disabled:opacity-50 sm:w-auto"
            >
              {actionLoading ? "Processing..." : "Arrived at Store"}
            </button>
          )}

          {currentStep === "ARRIVED" && (
            <div className="space-y-3">
              <PhotoInput
                id="unloading-photo"
                label="Unloading Photo"
                helpText="Upload a picture of the unloading in progress."
                onChange={setUnloadingPhoto}
              />
              <button
                onClick={handleStartUnloading}
                disabled={actionLoading || !unloadingPhoto}
                className="w-full rounded-xl border border-border bg-surface-active px-6 py-3 text-fg transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {actionLoading ? "Processing..." : "Start Unloading"}
              </button>
            </div>
          )}

          {currentStep === "UNLOADING" && (
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

          {currentStep === "DELIVERED" &&
            (trip.has_more_stops ? (
              <div className="space-y-3 border-t border-border pt-4">
                <button
                  onClick={handleArrivedAtStore}
                  disabled={actionLoading}
                  className="w-full rounded-xl border border-border bg-surface-active px-6 py-3 text-fg transition-colors hover:bg-surface-hover disabled:opacity-50 sm:w-auto"
                >
                  {actionLoading ? "Processing..." : "Arrived at Next Store"}
                </button>
                <p className="text-xs text-fg-subtle">
                  {(trip.total_stops ?? 0) - (trip.completed_stops ?? 0)}{" "}
                  store(s) remaining. Checking in now will complete the trip
                  without visiting them.
                </p>
                <PhotoInput
                  id="stamped-invoice-early"
                  label="Stamped Invoice Photo"
                  helpText="Upload the invoice with the receiving stamp before checking in."
                  onChange={setStampedInvoicePhoto}
                />
                <button
                  onClick={handleCheckin}
                  disabled={actionLoading || !stampedInvoicePhoto}
                  className="w-full rounded-xl bg-success px-6 py-3 text-success-foreground transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  {actionLoading ? "Processing..." : "Checkin"}
                </button>
              </div>
            ) : (
              <div className="space-y-3 border-t border-border pt-4">
                <PhotoInput
                  id="stamped-invoice"
                  label="Stamped Invoice Photo"
                  helpText="Upload the invoice with the receiving stamp before checking in."
                  onChange={setStampedInvoicePhoto}
                />
                <button
                  onClick={handleCheckin}
                  disabled={actionLoading || !stampedInvoicePhoto}
                  className="w-full rounded-xl bg-success px-6 py-3 text-success-foreground transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  {actionLoading ? "Processing..." : "Checkin"}
                </button>
              </div>
            ))}

          {/* Legacy fallback: a trip already in RETURNING from before
              Back to Source was removed can still finish via Checkin. */}
          {currentStep === "RETURNING" && (
            <div className="space-y-3 border-t border-border pt-4">
              <PhotoInput
                id="stamped-invoice-legacy"
                label="Stamped Invoice Photo"
                helpText="Upload the invoice with the receiving stamp before checking in."
                onChange={setStampedInvoicePhoto}
              />
              <button
                onClick={handleCheckin}
                disabled={actionLoading || !stampedInvoicePhoto}
                className="w-full rounded-xl bg-success px-6 py-3 text-success-foreground transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {actionLoading ? "Processing..." : "Checkin"}
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

  // The at-a-glance cards on the driver dashboard: Current Trip, Wallet,
  // CA Balance, Trip Summary, File Leave. On the mobile tabbed layout
  // each (except File Leave, which is always a direct action) switches
  // to its matching tab; on the desktop grid every section is already
  // visible below, so the cards are informational only.
  // Same cards (and colours) as the phone app's driver home. On the
  // mobile web layout the trip / wallet / history ones switch tabs.
  const quickCards = (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <DriverStat
        title="Active Trips"
        value={tripSummary?.active_trips ?? 0}
        icon={Navigation}
        tint="blue"
        onClick={!isDesktop ? () => setActiveTab("trip") : undefined}
      />
      <DriverStat
        title="Pending Approval"
        value={tripSummary?.pending_trips ?? 0}
        icon={Clock}
        tint="amber"
        onClick={!isDesktop ? () => setActiveTab("history") : undefined}
      />
      <DriverStat
        title="Completed Today"
        value={tripSummary?.completed_today ?? 0}
        icon={CheckCheck}
        tint="green"
        onClick={!isDesktop ? () => setActiveTab("history") : undefined}
      />
      <DriverStat
        title="Total Completed"
        value={tripSummary?.total_completed ?? 0}
        icon={Trophy}
        tint="violet"
        onClick={!isDesktop ? () => setActiveTab("history") : undefined}
      />
      <DriverStat
        title="CA Balance"
        value={caBalance != null ? `₱${caBalance.toLocaleString()}` : "—"}
        sub={caBalance ? "Cash advance owed" : "Nothing owed"}
        icon={Wallet}
        tint="teal"
      />
      <DriverStat
        title="Wallet"
        value={`₱${(walletQuick?.earnings ?? 0).toLocaleString()}`}
        sub={walletQuick?.cutoff_label || "This cutoff"}
        icon={Wallet}
        tint="blue"
        onClick={!isDesktop ? () => setActiveTab("wallet") : undefined}
      />
    </div>
  );

  // Same content that used to only live behind the "Trip Management" >
  // "Trips" sidebar link (src/pages/Driver/DriverTrips.jsx) -- brought
  // onto the dashboard so a driver sees it all in one place.
  const tripManagementContent = (
    <div className="space-y-4">
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
      {/* Same look as the phone app's driver home. */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 p-5 text-white shadow-lg sm:p-6">
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-blue-600/30 blur-3xl" />
        <div className="relative flex items-start justify-between gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 shadow-md shadow-blue-600/30">
            <Car size={22} />
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
            <span className="h-2 w-2 rounded-full bg-green-400" />
            {trip ? "On Trip" : "On Duty"}
          </span>
        </div>
        <div className="relative mt-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {getGreeting()}, {driverName}
            </h1>
            <p className="mt-1 text-sm text-slate-300">
              {trip ? "You have a trip in progress. Keep it up!" : "Ready to start your route today?"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold tabular-nums">
              {currentTime.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            </p>
            <p className="text-xs text-slate-400">
              {currentTime.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
            </p>
          </div>
        </div>
      </div>

      {quickCards}

      {isDesktop ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <DashboardCard
            title="Active Trip"
            subtitle={trip ? `Shipment ${trip.ticket_no || "N/A"}` : "Trip actions show here once a trip is dispatched"}
            icon={Package}
            className="xl:col-span-2"
            action={trip ? <StepBadge step={trip.current_step} /> : null}
          >
            <div className="rounded-2xl border border-border bg-background p-4 text-fg sm:p-6">
              {tripWorkflowContent}
            </div>
          </DashboardCard>

          <WalletCard />

          <DashboardCard title="Leave Requests" icon={CalendarPlus} action={fileLeaveButton}>
            {leaveContent}
          </DashboardCard>

          <DashboardCard title="Trip Expenses" icon={Zap} action={tripExpenses.button}>
            {tripExpenses.content}
          </DashboardCard>

          <MyPayslipsList
            wrap={(content) => (
              <DashboardCard title="My Payslips" className="xl:col-span-2">
                {content}
              </DashboardCard>
            )}
          />

          <div className="xl:col-span-2">
            <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-fg">
              <Boxes size={17} className="text-fg-muted" /> My Trips
            </h2>
            {tripManagementContent}
          </div>
        </div>
      ) : (
        <>
          {/* TABS */}
          <div className="grid grid-cols-4 gap-1 rounded-2xl border border-border bg-surface p-1 shadow-sm">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-xl py-2 text-xs font-semibold transition-colors ${
                  activeTab === tab.key
                    ? "bg-blue-600 text-white shadow"
                    : "text-fg-muted hover:text-fg"
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
            <section className="space-y-4">
              <WalletCard />
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-base font-bold text-fg">Trip Expenses</h2>
                  {tripExpenses.button}
                </div>
                {tripExpenses.content}
              </div>
              <MyPayslipsList
                wrap={(content) => (
                  <div>
                    <h2 className="mb-3 text-base font-bold text-fg">My Payslips</h2>
                    {content}
                  </div>
                )}
              />
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

// Stat card in the phone app's style: tinted icon circle, big number.
const TINTS = {
  blue: "bg-blue-600/10 text-blue-600 dark:text-blue-400",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  green: "bg-green-600/10 text-green-600 dark:text-green-400",
  violet: "bg-violet-600/10 text-violet-600 dark:text-violet-400",
  teal: "bg-teal-600/10 text-teal-700 dark:text-teal-400",
};

const DriverStat = ({ title, value, sub, icon: Icon, tint, onClick }) => {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={`flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 text-left text-fg shadow-sm ${
        onClick ? "cursor-pointer transition hover:-translate-y-0.5 hover:shadow-md" : ""
      }`}
    >
      <span className={`flex h-10 w-10 items-center justify-center rounded-full ${TINTS[tint]}`}>
        {Icon && <Icon size={19} />}
      </span>
      <span>
        <span className="block truncate text-xl font-bold tabular-nums">{value}</span>
        <span className="block truncate text-xs text-fg-muted">{title}</span>
        {sub && <span className="block truncate text-[11px] text-fg-subtle">{sub}</span>}
      </span>
    </Tag>
  );
};

// Trip step badge, same colours as the phone app.
const STEP_STYLE = {
  ASSIGNED: "bg-blue-600/10 text-blue-600 dark:text-blue-400",
  IN_TRANSIT: "bg-violet-600/10 text-violet-600 dark:text-violet-400",
  ARRIVED: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  UNLOADING: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  DELIVERED: "bg-green-600/10 text-green-600 dark:text-green-400",
};

const StepBadge = ({ step }) => (
  <span
    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
      STEP_STYLE[step] || "bg-surface-hover text-fg-muted"
    }`}
  >
    {(step || "").replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
  </span>
);

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
