import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  FileWarning,
  IdCard,
  Search,
  Users,
  X,
} from "lucide-react";
import { getHrDashboard } from "../../api/hrDashboard";
import { getEmployeeDetails } from "../../api/employee";
import EmployeeDrawer from "../../components/employees/EmployeeDrawer";
import SectionTabs from "../../components/ui/sectionTabs/SectionTabs";
import useModuleAccess from "../../hooks/useModuleAccess";

const GOV_CARDS = [
  { key: "sss", label: "SSS" },
  { key: "philhealth", label: "PhilHealth" },
  { key: "pagibig", label: "Pag-IBIG" },
  { key: "tin", label: "TIN" },
];

const PAGE = 12;
const CHIPS_SHOWN = 4;

const fmtDate = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const tone = (pct) => (pct >= 90 ? "success" : pct >= 60 ? "warning" : "danger");
const barClass = (pct) =>
  ({ success: "bg-success", warning: "bg-warning", danger: "bg-danger" })[tone(pct)];
const textClass = (pct) =>
  ({ success: "text-success", warning: "text-warning", danger: "text-danger" })[tone(pct)];

function Section({ id, icon: Icon, title, subtitle, action, children }) {
  return (
    <section id={id} className="scroll-mt-4 rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {Icon && (
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon size={18} />
            </span>
          )}
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-fg">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-fg-subtle">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Progress({ pct, className = "h-1.5" }) {
  return (
    <div className={`${className} overflow-hidden rounded-full bg-surface-hover`}>
      <div
        className={`h-full rounded-full ${barClass(pct)}`}
        style={{ width: `${Math.max(pct, pct > 0 ? 3 : 0)}%` }}
      />
    </div>
  );
}

function Donut({ pct, size = "h-32 w-32" }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 140 140" className={`${size} shrink-0`} role="img" aria-label={`${pct}% complete`}>
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
        className={{ success: "stroke-success", warning: "stroke-warning", danger: "stroke-danger" }[tone(pct)]}
      />
      <text x="70" y="70" textAnchor="middle" className="fill-fg text-2xl font-bold">
        {pct}%
      </text>
      <text x="70" y="90" textAnchor="middle" className="fill-fg-subtle text-[10px]">
        on file
      </text>
    </svg>
  );
}

// Top tiles: click to jump to the section.
function StatTile({ icon: Icon, label, value, hint, toneClass = "text-fg", onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-start gap-3 rounded-2xl border border-border bg-surface p-4 text-left transition hover:border-primary/50 hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-hover ${toneClass}`}>
        {Icon && <Icon size={20} />}
      </span>
      <span className="min-w-0">
        <span className="block text-xs text-fg-subtle">{label}</span>
        <span className={`block text-2xl font-bold tabular-nums ${toneClass}`}>{value}</span>
        {hint && <span className="block text-[11px] text-fg-subtle">{hint}</span>}
      </span>
    </button>
  );
}

// One document type / department as a card; click to filter the list.
function FilterCard({ title, big, bigLabel, pct, foot, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex flex-col gap-2 rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
        active
          ? "border-primary bg-primary/10"
          : "border-border bg-surface hover:border-primary/50 hover:bg-surface-hover"
      }`}
    >
      <span className="flex items-start justify-between gap-2">
        <span className="line-clamp-2 text-sm font-semibold text-fg">{title}</span>
        <span className={`shrink-0 text-xs font-bold tabular-nums ${textClass(pct)}`}>{pct}%</span>
      </span>
      <span className="flex items-baseline gap-1.5">
        <span className={`text-xl font-bold tabular-nums ${big ? "text-fg" : "text-success"}`}>{big}</span>
        <span className="text-xs text-fg-subtle">{bigLabel}</span>
      </span>
      <Progress pct={pct} />
      {foot && <span className="text-[11px] text-fg-subtle">{foot}</span>}
    </button>
  );
}

function EmployeeCard({ row, onOpen, highlight }) {
  const [open, setOpen] = useState(false);
  const chips = open ? row.missing : row.missing.slice(0, CHIPS_SHOWN);
  const more = row.missing.length - CHIPS_SHOWN;
  return (
    <li className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => onOpen(row.employee_id)}
            className="truncate text-left text-sm font-semibold text-fg hover:text-primary hover:underline"
          >
            {row.name}
          </button>
          <p className="truncate text-xs text-fg-subtle">
            {[row.department, row.position].filter(Boolean).join(" · ")}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-danger/10 px-2 py-0.5 text-[11px] font-semibold text-danger">
          {row.missing.length} missing
        </span>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-[11px] text-fg-subtle">
          <span>201 complete</span>
          <span className={`font-semibold ${textClass(row.completion)}`}>{row.completion}%</span>
        </div>
        <Progress pct={row.completion} />
      </div>

      <div className="flex flex-wrap gap-1">
        {chips.map((m) => (
          <span
            key={m}
            className={`rounded-md px-1.5 py-0.5 text-[11px] ${
              m === highlight
                ? "bg-danger text-danger-foreground"
                : "bg-danger/10 text-danger"
            }`}
          >
            {m}
          </span>
        ))}
        {more > 0 && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="rounded-md px-1.5 py-0.5 text-[11px] font-medium text-primary hover:bg-primary/10"
          >
            {open ? "Show less" : `+${more} more`}
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => onOpen(row.employee_id)}
        className="mt-auto rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-fg-muted hover:bg-surface-hover hover:text-fg"
      >
        Open 201
      </button>
    </li>
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
// attendance locations. Click a card to filter; click a name to open the 201.
export default function HrDashboardPage() {
  const { canEdit } = useModuleAccess();
  const canEditEmployees = canEdit("hris.employees", ["admin"]);

  const [data, setData] = useState(null);
  const [department, setDepartment] = useState("");
  const [locationId, setLocationId] = useState("");
  const [reload, setReload] = useState(0);
  const [lackSearch, setLackSearch] = useState("");
  const [docFilter, setDocFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [lackView, setLackView] = useState("documents");
  const [shown, setShown] = useState(PAGE);
  const [govKey, setGovKey] = useState(null);
  const [showNoDate, setShowNoDate] = useState(false);
  const listRef = useRef(null);

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
    return (data?.lacking || [])
      .filter((r) => !docFilter || r.missing.includes(docFilter))
      .filter((r) => !deptFilter || r.department === deptFilter)
      .filter(
        (r) =>
          !q ||
          [r.name, r.department, r.position, ...r.missing].join(" ").toLowerCase().includes(q),
      )
      .sort((a, b) => a.completion - b.completion || a.name.localeCompare(b.name));
  }, [data, lackSearch, docFilter, deptFilter]);

  const documents = useMemo(
    () => [...(data?.documents || [])].sort((a, b) => b.missing - a.missing),
    [data],
  );
  const departments = useMemo(
    () => [...(data?.departments || [])].sort((a, b) => a.completion - b.completion),
    [data],
  );

  const expired = (data?.expiring || []).filter((e) => e.status === "expired").length;
  const expiringSoon = (data?.expiring || []).length - expired;
  const completePct = data?.employees_count
    ? Math.round((data.complete_count / data.employees_count) * 100)
    : 0;
  const govMissing = data
    ? GOV_CARDS.reduce((n, c) => n + (data.government?.[c.key]?.length || 0), 0)
    : 0;

  const jump = (id) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  const pickDoc = (label) => {
    setDocFilter((cur) => (cur === label ? "" : label));
    setShown(PAGE);
    listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const pickDept = (name) => {
    setDeptFilter((cur) => (cur === name ? "" : name));
    setShown(PAGE);
    listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const clearFilters = () => {
    setDocFilter("");
    setDeptFilter("");
    setLackSearch("");
    setShown(PAGE);
  };

  const selectClass =
    "rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30";

  const lowestDoc = documents.find((d) => d.missing > 0);
  const lowestDept = departments[0];

  return (
    <div className="space-y-5">
      <SectionTabs group="HRIS" />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-fg">HR Dashboard</h1>
          <p className="mt-1 text-sm text-fg-subtle">
            201 compliance of active employees. Click any card to see who it&apos;s about.
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              icon={CheckCircle2}
              label="201 complete"
              value={`${data.complete_count} / ${data.employees_count}`}
              hint={`${completePct}% of active employees`}
              toneClass={textClass(completePct)}
              onClick={() => jump("hr-lacking")}
            />
            <StatTile
              icon={FileWarning}
              label="With lacking documents"
              value={data.lacking.length}
              hint={lowestDoc ? `Most missing: ${lowestDoc.label} (${lowestDoc.missing})` : "Nothing missing"}
              toneClass={data.lacking.length ? "text-danger" : "text-success"}
              onClick={() => jump("hr-lacking")}
            />
            <StatTile
              icon={CalendarClock}
              label="Expired / expiring"
              value={`${expired} / ${expiringSoon}`}
              hint={`Expiring within ${data.warn_days} days`}
              toneClass={expired ? "text-danger" : expiringSoon ? "text-warning" : "text-success"}
              onClick={() => jump("hr-expiry")}
            />
            <StatTile
              icon={IdCard}
              label="Missing government IDs"
              value={govMissing}
              hint="SSS, PhilHealth, Pag-IBIG and TIN combined"
              toneClass={govMissing ? "text-danger" : "text-success"}
              onClick={() => jump("hr-gov")}
            />
          </div>

          {/* ---- A. Lacking documents */}
          <Section
            id="hr-lacking"
            icon={FileWarning}
            title="Lacking Documents"
            subtitle="Required Employment Files on each 201. Drivers also need their license, police clearance, NC3 and Defensive Driving."
          >
            <div className="grid gap-4 lg:grid-cols-[auto_1fr]">
              <div className="flex items-center gap-4 rounded-xl border border-border bg-surface-hover/50 p-4 lg:flex-col lg:justify-center">
                <Donut pct={data.completion} />
                <div className="space-y-1 text-xs text-fg-muted lg:text-center">
                  <p>Documents on file across all 201s</p>
                  {lowestDept && (
                    <p>
                      Lowest: <strong className="text-fg">{lowestDept.department}</strong> ({lowestDept.completion}%)
                    </p>
                  )}
                </div>
              </div>

              <div className="min-w-0 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { key: "documents", label: `By document (${documents.length})` },
                    { key: "departments", label: `By department (${departments.length})` },
                  ].map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setLackView(t.key)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                        lackView === t.key
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border text-fg-muted hover:border-primary/50"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                  <span className="text-[11px] text-fg-subtle">Click a card to list who&apos;s missing it.</span>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {lackView === "documents"
                    ? documents.map((d) => (
                        <FilterCard
                          key={d.document_type}
                          title={d.label}
                          big={d.missing}
                          bigLabel={d.missing ? "missing" : "all on file"}
                          pct={d.completion}
                          active={docFilter === d.label}
                          onClick={() => pickDoc(d.label)}
                        />
                      ))
                    : departments.map((d) => (
                        <FilterCard
                          key={d.department}
                          title={d.department}
                          big={d.employees - d.complete}
                          bigLabel={`of ${d.employees} incomplete`}
                          pct={d.completion}
                          foot={`${d.complete} complete`}
                          active={deptFilter === d.department}
                          onClick={() => pickDept(d.department)}
                        />
                      ))}
                </div>
              </div>
            </div>

            <div ref={listRef} className="mt-6 scroll-mt-4 border-t border-border pt-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
                  <Users size={16} className="text-fg-subtle" />
                  Employees with lacking documents
                  <span className="rounded-full bg-surface-hover px-2 py-0.5 text-xs text-fg-muted">
                    {lacking.length}
                    {lacking.length !== data.lacking.length && ` of ${data.lacking.length}`}
                  </span>
                </h3>
                <label className="relative w-full sm:w-72">
                  <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
                  <input
                    id="hr-lacking-search"
                    value={lackSearch}
                    onChange={(e) => {
                      setLackSearch(e.target.value);
                      setShown(PAGE);
                    }}
                    placeholder="Search name, department, document..."
                    className={`${selectClass} w-full pl-8`}
                  />
                </label>
              </div>

              {(docFilter || deptFilter) && (
                <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-fg-subtle">Showing:</span>
                  {docFilter && (
                    <button
                      type="button"
                      onClick={() => setDocFilter("")}
                      className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 font-medium text-primary"
                    >
                      Missing {docFilter} <X size={12} />
                    </button>
                  )}
                  {deptFilter && (
                    <button
                      type="button"
                      onClick={() => setDeptFilter("")}
                      className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 font-medium text-primary"
                    >
                      {deptFilter} <X size={12} />
                    </button>
                  )}
                  <button type="button" onClick={clearFilters} className="text-primary hover:underline">
                    Clear all
                  </button>
                </div>
              )}

              {lacking.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-fg-subtle">
                  {data.lacking.length ? "Nobody matches these filters." : "Every 201 is complete."}
                </div>
              ) : (
                <>
                  <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {lacking.slice(0, shown).map((r) => (
                      <EmployeeCard key={r.employee_id} row={r} onOpen={openEmployee} highlight={docFilter} />
                    ))}
                  </ul>
                  {lacking.length > shown && (
                    <div className="mt-4 flex justify-center">
                      <button
                        type="button"
                        onClick={() => setShown((n) => n + PAGE * 2)}
                        className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-fg hover:bg-surface-hover"
                      >
                        Show more ({lacking.length - shown} left)
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </Section>

          {/* ---- B. Nearing expiry */}
          <Section
            id="hr-expiry"
            icon={CalendarClock}
            title="Nearing Expiry"
            subtitle={`Documents expired or expiring within ${data.warn_days} days. Set expiry dates on the 201 -> Employment Files.`}
          >
            {data.expiring.length === 0 ? (
              <div className="flex items-center gap-2 rounded-xl border border-dashed border-border p-4 text-sm text-fg-subtle">
                <CheckCircle2 size={16} className="text-success" />
                Nothing expiring in the next {data.warn_days} days.
              </div>
            ) : (
              <ul className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                {data.expiring.map((e) => (
                  <li
                    key={`${e.employee_id}-${e.document_type}`}
                    className={`flex items-start justify-between gap-3 rounded-xl border p-3 ${
                      e.status === "expired" ? "border-danger/40 bg-danger/5" : "border-warning/40 bg-warning/5"
                    }`}
                  >
                    <div className="min-w-0 text-sm">
                      <PersonButton person={e} onOpen={openEmployee} />
                      <p className="text-xs text-fg-subtle">{e.department}</p>
                      <p className="mt-1 text-fg">
                        {e.document} <span className="text-fg-subtle">· {fmtDate(e.expiry_date)}</span>
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                        e.status === "expired" ? "bg-danger/15 text-danger" : "bg-warning/15 text-warning"
                      }`}
                    >
                      {e.status === "expired"
                        ? `Expired ${-e.days_left}d ago`
                        : e.days_left === 0
                          ? "Expires today"
                          : `${e.days_left}d left`}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {data.no_expiry_date.length > 0 && (
              <div className="mt-4 rounded-xl border border-border bg-surface-hover/50 p-3">
                <button
                  type="button"
                  onClick={() => setShowNoDate((v) => !v)}
                  className="flex w-full items-center justify-between gap-2 text-left text-sm text-fg"
                >
                  <span className="flex items-center gap-2">
                    <AlertTriangle size={15} className="text-warning" />
                    <span>
                      <strong>{data.no_expiry_date.length}</strong> uploaded documents have no expiry date yet
                    </span>
                  </span>
                  <span className="shrink-0 text-xs font-medium text-primary">{showNoDate ? "Hide" : "Show"}</span>
                </button>
                {showNoDate && (
                  <ul className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2 lg:grid-cols-3">
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
          </Section>

          {/* ---- C. Government ID deficiencies */}
          <Section
            id="hr-gov"
            icon={IdCard}
            title="Government ID Deficiencies"
            subtitle="Active employees without the number on their 201 -> Government & Legal. Click a card to see who."
          >
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {GOV_CARDS.map((c) => {
                const count = data.government[c.key].length;
                const active = govKey === c.key;
                const pct = data.employees_count
                  ? Math.round(((data.employees_count - count) / data.employees_count) * 100)
                  : 100;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setGovKey(active ? null : c.key)}
                    aria-pressed={active}
                    className={`flex flex-col gap-2 rounded-xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                      active ? "border-primary bg-primary/10" : "border-border bg-surface hover:border-primary/50"
                    }`}
                  >
                    <span className="flex items-center justify-between text-xs text-fg-subtle">
                      No {c.label}
                      <span className={`font-semibold ${textClass(pct)}`}>{pct}% on file</span>
                    </span>
                    <span className={`text-2xl font-bold tabular-nums ${count ? "text-danger" : "text-success"}`}>
                      {count}
                    </span>
                    <Progress pct={pct} />
                    <span className="text-[11px] text-fg-subtle">of {data.employees_count} employees</span>
                  </button>
                );
              })}
            </div>

            {govKey && (
              <div className="mt-4 rounded-xl border border-border p-3">
                <h3 className="mb-2 text-sm font-semibold text-fg">
                  No {GOV_CARDS.find((c) => c.key === govKey).label} ({data.government[govKey].length})
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
          </Section>
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
