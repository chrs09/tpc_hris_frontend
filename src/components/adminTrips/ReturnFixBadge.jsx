// Badge for a trip Office returned to Trip Approvals: still to fix, handed
// to a coordinator, or fixed by them and back with the coordinator admin.
// See send_to_coordinator in app/api/admin/trips.py.
export default function ReturnFixBadge({ trip, className = "" }) {
  if (!trip?.return_reason) return null;
  const base = `inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold normal-case ${className}`;
  if (trip.fix_status === "fixed") {
    return (
      <span title={trip.resolved_note || trip.return_reason} className={`${base} bg-success/15 text-success`}>
        Fixed{trip.resolver_name ? ` by ${trip.resolver_name}` : ""}
      </span>
    );
  }
  if (trip.fix_status === "with_coordinator") {
    return (
      <span title={trip.resolver_note || trip.return_reason} className={`${base} bg-warning/20 text-warning`}>
        With {trip.resolver_name || "coordinator"}
      </span>
    );
  }
  return (
    <span title={`Sent back for correction: ${trip.return_reason}`} className={`${base} bg-danger/15 text-danger`}>
      Correction Requested
    </span>
  );
}
