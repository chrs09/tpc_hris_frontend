// Vehicle List status: In repair (an open "In repair" maintenance record --
// can't be dispatched), On a trip, or Available.
export default function UnitStatusBadge({ unit }) {
  if (unit.in_repair) {
    return (
      <span
        title={unit.in_repair.text}
        className="inline-flex whitespace-nowrap rounded-full bg-danger/15 px-3 py-1 text-xs font-semibold text-danger"
      >
        🔧 In repair
      </span>
    );
  }
  if (unit.is_available === false) {
    return (
      <span className="inline-flex whitespace-nowrap rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
        On a trip
      </span>
    );
  }
  return (
    <span className="inline-flex whitespace-nowrap rounded-full bg-success/15 px-3 py-1 text-xs font-semibold text-success">
      Available
    </span>
  );
}
