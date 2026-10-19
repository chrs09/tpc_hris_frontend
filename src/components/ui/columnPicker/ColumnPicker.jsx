import { useEffect, useRef, useState } from "react";
import { Columns3 } from "lucide-react";

// "Columns" button with a checkbox per column -- pick what a table shows.
// Pair with useColumnPrefs (remembers the choice per browser).
// columns: [{ key, label, locked? }]  (locked = always shown, no checkbox)
export default function ColumnPicker({ columns, visible, onToggle, onReset }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const optional = columns.filter((c) => !c.locked);
  const shown = optional.filter((c) => visible.has(c.key)).length;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex h-10 items-center gap-2 rounded-xl border border-border bg-surface px-3 text-sm font-medium text-fg hover:bg-surface-hover"
      >
        <Columns3 size={16} />
        Columns
        <span className="text-xs text-fg-subtle">
          {shown}/{optional.length}
        </span>
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-60 rounded-xl border border-border bg-surface p-2 shadow-xl">
          <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">
            Show columns
          </p>
          <div className="max-h-72 overflow-y-auto">
            {optional.map((c) => (
              <label
                key={c.key}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-fg hover:bg-surface-hover"
              >
                <input
                  type="checkbox"
                  checked={visible.has(c.key)}
                  onChange={() => onToggle(c.key)}
                  className="h-4 w-4 accent-primary"
                />
                {c.label}
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={onReset}
            className="mt-1 w-full rounded-lg px-2 py-1.5 text-left text-xs font-medium text-fg-muted hover:bg-surface-hover hover:text-fg"
          >
            Reset to default
          </button>
        </div>
      )}
    </div>
  );
}
