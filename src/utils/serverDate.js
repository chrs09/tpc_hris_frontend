// Server timestamps are UTC. The backend now sends them with a "Z"
// (app/core/utc_json.py); older values without one are read as UTC too.
export const parseServerDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  const text = String(value);
  return new Date(/Z$|[+-]\d\d:?\d\d$/.test(text) ? text : `${text}Z`);
};

// Shown in PH time (UTC+8) whatever the viewer's own clock is set to.
export const formatServerDateTime = (value, options = {}) => {
  const date = parseServerDate(value);
  if (!date || Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-PH", { timeZone: "Asia/Manila", ...options });
};
