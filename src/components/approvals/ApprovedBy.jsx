// Who has approved (or rejected) a request so far, from its approval log
// -- one line per head, in order, with when, any changed amount/hours,
// and their remarks. Renders nothing until someone has acted.
const formatMoney = (value) =>
  `₱${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export default function ApprovedBy({ log, money = false, className = "" }) {
  const entries = (log || []).filter((entry) =>
    ["approved", "rejected"].includes(entry.action),
  );
  if (entries.length === 0) return null;

  return (
    <div className={`space-y-0.5 ${className}`}>
      {entries.map((entry, index) => {
        const approved = entry.action === "approved";
        const detail = [
          entry.at,
          money && entry.approved_amount != null
            ? formatMoney(entry.approved_amount)
            : null,
          !money && entry.approved_hours != null
            ? `${entry.approved_hours} hr${entry.approved_hours === 1 ? "" : "s"}`
            : null,
        ]
          .filter(Boolean)
          .join(" · ");
        return (
          <p
            key={`${entry.user_id}-${index}`}
            className={`text-xs ${approved ? "text-success" : "text-danger"}`}
          >
            <span className="font-semibold">
              {approved ? "✓ Approved by" : "✕ Rejected by"} {entry.name}
            </span>
            {detail && <span className="text-fg-subtle"> · {detail}</span>}
            {entry.remarks && (
              <span className="text-fg-muted"> — “{entry.remarks}”</span>
            )}
          </p>
        );
      })}
    </div>
  );
}
