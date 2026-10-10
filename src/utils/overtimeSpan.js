// Web copy of tytan_mobile/src/utils/overtimeSpan.ts -- keep in step.
// Overtime start -> end on the filing form, crossing midnight when the end
// is earlier than the start (e.g. Thu 5:00 PM -> Fri 2:15 AM). Same rule
// as the server (_span in app/api/overtime_request.py).

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const isHHMM = (v) => /^([01]?\d|2[0-3]):[0-5]\d$/.test((v || "").trim());
const minutesOf = (v) => {
  const [h, m] = v.trim().split(":").map(Number);
  return h * 60 + m;
};
const dayLabel = (d) => `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${String(d.getDate()).padStart(2, "0")}`;
export const clock12 = (v) => {
  const total = minutesOf(v);
  const h = Math.floor(total / 60);
  return `${h % 12 || 12}:${String(total % 60).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};


export const overtimeSpan = (date, timeIn, timeOut) => {
  if (!date || !isHHMM(timeIn) || !isHHMM(timeOut)) return null;
  const [y, mo, d] = date.split("-").map(Number);
  const start = new Date(y, mo - 1, d);
  const startMin = minutesOf(timeIn);
  let endMin = minutesOf(timeOut);
  const nextDay = endMin <= startMin;
  if (nextDay) endMin += 24 * 60;
  const end = new Date(y, mo - 1, d + (nextDay ? 1 : 0));
  const minutes = endMin - startMin;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return {
    startLabel: `${dayLabel(start)} · ${clock12(timeIn)}`,
    endLabel: `${dayLabel(end)} · ${clock12(timeOut)}`,
    nextDay,
    minutes,
    duration: `${h} h${m ? ` ${m} m` : ""}`,
  };
};
