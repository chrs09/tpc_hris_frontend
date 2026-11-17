// Download limit: anyone but a superadmin can only download (Excel
// exports, printing payslips) data from the current month and the
// previous month -- e.g. on Nov 17 that's Oct 1 onwards. Viewing older
// data on screen is still allowed; only the download is blocked.
//
// Dates are "YYYY-MM-DD" in Philippine time.

const phToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });

// The 1st of the previous month, e.g. "2026-10-01" during November 2026.
export const downloadWindowStart = () => {
  const [year, month] = phToday().split("-").map(Number); // month: 1-12
  const prevYear = month === 1 ? year - 1 : year;
  const prevMonth = month === 1 ? 12 : month - 1;
  return `${prevYear}-${String(prevMonth).padStart(2, "0")}-01`;
};

const isSuperAdmin = () => {
  try {
    return localStorage.getItem("role") === "superadmin";
  } catch {
    return false;
  }
};

const longDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

// `from`: the first date the download covers. Returns null when it may be
// downloaded, else the message to show.
export const downloadBlockedReason = (from) => {
  if (isSuperAdmin() || !from) return null;
  const start = downloadWindowStart();
  if (from >= start) return null;
  return `Downloads are limited to the current and previous month (from ${longDate(
    start,
  )}). Ask a superadmin for older data.`;
};
