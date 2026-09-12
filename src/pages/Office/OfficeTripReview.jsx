import { useCallback, useEffect, useState } from "react";

import { getPendingOfficeTrips } from "../../api/officeTripManagement/trip";

import OfficePendingTripsCard from "../../components/officeTripManagement/OfficePendingTripsCard";
import SectionTabs from "../../components/ui/sectionTabs/SectionTabs";

export default function OfficeTripReview() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // =========================================================
  // FETCH PENDING OFFICE TRIPS
  // =========================================================
  const fetchTrips = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getPendingOfficeTrips();

      setTrips(response.data || []);
    } catch (err) {
      console.error("Failed to fetch pending office trips:", err);

      setError(
        err.response?.data?.detail || "Failed to load trips for office review.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // =========================================================
  // INITIAL LOAD
  // =========================================================
  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  // =========================================================
  // LOADING
  // =========================================================
  if (loading) {
    return (
      <div className="p-6">
        <div className="bg-surface rounded-xl border border-border p-6">
          <p className="text-fg-subtle">Loading trips for office review...</p>
        </div>
      </div>
    );
  }

  // =========================================================
  // ERROR
  // =========================================================
  if (error) {
    return (
      <div className="p-6">
        <div className="bg-danger/15 border border-danger rounded-xl p-6">
          <p className="text-danger">{error}</p>

          <button
            type="button"
            onClick={fetchTrips}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // =========================================================
  // PAGE
  // =========================================================
  return (
    <div className="space-y-5">
      <SectionTabs group="Trip Management" />

      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-fg">Office Trip Review</h1>

        <p className="text-sm text-fg-subtle mt-1">
          Review coordinator-approved trips before forwarding them to Finance.
        </p>
      </div>

      {/* SUMMARY */}
      <div className="mb-6 bg-surface border border-border rounded-xl p-4">
        <p className="text-sm text-fg-subtle">Pending Office Reviews</p>

        <p className="text-3xl font-bold mt-1 text-fg">{trips.length}</p>
      </div>

      {/* EMPTY */}
      {trips.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl p-10 text-center">
          <p className="font-semibold text-fg-muted">
            No trips pending office review
          </p>

          <p className="text-sm text-fg-subtle mt-1">
            Coordinator-approved trips will appear here.
          </p>
        </div>
      ) : (
        <OfficePendingTripsCard trips={trips} refreshTrips={fetchTrips} />
      )}
    </div>
  );
}
