// For me / All on an approval list (hooks/useApprovalScope.js). Hidden when
// everything listed is already this user's to act on.
export default function ApprovalScopeToggle({
  applies,
  scope,
  onChange,
  forMeCount,
  allCount,
  className = "",
}) {
  if (!applies) return null;
  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      <div className="inline-flex gap-1 rounded-xl bg-surface-hover p-1">
        {[
          ["me", `For me (${forMeCount})`],
          ["all", `All (${allCount})`],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              scope === key ? "bg-surface text-fg shadow" : "text-fg-muted hover:text-fg"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {scope === "all" && (
        <p className="text-xs text-fg-subtle">
          Includes requests still waiting on someone else&apos;s review.
        </p>
      )}
    </div>
  );
}
