import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { getHrDashboard } from "../../api/hrDashboard";
import { getEmployeeDetails } from "../../api/employee";
import EmployeeDrawer from "../../components/employees/EmployeeDrawer";
import SectionTabs from "../../components/ui/sectionTabs/SectionTabs";
import useModuleAccess from "../../hooks/useModuleAccess";

const GOV_CARDS = [
  { key: "sss", label: "No SSS" },
  { key: "philhealth", label: "No PhilHealth" },
  { key: "pagibig", label: "No Pag-IBIG" },
  { key: "tin", label: "No TIN" },
];

const fmtDate = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const barTone = (pct) =>
  pct >= 90 ? "bg-success" : pct >= 60 ? "bg-warning" : "bg-danger";

function Card({ title, subtitle, action, children }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
      {(title || action) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-fg">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-fg-subtle">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

function Donut({ pct }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 140 140" className="h-36 w-36 shrink-0" role="img" aria-label={`${pct}% complete`}>
      <circle cx="70" cy="70" r={r} fill="none" strokeWidth="14" className="stroke-surface-hover" />
      <circle
        cx="70"
        cy="70"
        r={r}
        fill="none"
        strokeWidth="14"
        strokeLinecap="round"
        strokeDasharray={`${(c * pct) / 100} ${c}`}
        transform="rotate(-90 70 70)"
        className={pct >= 90 ? "stroke-success" : pct >= 60 ? "stroke-warning" : "stroke-danger"}
      />
      <text x="70" y="68" textAnchor="middle" className="fill-fg text-2xl font-bold">
        {pct}%
      </text>
      <text x="70" y="88" textAnchor="middle" className="fill-fg-subtle text-[10px]">
        complete
      </text>
    </svg>
  );
}

function Bar({ label, pct, note }) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="truncate text-fg">{label}</span>
        <span className="shrink-0 text-xs text-fg-muted">
          {note ? `${note} · ` : ""}
          <strong className="text-fg">{pct}%</strong>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-hover">
        <div className={`h-full rounded-full ${barTone(pct)}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Stat({ label, value, tone = "text-fg" }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-xs text-fg-subtle">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}

function PersonButton({ person, onOpen }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(person.employee_id)}
      className="text-left font-medium text-fg hover:text-primary hover:underline"
    >
      {person.name}
    </button>
  );
}

// HRIS -> HR Dashboard: 201 compliance (lacking documents, documents
// nearing expiry, missing government ID numbers) across departments and
// attendance locations. Click a name to open their 201.
export default function HrDashboardPage() {
  const { canEdit } = useModuleAccess();
  const canEditEmployees = canEdit("hris.employees", ["admin"]);

  const [data, setData] = useState(null);
  const [department, setDepartment] = useState("");
  const [locationId, setLocationId] = useState("");
  const [reload, setReload] = useState(0);
  const [lackSearch, setLackSearch] = useState("");
  const [showAllLacking, setShowAllLacking] = useState(false);
  const [govKey, setGovKey] = useState(null);
  const [showNoDate, setShowNoDate] = useState(false);

  const [selected, setSelected] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    getHrDashboard({ department, locationId })
      .then((res) => alive && setData(res))
      .catch((error) => {
        if (!alive) return;
        toast.error(error.response?.data?.detail || "Could not load the HR dashboard.");
        setData((cur) => cur ?? { failed: true });
      });
    return () => {
      alive = false;
    };
  }, [department, locationId, reload]);

  const openEmployee = async (id) => {
    try {
      setDrawerLoading(true);
      setSelected(await getEmployeeDetails(id));
    } catch {
      toast.error("Failed to load employee details.");
    } finally {
      setDrawerLoading(false);
    }
  };

  const lacking = useMemo(() => {
    const q = lackSearch.trim().toLowerCase();
    const rows = data?.lacking || [];
    return q
      ? rows.filter((r) =>
          [r.name, r.department, r.position, ...r.missing].join(" ").toLowerCase().includes(q),
        )
      : rows;
  }, [data, lackSearch]);

  const expired = (data?.expiring || []).filter((e) => e.status === "expired").length;
  const expiringSoon = (data?.expiring || []).length - expired;

  const selectClass =
    "rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30";

  return (
    <div className="space-y-5">
      <SectionTabs group="HRIS" />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-fg">HR Dashboard</h1>
          <p className="mt-1 text-sm text-fg-subtle">
            201 compliance: lacking documents, documents nearing expiry and missing government
            IDs of active employees.
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className={`${selectClass} flex-1 sm:flex-none`}
            aria-label="Department"
          >
            <option value="">All departments</option>
            {(data?.filters?.departments || []).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <select
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            className={`${selectClass} flex-1 sm:flex-none`}
            aria-label="Location"
          >
            <option value="">All locations</option>
            {(data?.filters?.locations || []).map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {data === null ? (
        <p className="text-sm text-fg-subtle">Loading...</p>
      ) : data.failed ? (
        <p className="text-sm text-danger">Could not load the HR dashboard.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Active employees" value={data.employees_count} />
            <Stat
              label="201 complete"
              value={`${data.complete_count} / ${data.employees_count}`}
              tone="text-success"
            />
            <Stat
              label={`Expiring in ${data.warn_days} days`}
              value={expiringSoon}
              tone={expiringSoon ? "text-warning" : "text-fg"}
            />
            <Stat label="Expired" value={expired} tone={expired ? "text-danger" : "text-fg"} />
          </div>

          {/* ---- A. Lacking docs */}
          <Card
            title="Lacking Documents"
            subtitle="Required Employment Files on each 201 (drivers also need license, police clearance, NC3 and Defensive Driving)."
          >
            <div className="grid gap-6 lg:grid-cols-[auto_1fr_1fr]">
              <div className="flex flex-col items-center justify-center gap-1">
                <Donut pct={data.completion} />
                <p className="text-xs text-fg-subtle">Overall document completion</p>
              </div>
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-fg-muted">By document</h3>
                {data.documents.map((d) => (
                  <Bar
                    key={d.document_type}
                    label={d.label}
                    pct={d.completion}
                    note={d.missing ? `${d.missing} missing` : "all on file"}
                  />
                ))}
              </div>
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-fg-muted">By department</h3>
                {data.departments.map((d) => (
                  <Bar
                    key={d.department}
                    label={d.department}
                    pct={d.completion}
                    note={`${d.complete}/${d.employees} complete`}
                  />
                ))}
              </div>
            </div>

            <div className="mt-6 border-t border-border pt-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-fg">
                  Employees with lacking documents ({data.lacking.length})
                </h3>
                <input
                  value={lackSearch}
                  onChange={(e) => setLackSearch(e.target.value)}
                  placeholder="Search name, department, document..."
                  className={`${selectClass} w-full sm:w-72`}
                />
              </div>
              {lacking.length === 0 ? (
                <p className="text-sm text-fg-subtle">
                  {data.lacking.length ? "No match." : "Every 201 is complete."}
                </p>
              ) : (
                <>
                  <ul className="divide-y divide-border">
                    {(showAllLacking ? lacking : lacking.slice(0, 10)).map((r) => (
                      <li
                        key={r.employee_id}
                        className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between"
                      >
                        <div className="min-w-0">
                          <PersonButton person={r} onOpen={openEmployee} />
                          <p className="text-xs text-fg-subtle">
                            {r.department} · {r.position}
                          </p>
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {r.missing.map((m) => (
                              <span
                                key={m}
                                className="rounded-full bg-danger/10 px-2 py-0.5 text-[11px] text-danger"
                              >
                                {m}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="w-full shrink-0 sm:w-40">
                          <Bar label="Complete" pct={r.completion} />
                        </div>
                      </li>
                    ))}
                  </ul>
                  {lacking.length > 10 && (
                    <button
                      type="button"
                      onClick={() => setShowAllLacking((v) => !v)}
                      className="mt-2 text-sm font-medium text-primary hover:underline"
                    >
                      {showAllLacking ? "Show less" : `Show all ${lacking.length}`}
                    </button>
                  )}
                </>
              )}
            </div>
          </Card>

          {/* ---- B. Nearing expiry */}
          <Card
            title="Nearing Expiry"
            subtitle={`Documents expired or expiring within ${data.warn_days} days. Set expiry dates on the 201 -> Employment Files.`}
          >
            {data.expiring.length === 0 ? (
              <p className="text-sm text-fg-subtle">Nothing expiring in the next {data.warn_days} days.</p>
            ) : (
              <div className="-mx-4 overflow-x-auto sm:mx-0">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-fg-subtle">
                      <th className="px-4 py-2 font-medium sm:px-2">Employee</th>
                      <th className="px-2 py-2 font-medium">Document</th>
                      <th className="px-2 py-2 font-medium">Expiry</th>
                      <th className="px-4 py-2 text-right font-medium sm:px-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.expiring.map((e) => (
                      <tr key={`${e.employee_id}-${e.document_type}`} className="border-b border-border last:border-0">
                        <td className="px-4 py-2.5 sm:px-2">
                          <PersonButton person={e} onOpen={openEmployee} />
                          <p className="text-xs text-fg-subtle">{e.department}</p>
                        </td>
                        <td className="px-2 py-2.5 text-fg">{e.document}</td>
                        <td className="px-2 py-2.5 text-fg-muted">{fmtDate(e.expiry_date)}</td>
                        <td className="px-4 py-2.5 text-right sm:px-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                              e.status === "expired"
                                ? "bg-danger/10 text-danger"
                                : "bg-warning/15 text-warning"
                            }`}
                          >
                            {e.status === "expired"
                              ? `Expired ${-e.days_left}d ago`
                              : e.days_left === 0
                                ? "Expires today"
                                : `${e.days_left}d left`}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {data.no_expiry_date.length > 0 && (
              <div className="mt-4 rounded-xl bg-surface-hover p-3">
                <button
                  type="button"
                  onClick={() => setShowNoDate((v) => !v)}
                  className="flex w-full items-center justify-between text-left text-sm text-fg"
                >
                  <span>
                    <strong>{data.no_expiry_date.length}</strong> uploaded documents have no expiry
                    date yet
                  </span>
                  <span className="text-fg-subtle">{showNoDate ? "Hide" : "Show"}</span>
                </button>
                {showNoDate && (
                  <ul className="mt-2 space-y-1 text-sm">
                    {data.no_expiry_date.map((n) => (
                      <li key={`${n.employee_id}-${n.document}`} className="flex flex-wrap gap-x-2">
                        <PersonButton person={n} onOpen={openEmployee} />
                        <span className="text-fg-muted">{n.document}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </Card>

          {/* ---- 3. Government ID deficiencies */}
          <Card
            title="Government ID Deficiencies"
            subtitle="Active employees without the number on their 201 -> Government & Legal. Click a card to see who."
          >
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {GOV_CARDS.map((c) => {
                const count = data.government[c.key].length;
                const active = govKey === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setGovKey(active ? null : c.key)}
                    aria-pressed={active}
                    className={`rounded-2xl border p-4 text-left transition ${
                      active
                        ? "border-primary bg-primary/10"
                        : "border-border bg-surface hover:border-primary/60"
                    }`}
                  >
                    <p className="text-xs text-fg-subtle">{c.label}</p>
                    <p className={`mt-1 text-2xl font-bold ${count ? "text-danger" : "text-success"}`}>
                      {count}
                    </p>
                    <p className="text-[11px] text-fg-subtle">
                      of {data.employees_count} employees
                    </p>
                  </button>
                );
              })}
            </div>

            {govKey && (
              <div className="mt-4">
                <h3 className="mb-2 text-sm font-semibold text-fg">
                  {GOV_CARDS.find((c) => c.key === govKey).label} ({data.government[govKey].length})
                </h3>
                {data.government[govKey].length === 0 ? (
                  <p className="text-sm text-fg-subtle">Everyone has it on file.</p>
                ) : (
                  <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
                    {data.government[govKey].map((p) => (
                      <li key={p.employee_id} className="text-sm">
                        <PersonButton person={p} onOpen={openEmployee} />
                        <p className="text-xs text-fg-subtle">
                          {p.department} · {p.position}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </Card>
        </>
      )}

      <EmployeeDrawer
        canEdit={canEditEmployees}
        key={selected?.id}
        isOpen={Boolean(selected)}
        employee={selected}
        loading={drawerLoading}
        onClose={() => setSelected(null)}
        onSuccess={() => {
          setSelected(null);
          setReload((n) => n + 1);
        }}
        onDataChanged={() => setReload((n) => n + 1)}
      />
    </div>
  );
}
