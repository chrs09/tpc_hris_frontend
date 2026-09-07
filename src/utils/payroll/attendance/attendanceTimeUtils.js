// =====================================================
// ATTENDANCE TIME UTILITIES
// =====================================================

export const LUNCH_BREAK_START_MINUTES = 12 * 60; // 12:00 PM
export const LUNCH_BREAK_END_MINUTES = 13 * 60; // 1:00 PM

export const MORNING_SHIFT_START_MINUTES = 8 * 60; // 8:00 AM
export const MORNING_SHIFT_END_MINUTES = 12 * 60; // 12:00 PM

export const AFTERNOON_SHIFT_START_MINUTES = 13 * 60; // 1:00 PM
export const AFTERNOON_SHIFT_END_MINUTES = 17 * 60; // 5:00 PM

export const TIMEZONE_OFFSET_MINUTES = 8 * 60;

// =====================================================
// UTC RAW CLOCK → ASIA/MANILA CLOCK
// =====================================================

export function toLocalMinutes(rawMinutes) {
  return (((rawMinutes + TIMEZONE_OFFSET_MINUTES) % 1440) + 1440) % 1440;
}

// =====================================================
// FORMAT HH:MM
// =====================================================

export function formatLocalTimeFromMinutes(minutes) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

// =====================================================
// LUNCH CHECK
// =====================================================

export function crossesLunchBreak(startMinutes, endMinutes) {
  if (endMinutes <= startMinutes) {
    return false;
  }

  return (
    startMinutes <= LUNCH_BREAK_START_MINUTES &&
    endMinutes >= LUNCH_BREAK_END_MINUTES
  );
}

// =====================================================
// HALF-DAY CHECKS
//
// The 12:00-1:00 lunch break is a company-wide default, not a
// per-employee setting (schedule templates only store in/out times).
// It only makes sense as a "half day" split for schedules that
// actually span that window (e.g. 7-4, 8-5, 9-6). For a schedule
// that starts after lunch or ends before it (an afternoon/evening
// shift, for example), there is no lunch to arrive-during or
// leave-before, so half-day detection must not fire - otherwise an
// employee arriving early for a 1pm shift gets misread as having
// skipped their entire morning.
// =====================================================

export function isFirstHalfAbsent(
  actualInMinutes,
  scheduleInMinutes,
  scheduleOutMinutes,
) {
  if (!crossesLunchBreak(scheduleInMinutes, scheduleOutMinutes)) {
    return false;
  }

  return (
    actualInMinutes >= LUNCH_BREAK_START_MINUTES &&
    actualInMinutes < LUNCH_BREAK_END_MINUTES
  );
}

export function isSecondHalfAbsent(
  actualOutMinutes,
  scheduleInMinutes,
  scheduleOutMinutes,
) {
  if (!crossesLunchBreak(scheduleInMinutes, scheduleOutMinutes)) {
    return false;
  }

  return actualOutMinutes > 0 && actualOutMinutes <= MORNING_SHIFT_END_MINUTES;
}

// =====================================================
// SCHEDULE-ONLY LOOKUP (no check-in/check-out required)
//
// Used to find out what an employee was SCHEDULED to work on a given
// date even when there is no attendance to calculate from - e.g. an
// Absent/On Leave day still has a schedule, and the payslip needs
// that number to show "what this cutoff was worth with perfect
// attendance" for transparency.
// =====================================================

export function getScheduleMinutesForDate(schedule, attendanceDate) {
  if (!schedule || !attendanceDate) {
    return null;
  }

  const dayName = new Date(`${attendanceDate}T00:00:00`)
    .toLocaleDateString("en-US", { weekday: "long" })
    .toLowerCase();

  const scheduleInStr = schedule?.[`${dayName}_in`];
  const scheduleOutStr = schedule?.[`${dayName}_out`];

  if (!scheduleInStr || !scheduleOutStr) {
    return null;
  }

  const [inHour, inMinute] = scheduleInStr.split(":").map(Number);
  const [outHour, outMinute] = scheduleOutStr.split(":").map(Number);

  return {
    scheduleInMinutes: toLocalMinutes(inHour * 60 + inMinute),
    scheduleOutMinutes: toLocalMinutes(outHour * 60 + outMinute),
  };
}

export function getExpectedHoursForSchedule(scheduleInMinutes, scheduleOutMinutes) {
  let expectedHours;

  if (scheduleOutMinutes <= scheduleInMinutes) {
    expectedHours = (1440 - scheduleInMinutes + scheduleOutMinutes) / 60;
  } else {
    expectedHours = (scheduleOutMinutes - scheduleInMinutes) / 60;
  }

  if (crossesLunchBreak(scheduleInMinutes, scheduleOutMinutes)) {
    expectedHours = Math.max(expectedHours - 1, 0);
  }

  return expectedHours;
}

export function getExpectedHoursForDate(schedule, attendanceDate) {
  const minutes = getScheduleMinutesForDate(schedule, attendanceDate);

  if (!minutes) {
    return 0;
  }

  return Number(
    getExpectedHoursForSchedule(
      minutes.scheduleInMinutes,
      minutes.scheduleOutMinutes,
    ).toFixed(2),
  );
}
