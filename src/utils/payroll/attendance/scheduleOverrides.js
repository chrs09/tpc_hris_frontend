// Approved schedule changes (backend app/api/schedule_changes.py): a
// different time in / out for one date, on top of the regular schedule.
//
// The schedule template's times are stored 8 hours behind PH (the readers
// below add TIMEZONE_OFFSET_MINUTES back), while a schedule change is in
// PH time -- so an override is shifted into the template's stored form
// and every existing calculation (late, undertime, expected hours, half
// day) works on it unchanged.

const pad = (n) => String(n).padStart(2, "0");

// "10:00" (PH) -> "02:00:00" (stored form).
export const phToStoredTime = (hhmm) => {
  if (!hhmm) return null;
  const [h, m = 0] = hhmm.split(":").map(Number);
  const total = (((h * 60 + m - 8 * 60) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}:00`;
};

// The schedule with that employee's approved changes attached:
// overrides = { "YYYY-MM-DD": { time_in: "HH:MM", time_out: "HH:MM" } }.
export const withScheduleOverrides = (schedule, overrides) => {
  if (!overrides || !Object.keys(overrides).length) return schedule;
  return { ...(schedule || {}), _overrides: overrides };
};

// That date's stored in / out: the approved change, else the weekday's.
export const scheduleTimesForDate = (schedule, attendanceDate) => {
  const override = schedule?._overrides?.[attendanceDate];
  if (override?.time_in && override?.time_out) {
    return {
      inStr: phToStoredTime(override.time_in),
      outStr: phToStoredTime(override.time_out),
      changed: true,
    };
  }
  const dayName = new Date(`${attendanceDate}T00:00:00`)
    .toLocaleDateString("en-US", { weekday: "long" })
    .toLowerCase();
  return {
    inStr: schedule?.[`${dayName}_in`],
    outStr: schedule?.[`${dayName}_out`],
    changed: false,
  };
};
