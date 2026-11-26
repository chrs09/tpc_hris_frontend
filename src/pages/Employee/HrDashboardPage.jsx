import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  FileText,
  FileWarning,
  Fingerprint,
  HeartPulse,
  IdCard,
  Landmark,
  MapPin,
  Search,
  ShieldCheck,
  Truck,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { getHrDashboard } from "../../api/hrDashboard";
import { getEmployeeDetails } from "../../api/employee";
import EmployeeDrawer from "../../components/employees/EmployeeDrawer";
import SectionTabs from "../../components/ui/sectionTabs/SectionTabs";
import useModuleAccess from "../../hooks/useModuleAccess";

// HRIS -> HR Dashboard: 201 compliance (lacking documents, documents
// nearing expiry, missing government ID numbers) across departments and
// attendance locations. Click a card to filter; click a person to open
// their 201.

const GOV_CARDS = [
  { key: "sss", label: "SSS", icon: ShieldCheck },
  { key: "philhealth", label: "PhilHealth", icon: HeartPulse },
  { key: "pagibig", label: "Pag-IBIG", icon: Landmark },
  { key: "tin", label: "TIN", icon: Fingerprint },
];

const PAGE = 12;
const CHIPS_SHOWN = 4;

const SORTS = [
  { key: "least", label: "Least complete" },
  { key: "most_missing", label: "Most missing" },
  { key: "name", label: "Name A–Z" },
];

// ------------------------------------------------------------- helpers
const fmtDate = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const tone = (pct) => (pct >= 90 ? "success" : pct >= 60 ? "warning" : "danger");
const TONE = {
  success: { text: "text-success", bar: "bg-success", stroke: "stroke-success", soft: "bg-success/10" },
  warning: { text: "text-warning", bar: "bg-warning", stroke: "stroke-warning", soft: "bg-warning/10" },
  danger: { text: "text-danger", bar: "bg-danger", stroke: "stroke-danger", soft: "bg-danger/10" },
};
const t = (pct) => TONE[tone(pct)];

// Document icon by its name (falls back to a page).
const docIcon = (label = "") => {
  const l = label.toLowerCase();
  if (l.includes("license") || l.includes("driving") || l.includes("nc3")) return Truck;
  if (l.includes("health") || l.includes("x-ray") || l.includes("philhealth")) return HeartPulse;
  if (l.includes("clearance") || l.includes("police") || l.includes("nbi")) return ShieldCheck;
  if (l.includes("sss") || l.includes("pag-ibig") || l.includes("tin")) return Landmark;
  if (l.includes("profile") || l.includes("id")) return UserRound;
  return FileText;
};

const initials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

// Stable soft colour per name for the initials avatar.
const AVATAR_TONES = [
  "bg-sky-500/15 text-sky-600 dark:text-sky-300",
  "bg-violet-500/15 text-violet-600 dark:text-violet-300",
  "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
  "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  "bg-rose-500/15 text-rose-600 dark:text-rose-300",
  "bg-teal-500/15 text-teal-600 dark:text-teal-300",
];
const avatarTone = (name = "") =>
  AVATAR_TONES[[...name].reduce((n, c) => n + c.charCodeAt(0), 0) % AVATAR_TONES.length];

// ---------------------------------------------------------- primitives
function Ring({ pct, size = 44, stroke = 5, label = true }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0" role="img" aria-label={`${pct}%`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-surface-active" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${(c * pct) / 100} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className={`${t(pct).stroke} transition-[stroke-dasharray] duration-700`}
      />
      {label && (
        <text
          x="50%"
          y="50%"
          dominantBaseline="central"
          textAnchor="middle"
          className="fill-fg font-semibold"
          style={{ fontSize: size * 0.26 }}
        >
          {pct}
        </text>
      )}
    </svg>
  );
}

function Progress({ pct, className = "h-1.5" }) {
  return (
    <div className={`${className} overflow-hidden rounded-full bg-surface-active`}>
      <div
        className={`h-full rounded-full ${t(pct).bar} transition-[width] duration-700`}
        style={{ width: `${Math.max(pct, pct > 0 ? 3 : 0)}%` }}
      />
    </div>
  );
}

function Avatar({ person, size = "h-11 w-11" }) {
  const [broken, setBroken] = useState(false);
  if (person.photo_url && !broken) {
    return (
      <img
        src={person.photo_url}
        alt=""
        onError={() => setBroken(true)}
        className={`${size} shrink-0 rounded-full object-cover ring-2 ring-surface`}
      />
    );
  }
  return (
    <span
      className={`${size} flex shrink-0 items-center justify-center rounded-full text-sm font-semibold ${avatarTone(person.name)}`}
    >
      {initials(person.name) || "?"}
    </span>
  );
}

function SectionHeader({ icon: Icon, title, subtitle, count, action }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {Icon && <Icon size={19} />}
        </span>
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-base font-semibold text-fg">
            {title}
            {count !== undefined && (
              <span className="rounded-full bg-surface-hover px-2 py-0.5 text-xs font-medium text-fg-muted">{count}</span>
            )}
          </h2>
          {subtitle && <p className="mt-0.5 max-w-2xl text-xs leading-relaxed text-fg-subtle">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

const panel = "rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6";

// ------------------------------------------------------------ pieces
function KpiTile({ icon: Icon, label, value, hint, pct, toneKey, onClick }) {
  const tk = TONE[toneKey];
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-border bg-surface p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tk.soft} ${tk.text}`}>
          {Icon && <Icon size={18} />}
        </span>
        <ChevronRight size={16} className="text-fg-subtle opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
      </div>
      <div>
        <p className="text-xs font-medium text-fg-subtle">{label}</p>
        <p className={`mt-0.5 text-2xl font-bold tabular-nums tracking-tight ${tk.text}`}>{value}</p>
        {hint && <p className="mt-0.5 truncate text-[11px] text-fg-subtle">{hint}</p>}
      </div>
      {pct !== undefined && <Progress pct={pct} className="h-1" />}
    </button>
  );
}

function DocCard({ title, icon: Icon, missing, pct, foot, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`group flex items-center gap-3 rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
        active
          ? "border-primary bg-primary/10 shadow-sm"
          : "border-border bg-surface hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm"
      }`}
    >
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${t(pct).soft} ${t(pct).text}`}>
        {Icon && <Icon size={17} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-fg" title={title}>
          {title}
        </span>
        <span className="block text-xs text-fg-subtle">
          {missing ? (
            <>
              <strong className="font-semibold text-fg">{missing}</strong> {foot}
            </>
          ) : (
            <span className="text-success">All on file</span>
          )}
        </span>
      </span>
      <Ring pct={pct} size={40} stroke={4} />
    </button>
  );
}

function EmployeeCard({ row, onOpen, highlight }) {
  const [open, setOpen] = useState(false);
  const chips = open ? row.missing : row.missing.slice(0, CHIPS_SHOWN);
  const more = row.missing.length - CHIPS_SHOWN;
  return (
    <li className="group flex flex-col rounded-2xl border border-border bg-surface shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
      <div className="flex items-start gap-3 p-4 pb-3">
        <Avatar person={row} />
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => onOpen(row.employee_id)}
            className="block max-w-full truncate text-left text-sm font-semibold text-fg hover:text-primary"
          >
            {row.name}
          </button>
          <p className="mt-0.5 truncate text-xs text-fg-subtle">
            {[row.position, row.department].filter(Boolean).join(" · ")}
          </p>
        </div>
        <Ring pct={row.completion} size={42} stroke={4} />
      </div>

      <div className="flex-1 px-4">
        <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-fg-subtle">
          Missing {row.missing.length}
        </p>
        <div className="flex flex-wrap gap-1">
          {chips.map((m) => (
            <span
              key={m}
              className={`rounded-md px-1.5 py-0.5 text-[11px] font-medium ${
                m === highlight ? "bg-danger text-danger-foreground" : "bg-danger/10 text-danger"
              }`}
            >
              {m}
            </span>
          ))}
          {more > 0 && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-primary hover:bg-primary/10"
            >
              {open ? "Show less" : `+${more} more`}
            </button>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onOpen(row.employee_id)}
        className="mt-4 flex items-center justify-between rounded-b-2xl border-t border-border px-4 py-2.5 text-xs font-medium text-fg-muted transition group-hover:bg-surface-hover group-hover:text-primary"
      >
        Open 201
        <ArrowRight size={14} className="transition group-hover:translate-x-0.5" />
      </button>
    </li>
  );
}

function PersonLink({ person, onOpen }) {
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

function EmptyState({ icon: Icon = CheckCircle2, title, text }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border px-6 py-10 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-success/10 text-success">
        {Icon && <Icon size={20} />}
      </span>
      <p className="text-sm font-semibold text-fg">{title}</p>
      {text && <p className="max-w-sm text-xs text-fg-subtle">{text}</p>}
    </div>
  );
}

// ---------------------------------------------------------------- page
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
  const [sort, setSort] = useState("least");
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
    const rows = (data?.lacking || [])
      .filter((r) => !docFilter || r.missing.includes(docFilter))
      .filter((r) => !deptFilter || r.department === deptFilter)
      .filter(
        (r) =>
          !q ||
          [r.name, r.department, r.position, ...r.missing].join(" ").toLowerCase().includes(q),
      );
    const by = {
      least: (a, b) => a.completion - b.completion || a.name.localeCompare(b.name),
      most_missing: (a, b) => b.missing.length - a.missing.length || a.name.localeCompare(b.name),
      name: (a, b) => a.name.localeCompare(b.name),
    }[sort];
    return [...rows].sort(by);
  }, [data, lackSearch, docFilter, deptFilter, sort]);

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
  const topDoc = documents.find((d) => d.missing > 0);
  const lowestDept = departments[0];

  const jump = (id) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const toList = () => listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const pickDoc = (label) => {
    setDocFilter((cur) => (cur === label ? "" : label));
    setShown(PAGE);
    toList();
  };
  const pickDept = (name) => {
    setDeptFilter((cur) => (cur === name ? "" : name));
    setShown(PAGE);
    toList();
  };
  const clearFilters = () => {
    setDocFilter("");
    setDeptFilter("");
    setLackSearch("");
    setShown(PAGE);
  };

  const control =
    "h-10 rounded-xl border border-border bg-surface px-3 text-sm text-fg shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

  return (
    <div className="space-y-6">
      <SectionTabs group="HRIS" />

      {/* -------- header */}
      <header className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-surface to-surface p-5 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">201 compliance</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-fg sm:text-3xl">HR Dashboard</h1>
            <p className="mt-1.5 max-w-xl text-sm text-fg-muted">
              Lacking documents, documents nearing expiry and missing government IDs of active
              employees. Click any card to see who it&apos;s about.
            </p>
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <label className="relative flex-1 sm:flex-none">
              <Building2 size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
              <select
                id="hr-dept"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className={`${control} w-full pl-9 pr-8 sm:w-48`}
                aria-label="Department"
              >
                <option value="">All departments</option>
                {(data?.filters?.departments || []).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
            <label className="relative flex-1 sm:flex-none">
              <MapPin size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
              <select
                id="hr-location"
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className={`${control} w-full pl-9 pr-8 sm:w-48`}
                aria-label="Location"
              >
                <option value="">All locations</option>
                {(data?.filters?.locations || []).map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {data && !data.failed && (
          <div className="mt-6 flex flex-wrap items-center gap-5 rounded-2xl border border-border bg-surface/70 p-4 backdrop-blur">
            <Ring pct={data.completion} size={88} stroke={9} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-fg">
                {data.completion}% of required documents are on file
              </p>
              <p className="mt-0.5 text-xs text-fg-muted">
                {data.employees_count} active employees
                {lowestDept ? ` · lowest department: ${lowestDept.department} (${lowestDept.completion}%)` : ""}
                {topDoc ? ` · most missing: ${topDoc.label} (${topDoc.missing})` : ""}
              </p>
              <div className="mt-3 max-w-md">
                <Progress pct={data.completion} className="h-2" />
              </div>
            </div>
          </div>
        )}
      </header>

      {data === null ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl border border-border bg-surface" />
          ))}
        </div>
      ) : data.failed ? (
        <p className="text-sm text-danger">Could not load the HR dashboard.</p>
      ) : (
        <>
          {/* -------- KPIs */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiTile
              icon={BadgeCheck}
              label="201 complete"
              value={`${data.complete_count} / ${data.employees_count}`}
              hint={`${completePct}% of active employees`}
              pct={completePct}
              toneKey={tone(completePct)}
              onClick={() => jump("hr-lacking")}
            />
            <KpiTile
              icon={FileWarning}
              label="With lacking documents"
              value={data.lacking.length}
              hint={topDoc ? `Most missing: ${topDoc.label}` : "Nothing missing"}
              toneKey={data.lacking.length ? "danger" : "success"}
              onClick={() => jump("hr-lacking")}
            />
            <KpiTile
              icon={CalendarClock}
              label="Expired · expiring"
              value={`${expired} · ${expiringSoon}`}
              hint={`Within the next ${data.warn_days} days`}
              toneKey={expired ? "danger" : expiringSoon ? "warning" : "success"}
              onClick={() => jump("hr-expiry")}
            />
            <KpiTile
              icon={IdCard}
              label="Missing government IDs"
              value={govMissing}
              hint="SSS, PhilHealth, Pag-IBIG and TIN"
              toneKey={govMissing ? "danger" : "success"}
              onClick={() => jump("hr-gov")}
            />
          </div>

          {/* -------- A. Lacking documents */}
          <section id="hr-lacking" className={`${panel} scroll-mt-4`}>
            <SectionHeader
              icon={FileWarning}
              title="Lacking Documents"
              subtitle="Required Employment Files on each 201. Drivers also need their license, police clearance, NC3 and Defensive Driving. Click a card to list who's missing it."
              action={
                <div className="inline-flex rounded-xl border border-border bg-surface-hover p-1">
                  {[
                    { key: "documents", label: "By document" },
                    { key: "departments", label: "By department" },
                  ].map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => setLackView(v.key)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                        lackView === v.key ? "bg-surface text-fg shadow-sm" : "text-fg-muted hover:text-fg"
                      }`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              }
            />

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {lackView === "documents"
                ? documents.map((d) => (
                    <DocCard
                      key={d.document_type}
                      title={d.label}
                      icon={docIcon(d.label)}
                      missing={d.missing}
                      foot="employees missing"
                      pct={d.completion}
                      active={docFilter === d.label}
                      onClick={() => pickDoc(d.label)}
                    />
                  ))
                : departments.map((d) => (
                    <DocCard
                      key={d.department}
                      title={d.department}
                      icon={Building2}
                      missing={d.employees - d.complete}
                      foot={`of ${d.employees} incomplete`}
                      pct={d.completion}
                      active={deptFilter === d.department}
                      onClick={() => pickDept(d.department)}
                    />
                  ))}
            </div>

            {/* employees */}
            <div ref={listRef} className="mt-8 scroll-mt-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
                  <Users size={16} className="text-fg-subtle" />
                  Employees with lacking documents
                  <span className="rounded-full bg-surface-hover px-2 py-0.5 text-xs font-medium text-fg-muted">
                    {lacking.length}
                    {lacking.length !== data.lacking.length && ` of ${data.lacking.length}`}
                  </span>
                </h3>
                <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                  <label className="relative min-w-0 flex-1 sm:w-72 sm:flex-none">
                    <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
                    <input
                      id="hr-lacking-search"
                      value={lackSearch}
                      onChange={(e) => {
                        setLackSearch(e.target.value);
                        setShown(PAGE);
                      }}
                      placeholder="Search name, department, document..."
                      className={`${control} w-full pl-9`}
                    />
                  </label>
                  <select
                    id="hr-lacking-sort"
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    className={control}
                    aria-label="Sort"
                  >
                    {SORTS.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {(docFilter || deptFilter || lackSearch) && (
                <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-fg-subtle">Filtered by</span>
                  {docFilter && (
                    <button
                      type="button"
                      onClick={() => setDocFilter("")}
                      className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 font-medium text-primary hover:bg-primary/15"
                    >
                      Missing {docFilter} <X size={12} />
                    </button>
                  )}
                  {deptFilter && (
                    <button
                      type="button"
                      onClick={() => setDeptFilter("")}
                      className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 font-medium text-primary hover:bg-primary/15"
                    >
                      {deptFilter} <X size={12} />
                    </button>
                  )}
                  {lackSearch && (
                    <button
                      type="button"
                      onClick={() => setLackSearch("")}
                      className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 font-medium text-primary hover:bg-primary/15"
                    >
                      &ldquo;{lackSearch}&rdquo; <X size={12} />
                    </button>
                  )}
                  <button type="button" onClick={clearFilters} className="font-medium text-fg-muted hover:text-fg hover:underline">
                    Clear all
                  </button>
                </div>
              )}

              {lacking.length === 0 ? (
                <EmptyState
                  icon={data.lacking.length ? Search : CheckCircle2}
                  title={data.lacking.length ? "Nobody matches these filters" : "Every 201 is complete"}
                  text={data.lacking.length ? "Try another document, department or search." : "All required documents are on file."}
                />
              ) : (
                <>
                  <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {lacking.slice(0, shown).map((r) => (
                      <EmployeeCard key={r.employee_id} row={r} onOpen={openEmployee} highlight={docFilter} />
                    ))}
                  </ul>
                  {lacking.length > shown && (
                    <div className="mt-5 flex justify-center">
                      <button
                        type="button"
                        onClick={() => setShown((n) => n + PAGE * 2)}
                        className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-5 py-2.5 text-sm font-medium text-fg shadow-sm transition hover:border-primary/40 hover:text-primary"
                      >
                        Show more
                        <span className="rounded-full bg-surface-hover px-2 py-0.5 text-xs text-fg-muted">
                          {lacking.length - shown} left
                        </span>
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-2">
            {/* -------- B. Nearing expiry */}
            <section id="hr-expiry" className={`${panel} scroll-mt-4`}>
              <SectionHeader
                icon={CalendarClock}
                title="Nearing Expiry"
                count={data.expiring.length}
                subtitle={`Expired or expiring within ${data.warn_days} days. Set expiry dates on the 201 -> Employment Files.`}
              />
              {data.expiring.length === 0 ? (
                <EmptyState title={`Nothing expiring in the next ${data.warn_days} days`} />
              ) : (
                <ul className="space-y-2">
                  {data.expiring.map((e) => {
                    const d = fmtDate(e.expiry_date);
                    const isExpired = e.status === "expired";
                    return (
                      <li
                        key={`${e.employee_id}-${e.document_type}`}
                        className="flex items-center gap-3 rounded-xl border border-border p-3 transition hover:bg-surface-hover"
                      >
                        <span
                          className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl ${
                            isExpired ? "bg-danger/10 text-danger" : "bg-warning/10 text-warning"
                          }`}
                        >
                          <span className="text-[10px] font-semibold uppercase">
                            {d.toLocaleDateString("en-US", { month: "short" })}
                          </span>
                          <span className="text-base font-bold leading-none">{d.getDate()}</span>
                        </span>
                        <div className="min-w-0 flex-1 text-sm">
                          <PersonLink person={e} onOpen={openEmployee} />
                          <p className="truncate text-xs text-fg-subtle">
                            {e.document} · {e.department} · {d.getFullYear()}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                            isExpired ? "bg-danger/10 text-danger" : "bg-warning/10 text-warning"
                          }`}
                        >
                          {isExpired
                            ? `Expired ${-e.days_left}d ago`
                            : e.days_left === 0
                              ? "Expires today"
                              : `${e.days_left}d left`}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}

              {data.no_expiry_date.length > 0 && (
                <div className="mt-4 rounded-xl border border-warning/30 bg-warning/5 p-3">
                  <button
                    type="button"
                    onClick={() => setShowNoDate((v) => !v)}
                    className="flex w-full items-center justify-between gap-2 text-left text-sm text-fg"
                  >
                    <span className="flex items-center gap-2">
                      <AlertTriangle size={15} className="shrink-0 text-warning" />
                      <span>
                        <strong>{data.no_expiry_date.length}</strong> uploaded documents have no expiry date yet
                      </span>
                    </span>
                    <span className="shrink-0 text-xs font-semibold text-primary">{showNoDate ? "Hide" : "Show"}</span>
                  </button>
                  {showNoDate && (
                    <ul className="mt-3 grid gap-x-6 gap-y-1.5 border-t border-warning/20 pt-3 text-sm sm:grid-cols-2">
                      {data.no_expiry_date.map((n) => (
                        <li key={`${n.employee_id}-${n.document}`} className="flex flex-wrap gap-x-2">
                          <PersonLink person={n} onOpen={openEmployee} />
                          <span className="text-fg-muted">{n.document}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </section>

            {/* -------- C. Government IDs */}
            <section id="hr-gov" className={`${panel} scroll-mt-4`}>
              <SectionHeader
                icon={IdCard}
                title="Government ID Deficiencies"
                subtitle="Active employees without the number on their 201 -> Government & Legal. Click a card to see who."
              />
              <div className="grid grid-cols-2 gap-3">
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
                      className={`flex items-center gap-3 rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                        active
                          ? "border-primary bg-primary/10 shadow-sm"
                          : "border-border hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm"
                      }`}
                    >
                      <Ring pct={pct} size={48} stroke={5} />
                      <span className="min-w-0">
                        <span className="block text-xs font-medium text-fg-subtle">No {c.label}</span>
                        <span className={`block text-xl font-bold tabular-nums ${count ? "text-danger" : "text-success"}`}>
                          {count}
                        </span>
                        <span className="block text-[11px] text-fg-subtle">of {data.employees_count}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              {govKey && (
                <div className="mt-4 rounded-xl border border-border bg-surface-hover/40 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-fg">
                      No {GOV_CARDS.find((c) => c.key === govKey).label} ({data.government[govKey].length})
                    </h3>
                    <button
                      type="button"
                      onClick={() => setGovKey(null)}
                      aria-label="Close list"
                      className="rounded-md p-1 text-fg-subtle hover:bg-surface-hover hover:text-fg"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  {data.government[govKey].length === 0 ? (
                    <p className="text-sm text-fg-subtle">Everyone has it on file.</p>
                  ) : (
                    <ul className="max-h-72 space-y-1 overflow-y-auto pr-1">
                      {data.government[govKey].map((p) => (
                        <li key={p.employee_id}>
                          <button
                            type="button"
                            onClick={() => openEmployee(p.employee_id)}
                            className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-surface"
                          >
                            <Avatar person={p} size="h-7 w-7" />
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium text-fg">{p.name}</span>
                              <span className="block truncate text-[11px] text-fg-subtle">
                                {[p.department, p.position].filter(Boolean).join(" · ")}
                              </span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </section>
          </div>
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
