// "Urgent" label and "Other unit" (with the coordinator's reason) for a
// trip -- set on Trip Assignment (app/services/vehicle_assignment.py) --
// plus "2nd trip of the day" etc. when it's not the driver's first trip
// that day (`trip_of_day` from the Trip Dashboard lists).
// Renders nothing for a normal first trip in the driver's own unit.

const ordinal = (n) => {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${{ 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th"}`;
};

export default function TripUnitTags({ trip }) {
  const succeeding = trip?.trip_of_day > 1;
  if (!trip?.is_urgent && !trip?.unit_reason && !succeeding) return null;
  return (
    <>
      {succeeding && (
        <span
          title="Not the driver's first trip that day"
          className="inline-flex whitespace-nowrap rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold normal-case text-primary"
        >
          {ordinal(trip.trip_of_day)} trip of the day
        </span>
      )}
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
