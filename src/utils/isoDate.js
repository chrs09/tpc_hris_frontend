// "YYYY-MM-DD" for a local Date (no timezone shift), and back.
export const toISODate = (d) =>
  d
    ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    : "";

export const fromISODate = (iso) => (iso ? new Date(`${iso}T00:00:00`) : null);
