// True when `query` is empty, or any of `values` contains it (case- and
// space-insensitive). Arrays are searched item by item. Used by every
// list's search box.
// The ?q= a page was opened with (a global search result link), as the
// starting text of its search box.
export const urlQuery = () => {
  try {
    return new URLSearchParams(window.location.search).get("q") || "";
  } catch {
    return "";
  }
};

export const matchesSearch = (query, ...values) => {
  const q = (query || "").trim().toLowerCase().replace(/\s+/g, " ");
  if (!q) return true;
  const flat = values.flat(Infinity);
  return flat.some(
    (v) =>
      v !== null &&
      v !== undefined &&
      String(v).toLowerCase().replace(/\s+/g, " ").includes(q),
  );
};
