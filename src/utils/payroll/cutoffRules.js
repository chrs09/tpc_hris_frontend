import { addDays, endOfMonth, format } from "date-fns";

// Payroll cutoff periods built from a department's rule (Payroll Cutoffs
// page; app/models/payroll_cutoff_rule.py on the backend explains each
// field). Replaces the old per-department hard-coding.

export const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const TYPE_LABELS = {
  semi_monthly: "Semi-Monthly",
  weekly: "Weekly",
  monthly: "Monthly",
};

const ymd = (date) => format(date, "yyyy-MM-dd");

// Day of a month, clamped to its last day; 0 = the last day.
const dayOf = (year, month, day) => {
  const last = endOfMonth(new Date(year, month, 1)).getDate();
  return new Date(year, month, !day ? last : Math.min(day, last));
};

const ordinal = (n) => {
  if (!n) return "month end";
  const suffix =
    n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th";
  return `${n}${suffix}`;
};

const period = (start, end, payout, rule) => ({
  label: `${format(start, "MMM dd")} - ${format(end, "MMM dd, yyyy")}`,
  cutoffStart: ymd(start),
  cutoffEnd: ymd(end),
  payoutDate: ymd(payout),
  payrollType: TYPE_LABELS[rule.schedule_type] || rule.schedule_type,
});

// The cutoff that contains `date`.
const periodContaining = (rule, date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  if (rule.schedule_type === "weekly") {
    const back = (date.getDay() - rule.week_start_day + 7) % 7;
    const start = addDays(date, -back);
    const end = addDays(start, 6);
    return period(start, end, addDays(end, rule.payout_offset_days || 0), rule);
  }

  if (rule.schedule_type === "monthly") {
    return period(
      new Date(year, month, 1),
      endOfMonth(new Date(year, month, 1)),
      dayOf(year, month, rule.first_payout_day),
      rule,
    );
  }

  // semi_monthly
  const s1 = rule.first_start_day;
  const s2 = rule.second_start_day;
  if (day >= s1 && day < s2) {
    return period(
      new Date(year, month, s1),
      new Date(year, month, s2 - 1),
      dayOf(year, month, rule.first_payout_day),
      rule,
    );
  }
  // Second cutoff: s2 .. (s1 - 1) of the next month, or month end when s1 is 1.
  const startMonth = day >= s2 ? month : month - 1;
  const start = new Date(year, startMonth, s2);
  const end =
    s1 === 1
      ? endOfMonth(new Date(year, startMonth, 1))
      : new Date(year, startMonth + 1, s1 - 1);
  const payoutMonth = new Date(year, startMonth + 1, 1);
  return period(
    start,
    end,
    dayOf(payoutMonth.getFullYear(), payoutMonth.getMonth(), rule.second_payout_day),
    rule,
  );
};

// Newest first, starting with the cutoff that contains `from` (today).
export const periodsFromRule = (rule, count = 24, from = new Date()) => {
  if (!rule) return [];
  const periods = [];
  let cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  for (let i = 0; i < count; i += 1) {
    const p = periodContaining(rule, cursor);
    periods.push(p);
    cursor = addDays(new Date(`${p.cutoffStart}T00:00:00`), -1);
  }
  return periods;
};

// One-line summary, e.g. "Semi-Monthly: 1-15 (paid month end), 16-end (paid 15th next month)".
export const describeRule = (rule) => {
  if (!rule) return "Not set";
  if (rule.schedule_type === "weekly") {
    const start = WEEKDAYS[rule.week_start_day];
    const end = WEEKDAYS[(rule.week_start_day + 6) % 7];
    return `Weekly: ${start} - ${end}, paid ${rule.payout_offset_days} day(s) after`;
  }
  if (rule.schedule_type === "monthly") {
    return `Monthly: 1st - month end, paid ${ordinal(rule.first_payout_day)}`;
  }
  const s1 = rule.first_start_day;
  const s2 = rule.second_start_day;
  const firstEnd = s2 - 1;
  const secondEnd = s1 === 1 ? "end" : `${s1 - 1} next month`;
  return `Semi-Monthly: ${s1}-${firstEnd} (paid ${ordinal(rule.first_payout_day)}), ${s2}-${secondEnd} (paid ${ordinal(rule.second_payout_day)} next month)`;
};
