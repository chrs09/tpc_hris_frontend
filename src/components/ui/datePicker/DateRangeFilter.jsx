import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./datePicker.css";
import { fromISODate, toISODate } from "../../../utils/isoDate";

const inputClass =
  "w-36 rounded-lg border border-border bg-background px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30";

// Date from / Date to pickers (react-datepicker). Values are "YYYY-MM-DD";
// "to" can't be before "from", and `maxDays` caps the range.
export default function DateRangeFilter({ from, to, onChange, maxDays }) {
  const start = fromISODate(from);
  const end = fromISODate(to);
  const maxEnd =
    start && maxDays ? new Date(start.getTime() + (maxDays - 1) * 86400000) : undefined;

  const pickFrom = (d) => {
    if (!d) return;
    let nextTo = end;
    if (!nextTo || nextTo < d) nextTo = d;
    if (maxDays && (nextTo - d) / 86400000 >= maxDays) {
      nextTo = new Date(d.getTime() + (maxDays - 1) * 86400000);
    }
    onChange({ from: toISODate(d), to: toISODate(nextTo) });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-fg-muted">
      <label className="flex items-center gap-1.5">
        From
        <DatePicker
          selected={start}
          onChange={pickFrom}
          selectsStart
          startDate={start}
          endDate={end}
          dateFormat="MMM d, yyyy"
          className={inputClass}
          calendarClassName="tytan-datepicker"
          popperPlacement="bottom-end"
        />
      </label>
      <label className="flex items-center gap-1.5">
        To
        <DatePicker
          selected={end}
          onChange={(d) => d && onChange({ from, to: toISODate(d) })}
          selectsEnd
          startDate={start}
          endDate={end}
          minDate={start}
          maxDate={maxEnd}
          dateFormat="MMM d, yyyy"
          className={inputClass}
          calendarClassName="tytan-datepicker"
          popperPlacement="bottom-end"
        />
      </label>
    </div>
  );
}
