// Schedule template day in/out times are stored in the database as UTC
// (a historical seeding quirk -- see app/models/schedule_template.py on
// the backend), but every part of this app (Work Schedules page,
// Attendance/Payroll tardiness & undertime calculations, the Employee
// form) needs to work with plain PH wall-clock time. Rather than touch
// the stored data or scatter +8h/-8h math across every consumer, this
// module is the single place that converts between the two: read paths
// (getScheduleTemplates/getEmployeeList/etc.) convert UTC -> PH once,
// right after the API response comes back, and write paths (saving a
// schedule) convert PH -> UTC right before the request goes out. Every
// other file in the app can treat a schedule_template's fields as
// already-correct local time.

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
// the output format: the backend's own GET responses (and this app's
// display code) use "HH:MM:SS", but its parse_time() on create/update
// only accepts strict "HH:MM" and 400s on anything else -- so the write
// path must trim seconds back off before sending.
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

// UTC (as stored/returned by the backend) -> PH local, for display.
export const scheduleToPh = (source) => shiftScheduleFields(source, 8);

// PH local (as entered in a form) -> UTC, for saving -- "HH:MM" only, to
// match the backend's strict parse_time() format.
export const scheduleToUtc = (source) =>
  shiftScheduleFields(source, -8, false);
