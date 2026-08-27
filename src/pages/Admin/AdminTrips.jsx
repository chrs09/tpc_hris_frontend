import React, { useEffect, useState } from "react";
import {
  getAdminTripSummary,
  getPendingTrips,
  getCompletedTrips,
  getActiveTrips,
} from "../../api/adminTripManagement/trips";
import { getUnknownStops } from "../../api/adminTripManagement/stores";

import SummaryCard from "../../components/adminTrips/SummaryCards";
import PendingTripsCard from "../../components/adminTrips/PendingTripsCard";
import ActiveTripsMonitor from "../../components/adminTrips/ActiveTripsMonitor";
import UnknownStoresCard from "../../components/adminTrips/UnknownStoresCard";

const AdminTrips = () => {
  const [summary, setSummary] = useState({});
  const [pendingTrips, setPendingTrips] = useState([]);
  const [activeTrips, setActiveTrips] = useState([]);
  const [unknownStops, setUnknownStops] = useState([]);
  const [loading, setLoading] = useState(true);

  const [completedTrips, setCompletedTrips] = useState([]);
  const [activeTab, setActiveTab] = useState("pending");

  const [successMessage, setSuccessMessage] = useState("");

  const loadTrips = async () => {
    try {
      const [s, p, c, a, u] = await Promise.all([
        getAdminTripSummary(),
        getPendingTrips(),
        getCompletedTrips(),
        getActiveTrips(),
        getUnknownStops(),
      ]);

      setSummary(s.data);
      setPendingTrips(p.data);
      setCompletedTrips(c.data);
      setActiveTrips(a.data);
      setUnknownStops(u.data);
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
  }, []);

  const handleTripApproved = async () => {
    await loadTrips();
    // NOTE: approval now hands the trip to finance for review instead of
    // marking it complete, so the copy reflects that instead of "approved".
    setSuccessMessage("Trip approved and sent for finance review ✔");

    setTimeout(() => {
      setSuccessMessage("");
    }, 3000);
  };

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-500 text-sm">
        Loading trip data...
      </div>
    );

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 bg-gray-50 min-h-screen space-y-8">
      {/* SUCCESS MESSAGE */}
      {successMessage && (
        <div className="bg-green-100 border border-green-300 text-green-800 px-4 py-3 rounded-xl shadow-sm">
          {successMessage}
        </div>
      )}

      {/* SUMMARY */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <SummaryCard label="Pending Trips" value={summary.pending_trips} />
        <SummaryCard label="Active Trips" value={summary.active_trips} />
        <SummaryCard label="Unknown Check-ins" value={unknownStops.length} />
        <SummaryCard label="Completed Today" value={summary.completed_today} />
      </div>

      {/* PENDING */}
      <div>
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
          Pending Trip Approvals
        </h2>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab("pending")}
            className={`px-4 py-2 rounded-lg ${
              activeTab === "pending"
                ? "bg-yellow-400 text-black"
                : "bg-gray-200"
            }`}
          >
            Pending ({pendingTrips.length})
          </button>

          <button
            onClick={() => setActiveTab("completed")}
            className={`px-4 py-2 rounded-lg ${
              activeTab === "completed"
                ? "bg-yellow-400 text-black"
                : "bg-gray-200"
            }`}
          >
            Completed ({completedTrips.length})
          </button>
        </div>

        <PendingTripsCard
          trips={activeTab === "pending" ? pendingTrips : completedTrips}
          refreshTrips={handleTripApproved}
          mode={activeTab}
        />
      </div>

      {/* ACTIVE + UNKNOWN */}
      <div className="grid grid-cols-1 xl:grid-cols-1 gap-6 xl:gap-5">
        <div className="xl:col-span-2">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
            Active Trips Monitoring
          </h2>

          <ActiveTripsMonitor trips={activeTrips} />
        </div>

        <div className="xl:col-span-1">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
            Unknown Store Check-ins
          </h2>

          <UnknownStoresCard stops={unknownStops} />
        </div>
      </div>
    </div>
  );
};

export default AdminTrips;
