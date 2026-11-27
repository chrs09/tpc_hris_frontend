import { addDays, format } from "date-fns";

// Rest-day and holiday premium for trip-based pay (drivers / helpers).
//
// Rest days come from the employee's Trip-based Work Schedule (unticked
// days); with no trip-based schedule the rest day is Sunday. The premium is
// a share of the trip's BASIC only -- the allowance and other parts are paid
// as usual: basic + basic x premium + allowance.
//
// Rates follow the usual DOLE percentages (premium on top of the 100%):
//   rest day                          +30%  (130%)
//   special non-working holiday       +30%  (130%)
//   special holiday on a rest day     +50%  (150%)
//   regular holiday                  +100%  (200%)
//   regular holiday on a rest day    +160%  (260%)
// A special working holiday is an ordinary day.

const DAY_SHORT = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const dayShort = (isoDate) => DAY_SHORT[new Date(`${isoDate}T00:00:00`).getDay()];

export const isTripRestDay = (schedule, isoDate) => {
  if (schedule?.is_trip_based) {
    return !(schedule.work_days || "").split(",").includes(dayShort(isoDate));
  }
  return dayShort(isoDate) === "sun";
};

const RATES = {
  rest: { pct: 0.3, label: "Rest day" },
  special_non_working: { pct: 0.3, label: "Special holiday" },
  special_non_working_rest: { pct: 0.5, label: "Special holiday on rest day" },
  regular: { pct: 1.0, label: "Regular holiday" },
  regular_rest: { pct: 1.6, label: "Regular holiday on rest day" },
};

// { pct, label } for that day, or null when it's an ordinary work day.
export const tripPremiumFor = (schedule, isoDate, holidayType) => {
  const rest = isTripRestDay(schedule, isoDate);
  if (holidayType === "regular" || holidayType === "special_non_working") {
    const key = rest ? `${holidayType}_rest` : holidayType;
    return RATES[key];
  }
  return rest ? RATES.rest : null;
};

// Work days in [from, to] (up to today) with no trip -- holidays and rest
// days don't count.
export const noTripWorkDays = ({ schedule, from, to, tripDates, holidayDates, today = new Date() }) => {
  if (!from || !to) return { workDays: 0, noTripDates: [] };
  const todayKey = format(today, "yyyy-MM-dd");
  const last = todayKey < to ? todayKey : to;
  const trips = new Set(tripDates);
  const holidays = new Set(holidayDates);
  let workDays = 0;
  const noTripDates = [];
  for (let day = new Date(`${from}T00:00:00`); format(day, "yyyy-MM-dd") <= last; day = addDays(day, 1)) {
    const key = format(day, "yyyy-MM-dd");
    if (isTripRestDay(schedule, key) || holidays.has(key)) continue;
    workDays += 1;
    if (!trips.has(key)) noTripDates.push(key);
  }
  return { workDays, noTripDates };
};
