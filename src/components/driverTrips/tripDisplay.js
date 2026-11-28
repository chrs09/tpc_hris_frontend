// Driver Trip Management (web): shared display helpers.

// "Nov 27, 2026, 10:13 AM" -> "Nov 27, 2026". The API sends date and
// time; drivers see the date only (the time is still saved).
export const dateOnly = (value) => {
  if (!value) return null;
  const text = String(value);
  const trimmed = text.replace(/,?\s+\d{1,2}:\d{2}(:\d{2})?\s*(AM|PM)?$/i, "");
  if (trimmed !== text) return trimmed;
  // An ISO date-time ("2026-11-27T10:13:00") -> its date.
  const d = new Date(text);
  return Number.isNaN(d.getTime())
    ? text
    : d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
};

// What each status means to a driver, and its pill color.
export const STATUS = {
  ASSIGNED: { label: "Assigned", tone: "neutral" },
  ACTIVE: { label: "On the road", tone: "primary" },
  PENDING_MANUAL_APPROVAL: { label: "Waiting for approval", tone: "warning" },
  PENDING_APPROVAL: { label: "Waiting for approval", tone: "warning" },
  PENDING_OFFICE_REVIEW: { label: "Office review", tone: "warning" },
  PENDING_FINANCE_REVIEW: { label: "Finance review", tone: "warning" },
  COMPLETED: { label: "Completed", tone: "success" },
  CANCELLED: { label: "Cancelled", tone: "danger" },
};

export const statusOf = (status) => STATUS[status] || { label: status || "-", tone: "neutral" };

// Still being checked (not paid yet).
export const IN_REVIEW = [
  "PENDING_MANUAL_APPROVAL",
  "PENDING_APPROVAL",
  "PENDING_OFFICE_REVIEW",
  "PENDING_FINANCE_REVIEW",
];
