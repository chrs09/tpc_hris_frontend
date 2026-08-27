import {
  LUNCH_BREAK_START_MINUTES,
  LUNCH_BREAK_END_MINUTES,
  MORNING_SHIFT_END_MINUTES,
  AFTERNOON_SHIFT_START_MINUTES,
  toLocalMinutes,
  formatLocalTimeFromMinutes,
  crossesLunchBreak,
} from "./attendanceTimeUtils";

// =====================================================
// STANDARD ATTENDANCE CALCULATOR
// =====================================================
//
// This function handles the actual time calculation.
//
// Payroll-specific behavior is selected by:
//
// calculateWeeklyHours()
// calculateSemiMonthlyHours()
// calculateMonthlyHours()
//
// =====================================================

export function calculateStandardAttendanceHours({
  checkIn,
  checkOut,
  schedule,
  attendanceDate,
}) {
  // ===================================================
  // INVALID INPUT
  // ===================================================

  if (!checkIn || !checkOut || !schedule) {
    return {
      renderedHours: 0,
      regularHours: 0,
      overtimeHours: 0,

      tardinessMinutes: 0,
      tardinessHours: 0,

      undertimeMinutes: 0,
      undertimeHours: 0,

      firstHalfAbsent: false,
      secondHalfAbsent: false,

      scheduledTimeIn: "--",
      scheduledTimeOut: "--",
    };
  }

  // ===================================================
  // DETERMINE DAY
  // ===================================================

  const dayName = new Date(`${attendanceDate}T00:00:00`)
    .toLocaleDateString("en-US", {
      weekday: "long",
    })
    .toLowerCase();

  const scheduleInStr = schedule?.[`${dayName}_in`];

  const scheduleOutStr = schedule?.[`${dayName}_out`];

  // ===================================================
  // NO SCHEDULE
  // ===================================================

  if (!scheduleInStr || !scheduleOutStr) {
    return {
      renderedHours: 0,
      regularHours: 0,
      overtimeHours: 0,

      tardinessMinutes: 0,
      tardinessHours: 0,

      undertimeMinutes: 0,
      undertimeHours: 0,

      firstHalfAbsent: false,
      secondHalfAbsent: false,

      scheduledTimeIn: "--",
      scheduledTimeOut: "--",
    };
  }

  // ===================================================
  // SCHEDULE MINUTES
  // ===================================================

  const [inHour, inMinute] = scheduleInStr.split(":").map(Number);

  const [outHour, outMinute] = scheduleOutStr.split(":").map(Number);

  const scheduleInMinutes = toLocalMinutes(inHour * 60 + inMinute);

  const scheduleOutMinutes = toLocalMinutes(outHour * 60 + outMinute);

  const scheduledTimeIn = formatLocalTimeFromMinutes(scheduleInMinutes);

  const scheduledTimeOut = formatLocalTimeFromMinutes(scheduleOutMinutes);

  // ===================================================
  // ACTUAL TIME
  // ===================================================

  const actualInMinutes = toLocalMinutes(
    checkIn.getHours() * 60 + checkIn.getMinutes(),
  );

  const actualOutMinutes = toLocalMinutes(
    checkOut.getHours() * 60 + checkOut.getMinutes(),
  );

  // ===================================================
  // RENDERED HOURS
  // ===================================================
  //
  // Total elapsed time between actual IN and OUT.
  //
  // Lunch is included here.
  //
  // Example:
  //
  // 08:20 AM → 05:49 PM
  //
  // Rendered:
  // approximately 9.48 hours
  //
  // ===================================================

  let renderedHours =
    (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);

  if (renderedHours < 0) {
    renderedHours = 0;
  }

  // ===================================================
  // DETECT HALF-DAY ABSENCE
  // ===================================================

  // ---------------------------------------------------
  // FIRST HALF ABSENT
  // ---------------------------------------------------
  //
  // Example:
  //
  // 12:40 PM → 05:17 PM
  //
  // Time-in occurs during lunch.
  //
  // Therefore:
  //
  // 08:00 AM → 12:00 PM
  // = FIRST HALF ABSENT
  //
  // 12:00 PM → 01:00 PM
  // = LUNCH
  //
  // 01:00 PM → 05:00 PM
  // = SECOND HALF WORKED
  //
  // ---------------------------------------------------

  const firstHalfAbsent =
    actualInMinutes >= LUNCH_BREAK_START_MINUTES &&
    actualInMinutes < LUNCH_BREAK_END_MINUTES;

  // ---------------------------------------------------
  // SECOND HALF ABSENT
  // ---------------------------------------------------
  //
  // Example:
  //
  // 08:00 AM → 12:00 PM
  //
  // Employee completed the morning half
  // but did not work the afternoon.
  //
  // ---------------------------------------------------

  const secondHalfAbsent =
    actualOutMinutes > 0 && actualOutMinutes <= MORNING_SHIFT_END_MINUTES;

  // ===================================================
  // EXPECTED HOURS
  // ===================================================

  let expectedHours;

  if (scheduleOutMinutes <= scheduleInMinutes) {
    expectedHours = (1440 - scheduleInMinutes + scheduleOutMinutes) / 60;
  } else {
    expectedHours = (scheduleOutMinutes - scheduleInMinutes) / 60;
  }

  // ===================================================
  // SCHEDULE LUNCH
  // ===================================================

  if (crossesLunchBreak(scheduleInMinutes, scheduleOutMinutes)) {
    expectedHours = Math.max(expectedHours - 1, 0);
  }

  // ===================================================
  // REGULAR HOURS
  // ===================================================

  let regularHours = 0;

  // ---------------------------------------------------
  // CASE 1: FIRST HALF ABSENT
  // ---------------------------------------------------
  //
  // Example:
  //
  // 12:40 PM → 05:17 PM
  //
  // Work starts at 01:00 PM.
  //
  // 01:00 PM → 05:00 PM
  // = 4 regular hours
  //
  // The 12:40 PM → 01:00 PM period is lunch.
  //
  // It is NOT:
  //
  // - regular work
  // - tardiness
  // - undertime
  //
  // ---------------------------------------------------

  if (firstHalfAbsent) {
    const secondHalfWorkedMinutes = Math.max(
      actualOutMinutes - AFTERNOON_SHIFT_START_MINUTES,
      0,
    );

    const secondHalfScheduledMinutes = Math.max(
      scheduleOutMinutes - AFTERNOON_SHIFT_START_MINUTES,
      0,
    );

    regularHours = Math.min(
      secondHalfWorkedMinutes / 60,
      secondHalfScheduledMinutes / 60,
    );
  }

  // ---------------------------------------------------
  // CASE 2: SECOND HALF ABSENT
  // ---------------------------------------------------
  //
  // Example:
  //
  // 08:00 AM → 12:00 PM
  //
  // Regular = 4 hours
  //
  // No UT because this is an intentional
  // second-half absence.
  //
  // ---------------------------------------------------
  else if (secondHalfAbsent) {
    const morningWorkedMinutes = Math.max(
      actualOutMinutes - scheduleInMinutes,
      0,
    );

    const morningScheduledMinutes = Math.max(
      MORNING_SHIFT_END_MINUTES - scheduleInMinutes,
      0,
    );

    regularHours = Math.min(
      morningWorkedMinutes / 60,
      morningScheduledMinutes / 60,
    );
  }

  // ---------------------------------------------------
  // CASE 3
  // NORMAL FULL-DAY ATTENDANCE
  //
  // DO NOT calculate regular hours here yet.
  //
  // We need tardiness and undertime first.
  // They are calculated below.
  // ---------------------------------------------------

  // ===================================================
  // TARDINESS
  // ===================================================
  //
  // IMPORTANT:
  //
  // If employee arrives during lunch:
  //
  // 12:40 PM
  //
  // this is NOT 4h40m tardiness.
  //
  // Their second-half work starts at 1:00 PM.
  //
  // Therefore:
  //
  // 12:40 PM → 1:00 PM = lunch
  // 1:00 PM onward    = work
  //
  // ===================================================

  let tardinessMinutes = 0;

  // ---------------------------------------------------
  // FIRST HALF ABSENCE
  // ---------------------------------------------------

  if (firstHalfAbsent) {
    // Arriving during lunch is not tardiness.
    tardinessMinutes = 0;
  }

  // ---------------------------------------------------
  // NORMAL LATE ARRIVAL
  // ---------------------------------------------------
  else if (actualInMinutes > scheduleInMinutes) {
    tardinessMinutes = actualInMinutes - scheduleInMinutes;
  }

  tardinessMinutes = Math.max(tardinessMinutes, 0);

  const tardinessHours = Number((tardinessMinutes / 60).toFixed(2));

  // ===================================================
  // UNDERTIME
  // ===================================================

  let undertimeMinutes = 0;

  // ---------------------------------------------------
  // FIRST HALF ABSENCE
  // ---------------------------------------------------
  //
  // 12:40 PM → 05:17 PM
  //
  // The employee completed the second half.
  //
  // Therefore:
  //
  // UT = 0
  //
  // ---------------------------------------------------

  if (firstHalfAbsent) {
    undertimeMinutes = 0;
  }

  // ---------------------------------------------------
  // SECOND HALF ABSENCE
  // ---------------------------------------------------
  //
  // 08:00 AM → 12:00 PM
  //
  // The employee completed the morning half.
  //
  // This is not an undertime deduction.
  //
  // ---------------------------------------------------
  else if (secondHalfAbsent) {
    undertimeMinutes = 0;
  }

  // ---------------------------------------------------
  // NORMAL EARLY-OUT
  // ---------------------------------------------------
  else if (actualOutMinutes < scheduleOutMinutes) {
    undertimeMinutes = scheduleOutMinutes - actualOutMinutes;

    // If the employee leaves before lunch,
    // do not count the lunch hour as UT.

    if (
      crossesLunchBreak(scheduleInMinutes, scheduleOutMinutes) &&
      actualOutMinutes <= LUNCH_BREAK_START_MINUTES
    ) {
      undertimeMinutes -= 60;
    }

    undertimeMinutes = Math.max(undertimeMinutes, 0);
  }

  const undertimeHours = Number((undertimeMinutes / 60).toFixed(2));

  // ===================================================
  // FINAL REGULAR HOURS
  // ===================================================
  //
  // For normal full-day attendance:
  //
  // Expected Hours
  // - Tardiness
  // - Undertime
  // = Payable Regular Hours
  //
  // This is the important correction.
  //
  // Example:
  //
  // Schedule = 08:00 → 17:00
  // Expected = 8.00 hours
  //
  // Time In = 08:20
  // Tardiness = 0.33 hr
  //
  // Regular:
  //
  // 8.00 - 0.33
  // = 7.67 hours
  //
  // We do NOT deduct tardiness again in PayrollList.
  //
  // ===================================================

  if (!firstHalfAbsent && !secondHalfAbsent) {
    const payableRegularHours = Math.max(
      expectedHours - tardinessHours - undertimeHours,
      0,
    );

    regularHours = Number(payableRegularHours.toFixed(2));
  }

  // ===================================================
  // SAFETY LIMIT
  // ===================================================
  //
  // Regular hours should never exceed expected
  // scheduled hours.
  //
  // Overtime is handled separately.
  //
  // ===================================================

  regularHours = Math.min(regularHours, expectedHours);

  // ===================================================
  // OVERTIME
  // ===================================================

  let overtimeHours = 0;

  const overtimeMinutes = actualOutMinutes - scheduleOutMinutes;

  // Only count OT when at least 60 minutes
  // were rendered beyond the scheduled end.
  //
  // Example:
  //
  // 05:49 PM
  // 05:00 PM
  //
  // = 49 minutes
  // = 0 OT
  //
  // 06:18 PM
  // 05:00 PM
  //
  // = 78 minutes
  // = 1 OT hour
  //
  if (overtimeMinutes >= 60) {
    overtimeHours = Math.floor(overtimeMinutes / 60);
  }

  // ===================================================
  // DEBUG
  // ===================================================

  console.log("PAYROLL ATTENDANCE RESULT", {
    attendanceDate,

    scheduleInStr,
    scheduleOutStr,

    actualInMinutes,
    actualOutMinutes,

    renderedHours,
    expectedHours,

    regularHours,

    overtimeHours,

    tardinessMinutes,
    tardinessHours,

    undertimeMinutes,
    undertimeHours,

    firstHalfAbsent,
    secondHalfAbsent,

    scheduledTimeIn,
    scheduledTimeOut,
  });

  // ===================================================
  // RESULT
  // ===================================================

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

    firstHalfAbsent,

    secondHalfAbsent,
  };
}
