// Scoped ONLY to the Work Schedules admin page (api/scheduleTemplates) --
// NOT applied to schedule_template data consumed elsewhere (Attendance,
// Payroll, the Employee form), since not every schedule template's
// stored time is actually in UTC (some rows are already correct PH
// wall-clock time), and applying this conversion to those other
// consumers previously corrupted live payroll OT calculations. Until the
// underlying data is audited/cleaned up row by row, this display-only
// conversion stays confined to the Work Schedules page itself.

const SCHEDULE_DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const SCHEDULE_TIME_FIELDS = SCHEDULE_DAYS.flatMap((day) => [
  `${day}_in`,
  `${day}_out`,
]);

// Shifts a "HH:MM" or "HH:MM:SS" time-of-day string by `hours`, wrapping
// around midnight -- there's no date attached, so this is pure clock
// arithmetic, not a real UTC offset conversion. `includeSeconds` controls
// the output format: the backend's own GET responses use "HH:MM:SS", but
// its parse_time() on create/update only accepts strict "HH:MM" and 400s
// on anything else -- so the write path must trim seconds back off.
const shiftTimeString = (value, hours, includeSeconds = true) => {
  if (!value) return value;

  const parts = value.split(":").map(Number);
  const [h, m = 0, s = 0] = parts;
  if (Number.isNaN(h)) return value;

  let totalMinutes = h * 60 + m + hours * 60;
  totalMinutes = ((totalMinutes % 1440) + 1440) % 1440;

  const newH = Math.floor(totalMinutes / 60);
  const newM = totalMinutes % 60;

  const pad = (n) => String(n).padStart(2, "0");
  return includeSeconds
    ? `${pad(newH)}:${pad(newM)}:${pad(s)}`
    : `${pad(newH)}:${pad(newM)}`;
};

const shiftScheduleFields = (source, hours, includeSeconds = true) => {
  if (!source) return source;

  const shifted = { ...source };
  SCHEDULE_TIME_FIELDS.forEach((field) => {
    if (source[field]) {
      shifted[field] = shiftTimeString(source[field], hours, includeSeconds);
    }
  });
  return shifted;
};

// UTC (as stored/returned by the backend) -> PH local, for display on the
// Work Schedules page.
export const scheduleToPh = (source) => shiftScheduleFields(source, 8);

// PH local (as entered in the Work Schedules edit form) -> UTC, for
// saving -- "HH:MM" only, to match the backend's strict parse_time()
// format.
export const scheduleToUtc = (source) =>
  shiftScheduleFields(source, -8, false);
