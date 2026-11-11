import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { getPendingOfficeTrips } from "../../api/officeTripManagement/trip";

import OfficePendingTripsCard from "../../components/officeTripManagement/OfficePendingTripsCard";
import SectionTabs from "../../components/ui/sectionTabs/SectionTabs";
import TripDocumentsView from "../../components/officeTripManagement/TripDocumentsView";

// Trip Document: the review queue (coordinator-approved trips to verify and
// forward to Finance) and "All Trips" -- every trip with its document status.
const VIEWS = [
  { key: "review", label: "For Review" },
  { key: "all", label: "All Trips" },
];

export default function OfficeTripReview() {
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get("view") === "all" ? "all" : "review";
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

  const header = (
    <>
      <SectionTabs group="Trip Management" />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-fg">Trip Document</h1>
          <p className="mt-1 text-sm text-fg-subtle">
            {view === "all"
              ? "Every trip with its document status and who's responsible for it now."
              : "Review coordinator-approved trips before forwarding them to Finance."}
          </p>
        </div>
        <div className="flex rounded-xl border border-border p-0.5 text-sm">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              type="button"
              onClick={() => setSearchParams(v.key === "all" ? { view: "all" } : {})}
              className={`rounded-lg px-4 py-1.5 font-medium ${
                view === v.key ? "bg-primary text-primary-foreground" : "text-fg-muted hover:text-fg"
              }`}
            >
              {v.label}
              {v.key === "review" && !loading && ` (${trips.length})`}
            </button>
          ))}
        </div>
      </div>
    </>
  );

  if (view === "all") {
    return (
      <div className="space-y-5">
        {header}
        <TripDocumentsView />
      </div>
    );
  }

  // =========================================================
  // LOADING
  // =========================================================
  if (loading) {
    return (
      <div className="space-y-5">
        {header}
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
      <div className="space-y-5">
        {header}
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
      {header}

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
