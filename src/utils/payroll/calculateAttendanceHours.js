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

  const scheduleInMinutes = inHour * 60 + inMinute;

  const scheduleOutMinutes = outHour * 60 + outMinute;

  const scheduleDurationMinutes = scheduleOutMinutes - scheduleInMinutes;

  // =====================================
  // ACTUAL ATTENDANCE
  // =====================================

  const actualInMinutes = checkIn.getHours() * 60 + checkIn.getMinutes();

  const actualOutMinutes = checkOut.getHours() * 60 + checkOut.getMinutes();

  // Ignore early login
  const effectiveInMinutes = Math.max(actualInMinutes, scheduleInMinutes);

  // =====================================
  // RENDERED HOURS
  // =====================================

  let renderedHours =
    (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);

  // deduct lunch
  renderedHours -= 1;

  if (renderedHours < 0) {
    renderedHours = 0;
  }

  // =====================================
  // REGULAR HOURS
  // =====================================

  // const regularHours =
  //   Math.min(renderedHours, 8);

  // const undertimeHours =
  //   Math.max(
  //     8 - regularHours,
  //     0
  //   );

  let expectedHours;

  if (scheduleOutMinutes <= scheduleInMinutes) {
    expectedHours = (1440 - scheduleInMinutes + scheduleOutMinutes) / 60;
  } else {
    expectedHours = (scheduleOutMinutes - scheduleInMinutes) / 60;
  }

  // deduct lunch if your policy requires it
  expectedHours = Math.max(expectedHours - 1, 0);

  const regularHours = Math.min(renderedHours, expectedHours);

  const undertimeHours = Math.max(expectedHours - regularHours, 0);

  // =====================================
  // OVERTIME
  // =====================================

  // Difference from scheduled timeout
  const overtimeMinutes = actualOutMinutes - scheduleOutMinutes;

  let overtimeHours = 0;

  if (overtimeMinutes >= 60) {
    overtimeHours = Math.floor(overtimeMinutes / 60);
  }

  console.log("PAYROLL RESULT", {
    attendanceDate,
    renderedHours,
    regularHours,
    undertimeHours,
    overtimeHours,
    actualInMinutes,
    actualOutMinutes,
    effectiveInMinutes,
    scheduleDurationMinutes,
    overtimeMinutes,
  });

  return {
    renderedHours: Number(renderedHours.toFixed(2)),
    regularHours: Number(regularHours.toFixed(2)),
    undertimeHours: Number(undertimeHours.toFixed(2)),
    overtimeHours: Number(overtimeHours.toFixed(2)),
  };
}
