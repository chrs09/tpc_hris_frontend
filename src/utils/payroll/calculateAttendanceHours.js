// Lunch break window: 12:00 PM - 1:00 PM, in real Asia/Manila local time.
// See toLocalMinutes() below for why this can be expressed in normal local
// time here instead of being pre-shifted to match raw storage.
const LUNCH_BREAK_START_MINUTES = 12 * 60;
const LUNCH_BREAK_END_MINUTES = 13 * 60;

// Business timezone offset. schedule_template time strings (e.g. "00:00:00")
// and the checkIn/checkOut Date objects are both read in this environment as
// raw UTC clock values (via getHours()/getMinutes()), NOT pre-converted to
// Asia/Manila (UTC+8) local time. Converting minute-of-day values with a
// simple flat subtraction/addition works for most schedules, but breaks for
// any schedule whose local start hour is before 8AM (e.g. ADMIN 2's 7AM
// Mon-Thu start): shifting by 8 hours pushes the raw value past midnight,
// making an ordinary same-day shift look like it wraps to the next day.
// toLocalMinutes() converts a raw UTC minute-of-day into a true Asia/Manila
// local minute-of-day, handling that day-rollover correctly, so every
// downstream calculation (duration, overnight detection, lunch-crossing)
// can just work in normal local time.
const TIMEZONE_OFFSET_MINUTES = 8 * 60; // Asia/Manila = UTC+8

function toLocalMinutes(rawMinutes) {
  return ((rawMinutes + TIMEZONE_OFFSET_MINUTES) % 1440 + 1440) % 1440;
}

function formatLocalTimeFromMinutes(minutes) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

// Only counts as "crossing" lunch if the range fully spans 12:00-1:00PM.
// A half-day that ends at/before 12:00 (e.g. 8AM-12PM) never reaches the
// break window, so no lunch hour should be deducted for it.
function crossesLunchBreak(startMinutes, endMinutes) {
  if (endMinutes <= startMinutes) return false; // genuine overnight shift, skip
  return (
    startMinutes <= LUNCH_BREAK_START_MINUTES &&
    endMinutes >= LUNCH_BREAK_END_MINUTES
  );
}

export function calculateAttendanceHours({
  checkIn,
  checkOut,
  schedule,
  attendanceDate,
}) {
  if (!checkIn || !checkOut || !schedule) {
    return {
      renderedHours: 0,
      regularHours: 0,
      undertimeHours: 0,
      overtimeHours: 0,
    };
  }

  // =====================================
  // DETERMINE DAY SCHEDULE
  // =====================================

  const dayName = new Date(attendanceDate + "T00:00:00")
    .toLocaleDateString("en-US", {
      weekday: "long",
    })
    .toLowerCase();

  const scheduleInStr = schedule?.[`${dayName}_in`];

  const scheduleOutStr = schedule?.[`${dayName}_out`];

  if (!scheduleInStr || !scheduleOutStr) {
    return {
      renderedHours: 0,
      regularHours: 0,
      undertimeHours: 0,
      overtimeHours: 0,
    };
  }

  const [inHour, inMinute] = scheduleInStr.split(":").map(Number);

  const [outHour, outMinute] = scheduleOutStr.split(":").map(Number);

  const scheduleInMinutesRaw = inHour * 60 + inMinute;

  const scheduleOutMinutesRaw = outHour * 60 + outMinute;

  const scheduleInMinutes = toLocalMinutes(scheduleInMinutesRaw);

  const scheduleOutMinutes = toLocalMinutes(scheduleOutMinutesRaw);

  const scheduleDurationMinutes = scheduleOutMinutes - scheduleInMinutes;

  const scheduledTimeIn = formatLocalTimeFromMinutes(scheduleInMinutes);
  const scheduledTimeOut = formatLocalTimeFromMinutes(scheduleOutMinutes);

  // =====================================
  // ACTUAL ATTENDANCE
  // =====================================

  const actualInMinutes = toLocalMinutes(
    checkIn.getHours() * 60 + checkIn.getMinutes(),
  );

  const actualOutMinutes = toLocalMinutes(
    checkOut.getHours() * 60 + checkOut.getMinutes(),
  );

  // Ignore early login
  const effectiveInMinutes = Math.max(actualInMinutes, scheduleInMinutes);

  // =====================================
  // RENDERED HOURS (total time present, lunch INCLUDED)
  // =====================================

  let renderedHours =
    (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);

  if (renderedHours < 0) {
    renderedHours = 0;
  }

  // =====================================
  // REGULAR HOURS (worked time AFTER deducting the 1hr lunch,
  // only if the actual attendance spans the lunch window)
  // =====================================

  let workedHoursAfterLunch = renderedHours;

  const lunchDeducted = crossesLunchBreak(actualInMinutes, actualOutMinutes);

  if (lunchDeducted) {
    workedHoursAfterLunch -= 1;
  }

  if (workedHoursAfterLunch < 0) {
    workedHoursAfterLunch = 0;
  }

  let expectedHours;

  if (scheduleOutMinutes <= scheduleInMinutes) {
    expectedHours = (1440 - scheduleInMinutes + scheduleOutMinutes) / 60;
  } else {
    expectedHours = (scheduleOutMinutes - scheduleInMinutes) / 60;
  }

  // deduct lunch from the expected/schedule side only if the schedule
  // itself spans the lunch window (e.g. an 8AM-12PM half day never does)
  if (crossesLunchBreak(scheduleInMinutes, scheduleOutMinutes)) {
    expectedHours = Math.max(expectedHours - 1, 0);
  }

  const regularHours = Math.min(workedHoursAfterLunch, expectedHours);

  // const undertimeHours = Math.max(expectedHours - regularHours, 0);

  // =====================================
  // OVERTIME
  // =====================================

  // Difference from scheduled timeout
  const overtimeMinutes = actualOutMinutes - scheduleOutMinutes;

  let overtimeHours = 0;

  if (overtimeMinutes >= 60) {
    overtimeHours = Math.floor(overtimeMinutes / 60);
  }

  // const tardinessMinutes = Math.max(actualInMinutes - scheduleInMinutes, 0);
  // const tardinessHours = Number((tardinessMinutes / 60).toFixed(2));
  // const deductionHours = Number((tardinessHours + undertimeHours).toFixed(2));

  const tardinessMinutes = Math.max(
      actualInMinutes - scheduleInMinutes,
      0
  );

  const tardinessHours = Number(
      (tardinessMinutes / 60).toFixed(2)
  );

  let undertimeMinutes = 0;

  if (actualOutMinutes < scheduleOutMinutes) {

      undertimeMinutes =
          scheduleOutMinutes - actualOutMinutes;

      // Employee worked only the morning.
      // Don't count the 12PM-1PM lunch hour as undertime.
      if (
          !lunchDeducted &&
          crossesLunchBreak(scheduleInMinutes, scheduleOutMinutes) &&
          actualOutMinutes <= LUNCH_BREAK_START_MINUTES
      ) {
          undertimeMinutes -= 60;
      }

      undertimeMinutes = Math.max(
          undertimeMinutes,
          0
      );
  }

  const undertimeHours = Number(
      (undertimeMinutes / 60).toFixed(2)
  );

  console.log("PAYROLL RESULT", {
    attendanceDate,
    dayName,
    scheduleInStr,
    scheduleOutStr,
    scheduleInMinutes,
    scheduleOutMinutes,
    expectedHours,
    renderedHours,
    workedHoursAfterLunch,
    regularHours,
    undertimeHours,
    overtimeHours,
    actualInMinutes,
    actualOutMinutes,
    tardinessMinutes,
    tardinessHours,
    effectiveInMinutes,
    scheduleDurationMinutes,
    overtimeMinutes,
    lunchDeducted,
  });

  // return {
  //   scheduledTimeIn,
  //   scheduledTimeOut,
  //   renderedHours: Number(renderedHours.toFixed(2)),
  //   regularHours: Number(regularHours.toFixed(2)),
  //   undertimeHours: Number(undertimeHours.toFixed(2)),
  //   overtimeHours: Number(overtimeHours.toFixed(2)),
  //   tardinessMinutes,
  //   tardinessHours,
  //   deductionHours,
  // };
    return {
        scheduledTimeIn,
        scheduledTimeOut,

        renderedHours: Number(renderedHours.toFixed(2)),
        regularHours: Number(regularHours.toFixed(2)),
        overtimeHours: Number(overtimeHours.toFixed(2)),

        tardinessMinutes,
        tardinessHours,

        undertimeMinutes,
        undertimeHours,
    };
}