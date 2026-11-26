import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Clock3, Quote } from "lucide-react";
import { greeting, useMe } from "./useMe";

// Shared building blocks for the role dashboards (superadmin / admin,
// employee). Colours come from the theme tokens in src/index.css, so
// everything follows light and dark mode.

const ROLE_LABELS = {
  superadmin: "Superadmin",
  admin: "Admin",
  coordinator_admin: "Coordinator Admin",
  coordinator: "Coordinator",
  payroll_admin: "Payroll Admin",
  office_admin: "Office Admin",
  employee: "Employee",
  helper: "Helper",
  driver: "Driver",
};

const initials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

export function MeAvatar({ me, size = "h-16 w-16", ring = "ring-4 ring-surface" }) {
  const [broken, setBroken] = useState(false);
  if (me.photo && !broken) {
    return (
      <img
        src={me.photo}
        alt=""
        onError={() => setBroken(true)}
        className={`${size} shrink-0 rounded-2xl object-cover shadow-md ${ring}`}
      />
    );
  }
  return (
    <span
      className={`${size} flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-hover text-xl font-bold text-primary-foreground shadow-md ${ring}`}
    >
      {initials(me.name) || "?"}
    </span>
  );
}

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

const STAT_COLS = { 1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-2 sm:grid-cols-4" };

// The greeting header every dashboard opens with.
export function DashboardHero({ subtitle, stats = [], verse = false, children }) {
  const me = useMe();
  const now = useClock();
  const firstName = me.name.split(" ")[0] || "there";
  const roleLabel = ROLE_LABELS[me.role] || me.role;

  return (
    <section className="relative overflow-hidden rounded-3xl border border-border bg-surface shadow-sm">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent" />
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative flex flex-col gap-6 p-5 sm:p-7 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <MeAvatar me={me} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-fg-muted">{greeting(now)},</p>
            <h1 className="truncate text-2xl font-bold tracking-tight text-fg sm:text-3xl">{firstName}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {roleLabel && (
                <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  {roleLabel}
                </span>
              )}
              {me.position && (
                <span className="rounded-full border border-border bg-surface/70 px-2.5 py-0.5 text-xs text-fg-muted">
                  {me.position}
                </span>
              )}
              {me.department && (
                <span className="rounded-full border border-border bg-surface/70 px-2.5 py-0.5 text-xs text-fg-muted">
                  {me.department}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3 self-start rounded-2xl border border-border bg-surface/80 px-4 py-3 backdrop-blur lg:self-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Clock3 size={20} />
          </span>
          <div>
            <p className="text-xl font-bold tabular-nums tracking-tight text-fg">
              {now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" })}
            </p>
            <p className="text-xs text-fg-muted">
              {now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>
        </div>
      </div>

      {(subtitle || verse) && (
        <div className="relative flex flex-col gap-2 border-t border-border/70 px-5 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-7">
          {subtitle && <p className="text-fg-muted">{subtitle}</p>}
          {verse && (
            <p className="flex items-center gap-2 text-xs italic text-fg-subtle">
              <Quote size={13} className="shrink-0 text-primary" />
              Whatever you do, work at it with all your heart.
              <span className="not-italic text-primary">Colossians 3:23</span>
            </p>
          )}
        </div>
      )}

      {stats.length > 0 && (
        <div className={`relative grid gap-px border-t border-border/70 bg-border/70 ${STAT_COLS[Math.min(stats.length, 4)]}`}>
          {stats.map((s) => (
            <div key={s.label} className="bg-surface/90 px-5 py-3 text-center sm:px-7">
              <p className={`text-xl font-bold tabular-nums ${s.tone || "text-fg"}`}>{s.value}</p>
              <p className="text-xs text-fg-muted">{s.label}</p>
            </div>
          ))}
        </div>
      )}
      {children}
    </section>
  );
}

const TONES = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  danger: "bg-danger/10 text-danger",
  warning: "bg-warning/10 text-warning",
  violet: "bg-violet-500/10 text-violet-600 dark:text-violet-300",
  cyan: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-300",
  pink: "bg-pink-500/10 text-pink-600 dark:text-pink-300",
  slate: "bg-surface-hover text-fg-muted",
};

// A KPI number with an icon; a link when `to` is given.
export function KpiTile({ icon: Icon, label, value, hint, tone = "primary", to }) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${TONES[tone]}`}>
          {Icon && <Icon size={19} />}
        </span>
        {to && (
          <ArrowUpRight size={15} className="text-fg-subtle opacity-0 transition group-hover:opacity-100" />
        )}
      </div>
      <p className="mt-3 text-2xl font-bold tabular-nums tracking-tight text-fg">{value}</p>
      <p className="text-xs font-medium text-fg-muted">{label}</p>
      {hint && <p className="mt-0.5 truncate text-[11px] text-fg-subtle">{hint}</p>}
    </>
  );
  const className =
    "group block rounded-2xl border border-border bg-surface p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md";
  return to ? (
    <Link to={to} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

const meterTone = (pct) => (pct >= 80 ? "success" : pct >= 60 ? "warning" : "danger");
const STROKE = { success: "stroke-success", warning: "stroke-warning", danger: "stroke-danger", primary: "stroke-primary" };

export function Ring({ pct, size = 56, stroke = 6, tone }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const k = tone || meterTone(pct);
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
        strokeDasharray={`${(c * Math.min(pct, 100)) / 100} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className={`${STROKE[k]} transition-[stroke-dasharray] duration-700`}
      />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" className="fill-fg font-bold" style={{ fontSize: size * 0.24 }}>
        {pct}%
      </text>
    </svg>
  );
}

// A percentage with a ring, a title and what it measures.
export function MeterCard({ title, pct, subtitle, tone }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <Ring pct={pct} tone={tone} />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-fg">{title}</p>
        <p className="text-xs text-fg-subtle">{subtitle}</p>
      </div>
    </div>
  );
}

// Section title used above groups of cards.
export function SectionLabel({ children, action }) {
  return (
    <div className="flex items-center justify-between gap-2 px-1">
      <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-fg-subtle">{children}</h2>
      {action}
    </div>
  );
}
