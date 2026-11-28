// src/pages/Driver/DriverTrips.jsx
// Driver -> Trip Management (web): today's numbers, the trip on the road,
// and the driver's trips by period. Dates only (the time is still saved).

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock, Route, Truck } from "lucide-react";
import { getTripSummary, getActiveTrip, getMyTrips } from "../../api/driver/trips";

import SummaryCard from "../../components/driverTrips/SummaryCard";
import ActiveTripCard from "../../components/driverTrips/ActiveTripCard";
import TripTable from "../../components/driverTrips/TripTable";
import { IN_REVIEW } from "../../components/driverTrips/tripDisplay";
import {
  ALL_DATES,
  periodLabel,
  periodParams,
  recentCutoffs,
  toCutoffOptions,
} from "../../utils/tripPeriod";
import TripPeriodFilter from "../../components/adminTrips/TripPeriodFilter";
import { getTripPeriods } from "../../api/payroll/payrollCutoffs";

const DriverTrips = () => {
  const [summary, setSummary] = useState(null);
  const [activeTrip, setActiveTrip] = useState(null);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  // Period filter for the trip lists: all dates, one of the driver's
  // payroll cutoffs with its payday (the last year), or custom dates.
  const [period, setPeriod] = useState(ALL_DATES);
  const [cutoffs, setCutoffs] = useState([]);
  const [filtering, setFiltering] = useState(false);

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
    // Their payroll group's cutoffs with paydays (same as payroll).
    getTripPeriods()
      .then((data) => {
        const periods = data?.mine?.periods || [];
        setCutoffs(periods.length ? toCutoffOptions(periods) : recentCutoffs(24));
      })
      .catch(() => setCutoffs(recentCutoffs(24)));
  }, []);

  const changePeriod = async (next) => {
    setPeriod(next);
    // Custom dates: wait until both ends are picked.
    if (next.mode === "custom" && (!next.from || !next.to)) return;
    try {
      setFiltering(true);
      setTrips(await getMyTrips(periodParams(next)));
    } catch (error) {
      console.error("Driver trips filter failed:", error);
    } finally {
      setFiltering(false);
    }
  };

  const inReview = useMemo(() => trips.filter((t) => IN_REVIEW.includes(t.status)), [trips]);
  const completed = useMemo(() => trips.filter((t) => t.status === "COMPLETED"), [trips]);

  if (loading) {
    return <div className="p-6 text-sm text-fg-subtle">Loading trips...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">My Trips</h1>
        <p className="mt-1 text-sm text-fg-subtle">
          Your trip on the road, trips being checked, and completed trips used for your pay.
        </p>
      </div>

      {summary && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SummaryCard title="On the road" value={summary.active_trips} icon={Truck} />
          <SummaryCard
            title="Being checked"
            value={summary.pending_trips}
            icon={Clock}
            tone="text-warning bg-warning/15"
          />
          <SummaryCard
            title="Completed today"
            value={summary.completed_today}
            icon={CheckCircle2}
            tone="text-success bg-success/15"
          />
          <SummaryCard
            title="Total completed"
            value={summary.total_completed}
            icon={Route}
            tone="text-fg-muted bg-surface-hover"
          />
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-fg">Active trip</h2>
        <ActiveTripCard activeTrip={activeTrip} />
      </section>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-surface p-3">
        <TripPeriodFilter id="driver-trips-period" value={period} cutoffs={cutoffs} onChange={changePeriod} />
        <span className="text-xs text-fg-subtle">
          {filtering ? "Loading..." : `Showing ${periodLabel(period, cutoffs)} · by trip start date`}
        </span>
      </div>

      <TripTable
        title="Being checked"
        subtitle="Waiting for the coordinator, Office or Finance. Not paid yet."
        trips={inReview}
        emptyText="No trips waiting to be checked."
      />

      <TripTable
        title="Completed trips"
        subtitle="Cleared by Finance. These are the trips your pay is based on."
        trips={completed}
        emptyText="No completed trips in this period."
      />
    </div>
  );
};

export default DriverTrips;
