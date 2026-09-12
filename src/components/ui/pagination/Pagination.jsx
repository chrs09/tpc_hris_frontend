import React from "react";

// Shared Prev/Next pagination control -- matches the style already used
// in UsersPage.jsx before this component existed. Renders nothing when
// there's only one page, so call sites can drop it in unconditionally.
export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
      <button
        type="button"
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
        className="rounded-lg border border-border px-4 py-1.5 text-sm text-fg-muted transition hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40"
      >
        Prev
      </button>

      <span className="text-sm text-fg-muted">
        Page {page} of {totalPages}
      </span>

      <button
        type="button"
        disabled={page === totalPages}
        onClick={() => onChange(page + 1)}
        className="rounded-lg border border-border px-4 py-1.5 text-sm text-fg-muted transition hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40"
      >
        Next
      </button>
    </div>
  );
}
