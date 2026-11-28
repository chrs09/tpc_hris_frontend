// Driver Trip Management: one number tile.
const SummaryCard = ({ title, value, icon: Icon, tone = "text-primary bg-primary/10" }) => {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4">
      {Icon && (
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}>
          <Icon size={18} />
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate text-xs text-fg-muted">{title}</p>
        <p className="text-2xl font-bold tabular-nums text-fg">{value ?? 0}</p>
      </div>
    </div>
  );
};

export default SummaryCard;
