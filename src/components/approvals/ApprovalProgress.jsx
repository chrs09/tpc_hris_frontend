// Org Chart approval chain for a request (Cash Advance, Overtime,
// Attendance): each approver in order -- approved, whose turn it is, or
// still waiting. Renders nothing for requests routed the old way.
const STATE_STYLES = {
  approved: "bg-success/15 text-success",
  done: "bg-success/15 text-success",
  current: "bg-warning/15 text-warning",
  waiting: "bg-surface-active text-fg-subtle",
  skipped: "bg-surface-active text-fg-subtle line-through",
};

const STATE_ICONS = { approved: "✓", done: "✓", current: "●", waiting: "○", skipped: "⏭" };

export default function ApprovalProgress({ steps, className = "" }) {
  if (!steps || steps.length < 2) return null;
  // Approvers out today (absent / on leave) are skipped to the next head.
  const skipped = steps.filter((step) => step.state === "skipped");
  const current = steps.find((step) => step.state === "current");
  return (
    <div className={className}>
    <div className="flex flex-wrap items-center gap-1">
      {steps.map((step, index) => (
        <span key={`${step.user_id}-${index}`} className="flex items-center gap-1">
          {index > 0 && <span className="text-[10px] text-fg-subtle">→</span>}
          <span
            title={step.state === "current" ? "Their turn" : step.state}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              STATE_STYLES[step.state] || STATE_STYLES.waiting
            }`}
          >
            {STATE_ICONS[step.state] || "○"} {step.name}
            {step.state === "skipped" && step.note ? ` (${step.note})` : ""}
          </span>
        </span>
      ))}
    </div>
    {skipped.length > 0 && current && (
      <p className="mt-1 text-[11px] font-semibold text-warning">
        {skipped.map((step) => `${step.name} is ${step.note || "away"}`).join(", ")}{" "}
        today -- passed to {current.name}.
      </p>
    )}
    </div>
  );
}
