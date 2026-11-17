import DateRangeFilter from "../ui/datePicker/DateRangeFilter";
import { ALL_DATES } from "../../utils/tripPeriod";

// Period filter for trip lists (Trip Approvals, a driver's Trips): all
// dates, a payroll cutoff with its payday (the payroll group's rule, same
// as the Payroll page), or custom dates. Matched on the trip's start date
// by the backend (app/services/trip_date_filter.py).
//
// value:   { mode: "all" | "cutoff" | "custom", cutoff, from, to }
// cutoffs: options from utils/tripPeriod (toCutoffOptions), newest first
// groups / group / onGroupChange (optional, admin): pick whose payroll
//   cutoffs to list, since groups can be paid on different cutoffs.

const selectClass =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30";

export default function TripPeriodFilter({
  id = "trip-period",
  value,
  cutoffs,
  onChange,
  groups = null,
  group = "",
  onGroupChange,
}) {
  const current = cutoffs[0]?.value;
  const selectValue =
    value.mode === "cutoff" ? `cutoff:${value.cutoff}` : value.mode === "custom" ? "custom" : "all";

  const pick = (raw) => {
    if (raw === "all") return onChange(ALL_DATES);
    if (raw === "custom") {
      // Start from the cutoff they were on, else this cutoff.
      const base = cutoffs.find((c) => c.value === value.cutoff) || cutoffs[0] || {};
      return onChange({ mode: "custom", cutoff: null, from: base.from || null, to: base.to || null });
    }
    const option = cutoffs.find((c) => `cutoff:${c.value}` === raw);
    if (!option) return undefined;
    return onChange({ mode: "cutoff", cutoff: option.value, from: option.from, to: option.to });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {groups && groups.length > 1 && (
        <>
          <label htmlFor={`${id}-group`} className="text-sm text-fg-muted">
            Payroll group
          </label>
          <select
            id={`${id}-group`}
            value={group}
            onChange={(e) => onGroupChange?.(e.target.value)}
            className={selectClass}
          >
            {groups.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </>
      )}
      <label htmlFor={id} className="text-sm text-fg-muted">
        Period
      </label>
      <select
        id={id}
        value={selectValue}
        onChange={(e) => pick(e.target.value)}
        className={selectClass}
      >
        <option value="all">All dates</option>
        <optgroup label="Cutoff · payday">
          {cutoffs.map((c) => (
            <option key={c.value} value={`cutoff:${c.value}`}>
              {c.label}
              {c.value === current ? " (this cutoff)" : ""}
            </option>
          ))}
        </optgroup>
        <option value="custom">Custom dates...</option>
      </select>
      {value.mode === "custom" && (
        <DateRangeFilter
          from={value.from}
          to={value.to}
          onChange={({ from, to }) => onChange({ mode: "custom", cutoff: null, from, to })}
        />
      )}
    </div>
  );
}
