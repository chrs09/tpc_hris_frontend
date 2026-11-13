// A status tag: soft tint, thin inset ring and a colored dot. Shared by list
// tables across the app. Pick the color with `tone`, or pass a page's
// existing color classes as `colors` (e.g. "bg-success/15 text-success")
// and the tone is read from them. Pages keep their own labels.
const TONES = {
  success: ["bg-success/10 text-success ring-success/30", "bg-success"],
  warning: ["bg-warning/10 text-warning ring-warning/30", "bg-warning"],
  danger: ["bg-danger/10 text-danger ring-danger/30", "bg-danger"],
  primary: ["bg-primary/10 text-primary ring-primary/30", "bg-primary"],
  neutral: ["bg-surface-active text-fg-muted ring-border", "bg-fg-subtle"],
};

const toneOf = (colors = "") =>
  ["success", "warning", "danger", "primary"].find((t) => colors.includes(t)) || "neutral";

export default function StatusPill({ tone, colors, title, className = "", children }) {
  const [cls, dot] = TONES[tone || toneOf(colors)] || TONES.neutral;
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${cls} ${className}`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} aria-hidden="true" />
      {children}
    </span>
  );
}
