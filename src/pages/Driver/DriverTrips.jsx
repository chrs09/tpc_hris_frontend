// src/pages/Driver/DriverTrips.jsx

import React, { useEffect, useState, useMemo } from "react";
import {
  getTripSummary,
  getActiveTrip,
  getMyTrips,
} from "../../api/driver/trips";

import SummaryCard from "../../components/driverTrips/SummaryCard";
import ActiveTripCard from "../../components/driverTrips/ActiveTripCard";
import TripTable from "../../components/driverTrips/TripTable";

const DriverTrips = () => {
  const [summary, setSummary] = useState(null);
  const [activeTrip, setActiveTrip] = useState(null);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [summaryData, activeData, tripsData] = await Promise.all([
          getTripSummary(),
          getActiveTrip(),
          getMyTrips(),
        ]);

        setSummary(summaryData);
        setActiveTrip(activeData.active_trip);
        setTrips(tripsData);
      } catch (error) {
        console.error("Driver dashboard failed:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const pendingTrips = useMemo(
    () => trips.filter((t) => t.status === "PENDING_APPROVAL"),
    [trips],
  );

  const completedTrips = useMemo(
    () => trips.filter((t) => t.status === "COMPLETED"),
    [trips],
  );

  if (loading) return <div className="p-6">Loading trips...</div>;

  return (
    <div className="p-6 space-y-10">
      {/* SUMMARY */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <SummaryCard title="Active Trips" value={summary.active_trips} />
          <SummaryCard title="Pending Approval" value={summary.pending_trips} />
          <SummaryCard
            title="Completed Today"
            value={summary.completed_today}
          />
          <SummaryCard
            title="Total Completed"
            value={summary.total_completed}
          />
        </div>
      )}

      {/* ACTIVE TRIP */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Active Trip Monitoring</h2>
        <ActiveTripCard activeTrip={activeTrip} />
      </section>

      {/* PENDING */}
      <TripTable
        title="Trips Waiting For Admin Approval"
        trips={pendingTrips}
      />

      {/* COMPLETED */}
      <TripTable
        title="Completed Trips (Payroll Reference)"
        trips={completedTrips}
        showDuration
      />
    </div>
  );
};

export default DriverTrips;
