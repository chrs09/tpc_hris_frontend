// "Urgent" label and "Other unit" (with the coordinator's reason) for a
// trip -- set on Trip Assignment (app/services/vehicle_assignment.py).
// Renders nothing for a normal trip in the driver's own unit.
export default function TripUnitTags({ trip }) {
  if (!trip?.is_urgent && !trip?.unit_reason) return null;
  return (
    <>
      {trip.is_urgent && (
        <span className="inline-flex whitespace-nowrap rounded-full bg-danger/15 px-2 py-0.5 text-[10px] font-semibold normal-case text-danger">
          Urgent
        </span>
      )}
      {trip.unit_reason && (
        <span
          title={`Not the driver's own unit: ${trip.unit_reason}`}
          className="inline-flex max-w-[16rem] truncate rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold normal-case text-warning"
        >
          Other unit: {trip.unit_reason}
        </span>
      )}
    </>
  );
}
