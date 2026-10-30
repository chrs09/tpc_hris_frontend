// Trips a driver / helper did in the cutoff that payroll doesn't pay yet
// (GET /payroll-runs/trip-check). Payroll pays a trip only when it's
// COMPLETED (Finance approved) and there's attendance on its day. A manual
// route ride (status MANUAL, no trip) needs neither, so it's always paid.

export const TRIP_STATUS_LABELS = {
  ASSIGNED: "Dispatched, not started",
  ACTIVE: "In progress",
  PENDING_MANUAL_APPROVAL: "Manual entry -- waiting for superadmin",
  PENDING_APPROVAL: "Waiting for coordinator",
  PENDING_OFFICE_REVIEW: "Waiting for office review",
  PENDING_FINANCE_REVIEW: "Waiting for finance",
  COMPLETED: "Completed",
  APPROVED: "Completed",
  MANUAL: "Route Ride Manual",
};

const NEEDS_NO_APPROVAL = ["COMPLETED", "APPROVED", "MANUAL"];

export const tripStatusLabel = (status) => TRIP_STATUS_LABELS[status] || status;

// Why this trip isn't in the pay.
export const notPaidReason = (trip) => {
  const reasons = [];
  if (!NEEDS_NO_APPROVAL.includes(trip.status)) {
    reasons.push("Not approved yet");
  }
  if (!trip.has_attendance) reasons.push("No attendance that day");
  return reasons.join(" · ");
};

// "3 trips not paid yet (2 Waiting for finance, 1 No attendance that day)"
export const unpaidTripsWarning = (trips) => {
  if (!trips.length) return null;
  const counts = {};
  trips.forEach((trip) => {
    const key = NEEDS_NO_APPROVAL.includes(trip.status)
      ? "No attendance that day"
      : tripStatusLabel(trip.status);
    counts[key] = (counts[key] || 0) + 1;
  });
  const parts = Object.entries(counts).map(([label, n]) => `${n} ${label}`);
  return `${trips.length} trip${trips.length === 1 ? "" : "s"} not paid yet (${parts.join(", ")})`;
};
