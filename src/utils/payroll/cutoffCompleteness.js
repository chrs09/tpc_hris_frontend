import { addDays, format } from "date-fns";
import { getExpectedHoursForDate } from "./attendance/attendanceTimeUtils";

// Completeness check for one employee's cutoff: every scheduled working
// day should have an attendance record -- valid or not (present, absent,
// on leave, missing time out...). A day with no record at all (e.g. the
// system was down and nobody entered it) is otherwise silently left out
// of the pay computation, so it's listed here to be fixed first.
//
// Holidays and days that haven't happened yet don't count as missing.
export const getCutoffCompleteness = ({
  schedule,
  records,
  cutoffStart,
  cutoffEnd,
  holidayDates = [],
  today = new Date(),
}) => {
  const empty = { expectedDays: 0, recordedDays: 0, missingDates: [], holidayDates: [] };
  if (!cutoffStart || !cutoffEnd) {
    return { ...empty, hasSchedule: !!schedule };
  }
  if (!schedule) {
    return { ...empty, hasSchedule: false };
  }

  const recorded = new Set(records.map((record) => record.attendance_date));
  const holidays = new Set(holidayDates);
  const lastDay = format(today, "yyyy-MM-dd") < cutoffEnd ? format(today, "yyyy-MM-dd") : cutoffEnd;

  let expectedDays = 0;
  let recordedDays = 0;
  const missingDates = [];
  // Holidays that fall on this employee's working days (not counted).
  const workdayHolidays = [];
  for (
    let day = new Date(`${cutoffStart}T00:00:00`);
    format(day, "yyyy-MM-dd") <= lastDay;
    day = addDays(day, 1)
  ) {
    const key = format(day, "yyyy-MM-dd");
    if (getExpectedHoursForDate(schedule, key) <= 0) continue;
    if (holidays.has(key)) {
      workdayHolidays.push(key);
      continue;
    }
    expectedDays += 1;
    if (recorded.has(key)) recordedDays += 1;
    else missingDates.push(key);
  }
  return {
    expectedDays,
    recordedDays,
    missingDates,
    holidayDates: workdayHolidays,
    hasSchedule: true,
  };
};

export const formatMissingDates = (dates) =>
  dates.map((d) => format(new Date(`${d}T00:00:00`), "MMM d")).join(", ");
