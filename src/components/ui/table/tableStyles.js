// Shared look for list tables (rounded card, tinted uppercase header,
// roomy rows, soft hover). Use these class strings on the table's parts so
// every list in the app reads the same; status cells use StatusPill.

// The scrolling card around a <table>.
export const TABLE_WRAP = "overflow-x-auto rounded-2xl border border-border bg-surface";

// <thead> (or its <tr>): tinted band, small uppercase letter-spaced labels.
export const TABLE_HEAD =
  "border-b border-border bg-surface-hover/70 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle";

// Same, but solid -- for sticky headers that scroll over rows.
export const TABLE_HEAD_STICKY =
  "border-b border-border bg-surface-hover text-[11px] font-semibold uppercase tracking-wider text-fg-subtle";

// A body row.
export const TABLE_ROW = "border-t border-border transition-colors hover:bg-surface-hover/60";
