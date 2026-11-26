import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Banknote,
  BarChart3,
  Bus,
  CalendarCheck,
  CalendarDays,
  CheckCheck,
  ClipboardList,
  Clock,
  FileText,
  Fingerprint,
  Fuel,
  Gauge,
  LayoutGrid,
  LifeBuoy,
  ChevronDown,
  Search,
  MapPin,
  Navigation,
  PenSquare,
  Receipt,
  Settings,
  ShieldCheck,
  Store,
  Truck,
  UserPlus,
  Users,
  Wallet,
  Warehouse,
  Wrench,
} from "lucide-react";
import { getNavGroups } from "../../constants/navGroups";
import useModuleAccess from "../../hooks/useModuleAccess";

// GCash-style shortcut tiles under the dashboard greeting: one rounded icon
// square per page this person can open (same rules as the sidebar). Phones
// show up to 7 + "More" (opens the full Menu); larger screens show them all.
// `actions` ({ key, label, icon, onClick }) are quick actions -- File Leave,
// File Overtime -- shown first, before the page tiles.

// Most used first; anything not listed follows in sidebar order.
const PRIORITY = [
  "Approvals/Attendance",
  "Approvals/Overtime",
  "Approvals/Leave",
  "Approvals/Cash Advance",
  "HRIS/Attendance",
  "Payroll/Payroll",
  "Trip Management/Dashboard",
  "Trip Management/Trip Dispatch",
  "Trip Management/Trip Approvals",
  "Cash Advance/Cash Advance",
  "Tickets/Tickets",
];

const ICONS = {
  "Approvals/Attendance": Fingerprint,
  "Approvals/Overtime": Clock,
  "Approvals/Leave": CalendarDays,
  "Approvals/Cash Advance": CheckCheck,
  "HRIS/Attendance": CalendarCheck,
  "HRIS/Employees": Users,
  "HRIS/Applicants": UserPlus,
  "HRIS/Questionaire": ClipboardList,
  "HRIS/Work Schedules": CalendarDays,
  "HRIS/Attendance Locations": MapPin,
  "Payroll/Payroll": Wallet,
  "Payroll/Payroll Cutoffs": CalendarDays,
  "Payroll/Contribution Tables": FileText,
  "Trip Management/Dashboard": Gauge,
  "Trip Management/Delivery Summary": BarChart3,
  "Trip Management/Trip Approvals": CheckCheck,
  "Trip Management/Trip Document": FileText,
  "Trip Management/Trip Category & Rates": Receipt,
  "Trip Management/Origins": MapPin,
  "Trip Management/Trip Dispatch": Navigation,
  "Trip Management/Trip Bypass": Wrench,
  "Trip Management/Trip Manual Entries": PenSquare,
  "Customers/Customers": Store,
  "Suppliers/Suppliers": Warehouse,
  "Fleet Management/Vehicle List": Bus,
  "Fleet Management/Vehicle Maintenance": Wrench,
  "Fleet Management/Fuel Requests": Fuel,
  "Cash Advance/Cash Advance": Banknote,
  "Finance/Trip Review": Receipt,
  "Finance/Expenses": FileText,
  "Finance/Bank Master": Banknote,
  "Tickets/Tickets": LifeBuoy,
  "Administrator/Users": Users,
  "Administrator/Org Chart": ShieldCheck,
  "Administrator/Settings": Settings,
};

// Short labels that fit under a tile.
const SHORT = {
  "Approvals/Attendance": "Attendance Approvals",
  "Approvals/Cash Advance": "CA Approvals",
  "Approvals/Overtime": "OT Approvals",
  "Approvals/Leave": "Leave Approvals",
  "Trip Management/Dashboard": "Trip Dashboard",
  "HRIS/Attendance Locations": "Attendance Locations",
  "Trip Management/Trip Category & Rates": "Trip Rates",
  "Trip Management/Trip Manual Entries": "Manual Entries",
  "Fleet Management/Vehicle Maintenance": "Maintenance",
  "Finance/Trip Review": "Finance Review",
  "Administrator/Cash Advance Settings": "CA Settings",
};

const PHONE_LIMIT = 7;
// Larger screens: first rows only until "Show all" (or a search).
const DESKTOP_LIMIT = 20;

export default function ModuleShortcuts({ actions = [] }) {
  const { role, isVisible } = useModuleAccess();
  const [showAll, setShowAll] = useState(false);
  const [query, setQuery] = useState("");

  const items = getNavGroups(role)
    .filter((group) => group.label !== "Dashboard")
    .flatMap((group) =>
      group.children
        .filter(isVisible)
        .map((item) => ({ ...item, key: `${group.label}/${item.label}` })),
    );
  const rank = (key) => {
    const i = PRIORITY.indexOf(key);
    return i === -1 ? PRIORITY.length : i;
  };
  const tiles = [
    ...actions,
    ...[...items].sort((a, b) => rank(a.key) - rank(b.key)),
  ];
  if (!tiles.length) return null;

  const q = query.trim().toLowerCase();
  const matching = q
    ? tiles.filter((item) => `${SHORT[item.key] || item.label} ${item.key}`.toLowerCase().includes(q))
    : tiles;
  const collapsible = !q && tiles.length > DESKTOP_LIMIT;
  const visible = collapsible && !showAll ? tiles.slice(0, DESKTOP_LIMIT) : matching;

  const openMenu = () => window.dispatchEvent(new Event("open-mobile-menu"));

  const Tile = ({ item, hiddenOnPhone }) => {
    const Icon = item.icon || ICONS[item.key] || LayoutGrid;
    const className = `group flex flex-col items-center gap-1.5 text-center ${hiddenOnPhone ? "hidden md:flex" : ""}`;
    const body = (
      <>
        <span
          className={`flex h-14 w-14 items-center justify-center rounded-2xl transition duration-200 group-hover:-translate-y-0.5 group-active:scale-95 ${
            item.onClick
              ? "bg-gradient-to-br from-primary to-primary-hover text-primary-foreground shadow-md shadow-primary/20"
              : "border border-primary/15 bg-gradient-to-br from-primary/15 to-primary/5 text-primary shadow-sm group-hover:border-primary/40 group-hover:shadow-md"
          }`}
        >
          <Icon size={24} strokeWidth={1.8} />
        </span>
        <span className="line-clamp-2 text-[11px] font-medium leading-tight text-fg-muted transition group-hover:text-fg">
          {SHORT[item.key] || item.label}
        </span>
      </>
    );
    return item.onClick ? (
      <button type="button" onClick={item.onClick} className={className}>
        {body}
      </button>
    ) : (
      <Link to={item.path} className={className}>
        {body}
      </Link>
    );
  };

  return (
    <div className="rounded-3xl border border-border bg-surface p-4 shadow-sm sm:p-5">
      <div className="mb-4 hidden items-center justify-between gap-3 md:flex">
        <div>
          <h2 className="text-sm font-semibold text-fg">Quick access</h2>
          <p className="text-xs text-fg-subtle">{tiles.length} pages you can open</p>
        </div>
        {tiles.length > DESKTOP_LIMIT && (
          <label className="relative w-64">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
            <input
              id="shortcut-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a page..."
              className="h-9 w-full rounded-xl border border-border bg-surface-hover/60 pl-8 pr-3 text-sm text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>
        )}
      </div>
      <div className="grid grid-cols-4 gap-x-2 gap-y-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
        {visible.map((item, index) => (
          <Tile key={item.key} item={item} hiddenOnPhone={!q && tiles.length > PHONE_LIMIT + 1 && index >= PHONE_LIMIT} />
        ))}
        {q && visible.length === 0 && (
          <p className="col-span-full py-4 text-center text-sm text-fg-subtle">No page matches &ldquo;{query}&rdquo;.</p>
        )}
        {tiles.length > PHONE_LIMIT + 1 && (
          <button
            type="button"
            onClick={openMenu}
            className="group flex flex-col items-center gap-1.5 text-center md:hidden"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-hover text-fg-muted shadow-sm group-active:scale-95">
              <LayoutGrid size={26} strokeWidth={1.8} />
            </span>
            <span className="text-[11px] font-medium leading-tight text-fg">More</span>
          </button>
        )}
      </div>
      {collapsible && (
        <div className="mt-4 hidden justify-center md:flex">
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-1.5 text-xs font-medium text-fg-muted transition hover:border-primary/40 hover:text-primary"
          >
            {showAll ? "Show less" : `Show all ${tiles.length}`}
            <ChevronDown size={14} className={`transition ${showAll ? "rotate-180" : ""}`} />
          </button>
        </div>
      )}
    </div>
  );
}
