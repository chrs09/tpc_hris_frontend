import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { MODULE_GROUPS, moduleKey } from "../../constants/modules";
import { getRolePeople } from "../../api/employeeModuleAccess";

// Role Access, a count clicked: who follows the role's defaults, and who
// has their own access -- with what differs from the defaults (modules
// added or removed). Change someone's own access on Org Chart -> What
// they can access.

const moduleLabels = () => {
  const labels = {};
  MODULE_GROUPS.forEach((group) =>
    group.submodules.forEach((sub) => {
      labels[moduleKey(group.key, sub.key)] = `${group.label} → ${sub.label}`;
      (sub.children || []).forEach((child) => {
        labels[moduleKey(group.key, child.key)] =
          `${group.label} → ${sub.label} → ${child.label}`;
      });
    }),
  );
  return labels;
};

export default function RolePeopleModal({
  role,
  roleName,
  tab: initialTab,
  defaultKeys,
  perPersonKeys,
  onClose,
}) {
  const [tab, setTab] = useState(initialTab);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const labels = useMemo(() => moduleLabels(), []);

  useEffect(() => {
    let cancelled = false;
    getRolePeople(role)
      .then((res) => !cancelled && setData(res))
      .catch(() => !cancelled && setError("Couldn't load the people."));
    return () => {
      cancelled = true;
    };
  }, [role]);

  const term = search.trim().toLowerCase();
  const list = (data?.[tab] || []).filter(
    (p) =>
      !term ||
      [p.name, p.username, p.position, p.department]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(term)),
  );

  // What a person's own access changes compared with the role defaults.
  const diff = (person) => {
    const mine = new Set(person.module_keys || []);
    const added = [...mine].filter((k) => !defaultKeys.has(k));
    const removed = [...defaultKeys].filter(
      (k) => !mine.has(k) && !perPersonKeys.has(k),
    );
    return { added, removed };
  };

  const label = (key) => labels[key] || key;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[88vh] w-full max-w-2xl flex-col rounded-t-2xl border border-border bg-surface text-fg sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 className="text-lg font-bold">{roleName}</h2>
            <p className="text-xs text-fg-subtle">
              Active people with this role. Change someone&apos;s own access on
              Org Chart → What they can access.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-fg-muted hover:bg-surface-hover hover:text-fg"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-3">
          {[
            { key: "following", label: "Follow these defaults" },
            { key: "custom", label: "Have their own access" },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                tab === t.key
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border text-fg-muted hover:border-primary/50"
              }`}
            >
              {t.label} ({data?.[t.key]?.length ?? "…"})
            </button>
          ))}
          <input
            id="role-people-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, position..."
            className="ml-auto h-8 w-full rounded-lg border border-border bg-surface px-3 text-sm text-fg outline-none focus:border-primary sm:w-56"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {error ? (
            <p className="py-8 text-center text-sm text-danger">{error}</p>
          ) : !data ? (
            <p className="py-8 text-center text-sm text-fg-subtle">Loading...</p>
          ) : list.length === 0 ? (
            <p className="py-8 text-center text-sm text-fg-subtle">
              {tab === "following"
                ? "Nobody follows these defaults right now."
                : "Nobody has their own access."}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {list.map((p) => {
                const { added, removed } = tab === "custom" ? diff(p) : { added: [], removed: [] };
                const readOnly = new Set(p.read_only_keys || []);
                return (
                  <li key={p.employee_id} className="py-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-sm font-semibold">
                        {p.name}
                        <span className="ml-1.5 text-xs font-normal text-fg-subtle">
                          {p.username}
                        </span>
                      </p>
                      <p className="text-xs text-fg-muted">
                        {[p.position, p.department].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    {tab === "custom" && (
                      <div className="mt-1.5 space-y-1 text-xs">
                        {added.length === 0 && removed.length === 0 ? (
                          <p className="text-fg-subtle">
                            Same modules as the defaults (saved as their own).
                          </p>
                        ) : (
                          <>
                            {added.length > 0 && (
                              <p className="text-success">
                                <span className="font-semibold">+ Added:</span>{" "}
                                {added
                                  .map((k) => label(k) + (readOnly.has(k) ? " (view only)" : ""))
                                  .join(", ")}
                              </p>
                            )}
                            {removed.length > 0 && (
                              <p className="text-danger">
                                <span className="font-semibold">− Removed:</span>{" "}
                                {removed.map(label).join(", ")}
                              </p>
                            )}
                          </>
                        )}
                        <p className="text-fg-subtle">
                          {(p.module_keys || []).length} modules in all
                        </p>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
