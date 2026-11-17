// Period values for trip lists (TripPeriodFilter): all dates, a payroll
// cutoff with its payday (from the payroll group's rule -- backend
// GET /payroll-cutoffs/trip-periods), or custom dates. A cutoff is sent
// as its date range, so it shows exactly the trips started in it.
//
// cutoff option: { value, label: "Oct 16 - Oct 31, 2026 · Payday Nov 15",
//                  from: "2026-10-16", to: "2026-10-31", payout }

export const ALL_DATES = { mode: "all", cutoff: null, from: null, to: null };

// Backend periods -> cutoff options.
export const toCutoffOptions = (periods = []) =>
  periods.map((p) => ({
    value: `${p.from}_${p.to}`,
    label: p.label,
    from: p.from,
    to: p.to,
    payout: p.payout,
  }));

// Fallback when the periods can't be loaded: 1st-15th / 16th-end, no payday.
const phToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
const pad = (n) => String(n).padStart(2, "0");
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const recentCutoffs = (count = 24) => {
  const [y, m, d] = phToday().split("-").map(Number);
  let year = y;
  let month = m;
  let half = d <= 15 ? 1 : 2;
  const list = [];
  for (let i = 0; i < count; i += 1) {
    const lastDay = new Date(year, month, 0).getDate();
    const [startDay, endDay] = half === 1 ? [1, 15] : [16, lastDay];
    const name = MONTHS[month - 1];
    const from = `${year}-${pad(month)}-${pad(startDay)}`;
    const to = `${year}-${pad(month)}-${pad(endDay)}`;
    list.push({
      value: `${from}_${to}`,
      label: `${name} ${pad(startDay)} - ${name} ${pad(endDay)}, ${year}`,
      from,
      to,
      payout: null,
    });
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

// Query params for the trip list endpoints (both modes send dates).
export const periodParams = (value) => {
  if ((value?.mode === "cutoff" || value?.mode === "custom") && (value.from || value.to)) {
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
