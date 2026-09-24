import { LayoutGrid, List } from "lucide-react";

// Card/list view switcher, shared across list pages. Pair with
// useViewType (per-page localStorage persistence) rather than plain
// useState so the choice survives a refresh.
export default function ViewToggle({ viewType, onChange, className = "" }) {
  return (
    <div
      className={`flex items-center gap-1 self-start rounded-lg border border-border bg-surface p-1 ${className}`}
    >
      <button
        type="button"
        onClick={() => onChange("cards")}
        title="Card view"
        className={`rounded-md p-1.5 ${
          viewType === "cards"
            ? "bg-primary text-primary-foreground"
            : "text-fg-muted hover:text-fg"
        }`}
      >
        <LayoutGrid size={16} />
      </button>
      <button
        type="button"
        onClick={() => onChange("list")}
        title="List view"
        className={`rounded-md p-1.5 ${
          viewType === "list"
            ? "bg-primary text-primary-foreground"
            : "text-fg-muted hover:text-fg"
        }`}
      >
        <List size={16} />
      </button>
    </div>
  );
}
