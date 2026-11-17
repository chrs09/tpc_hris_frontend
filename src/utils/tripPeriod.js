// Period values for trip lists (TripPeriodFilter): all dates, a trip-pay
// cutoff (1st-15th / 16th-end, same as the driver wallet), or custom dates.

export const ALL_DATES = { mode: "all", cutoff: null, from: null, to: null };

const phToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
const pad = (n) => String(n).padStart(2, "0");
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const cutoffOf = (year, month, half) => {
  const lastDay = new Date(year, month, 0).getDate(); // month is 1-12
  const [startDay, endDay] = half === 1 ? [1, 15] : [16, lastDay];
  const name = MONTHS[month - 1];
  return {
    value: `${year}-${pad(month)}-${half}`,
    label: `${name} ${pad(startDay)} - ${name} ${pad(endDay)}, ${year}`,
    from: `${year}-${pad(month)}-${pad(startDay)}`,
    to: `${year}-${pad(month)}-${pad(endDay)}`,
  };
};

// The last `count` cutoffs, newest (the current one) first.
export const recentCutoffs = (count = 24) => {
  const [y, m, d] = phToday().split("-").map(Number);
  let year = y;
  let month = m;
  let half = d <= 15 ? 1 : 2;
  const list = [];
  for (let i = 0; i < count; i += 1) {
    list.push(cutoffOf(year, month, half));
    if (half === 2) half = 1;
    else {
      half = 2;
      month -= 1;
      if (month === 0) {
        month = 12;
        year -= 1;
      }
    }
  }
  return list;
};

// Query params for the trip list endpoints.
export const periodParams = (value) => {
  if (value?.mode === "cutoff" && value.cutoff) return { cutoff: value.cutoff };
  if (value?.mode === "custom" && (value.from || value.to)) {
    return {
      ...(value.from ? { date_from: value.from } : {}),
      ...(value.to ? { date_to: value.to } : {}),
    };
  }
  return {};
};

export const periodLabel = (value, cutoffs = []) => {
  if (value?.mode === "cutoff") {
    return cutoffs.find((c) => c.value === value.cutoff)?.label || "Cutoff";
  }
  if (value?.mode === "custom") return "Custom dates";
  return "All dates";
};

