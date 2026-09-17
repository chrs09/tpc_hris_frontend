import React, { useEffect, useState } from "react";
import {
  getAdminTripSummary,
  getAssignedTrips,
  getActiveTrips,
} from "../../api/adminTripManagement/trips";

import SummaryCard from "../../components/adminTrips/SummaryCards";
import AssignedTripsMonitor from "../../components/adminTrips/AssignedTripsMonitor";
import ActiveTripsMonitor from "../../components/adminTrips/ActiveTripsMonitor";
import SectionTabs from "../../components/ui/sectionTabs/SectionTabs";

// Trip Dashboard -- a live look at every trip currently in motion:
// dispatched but not yet checked out ("Assigned"), and checked out and
// in progress ("Active", with the real driver-triggered step shown per
// trip -- Checkout, Arrived, Unloading, Delivered, Checkin). Trips
// waiting on coordinator/office/finance approval live on their own
// review pages instead (Trip Approvals, Trip Confirmation, Finance).
const TripDashboard = () => {
  const [summary, setSummary] = useState({});
  const [assignedTrips, setAssignedTrips] = useState([]);
  const [activeTrips, setActiveTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadTrips = async () => {
    try {
      const [s, a, act] = await Promise.all([
        getAdminTripSummary(),
        getAssignedTrips(),
        getActiveTrips(),
      ]);

      setSummary(s.data);
      setAssignedTrips(a.data);
      setActiveTrips(act.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const init = async () => {
      await loadTrips();
      setLoading(false);
    };
    init();

    // Silent background refresh, same pattern as Trip Approvals -- keeps
    // live status current without a spinner/flicker, paused while the
    // tab isn't visible.
    let refreshing = false;
    const tick = async () => {
      if (refreshing || document.visibilityState !== "visible") return;
      refreshing = true;
      try {
        await loadTrips();
      } finally {
        refreshing = false;
      }
    };
    const interval = setInterval(tick, 15000);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen text-fg-subtle text-sm">
        Loading trip data...
      </div>
    );

  return (
    <div className="space-y-5">
      <SectionTabs group="Trip Management" />

      {/* SUMMARY */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <SummaryCard label="Assigned Trips" value={summary.assigned_trips} />
        <SummaryCard label="Active Trips" value={summary.active_trips} />
        <SummaryCard
          label="Completed Today"
          value={summary.completed_today}
        />
      </div>

      {/* ASSIGNED */}
      <div>
        <h2 className="text-lg sm:text-xl font-semibold text-fg mb-4">
          Assigned Trips
        </h2>

        <p className="mb-4 text-sm text-fg-subtle">
          Dispatched to a driver, but not yet checked out (started).
        </p>

        <AssignedTripsMonitor trips={assignedTrips} />
      </div>

      {/* ACTIVE */}
      <div>
        <h2 className="text-lg sm:text-xl font-semibold text-fg mb-4">
          Active Trips
        </h2>

        <p className="mb-4 text-sm text-fg-subtle">
          Checked out and in progress -- Status reflects whatever step the
          driver last triggered on their phone.
        </p>

        <ActiveTripsMonitor trips={activeTrips} />
      </div>
    </div>
  );
};

export default TripDashboard;
