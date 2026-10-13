import { LayoutGrid, List } from "lucide-react";

// Cards | List segmented switch (phone layouts). value: "cards" | "list".
export default function ViewModeSwitch({ value, onChange, className = "" }) {
  const option = (mode, Icon, label) => (
    <button
      type="button"
      onClick={() => onChange(mode)}
      aria-pressed={value === mode}
      className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
        value === mode ? "bg-surface text-fg shadow-sm" : "text-fg-muted hover:text-fg"
      }`}
    >
      <Icon size={14} />
      {label}
    </button>
  );
  return (
    <div className={`inline-flex shrink-0 rounded-lg bg-surface-hover p-0.5 ${className}`}>
      {option("cards", LayoutGrid, "Cards")}
      {option("list", List, "List")}
    </div>
  );
}
