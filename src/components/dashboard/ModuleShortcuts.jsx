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

// Most used first; anything not listed follows in sidebar order.
const PRIORITY = [
  "Approvals/Attendance",
  "Approvals/Overtime",
  "Approvals/Leave",
  "Approvals/Cash Advance",
  "HRIS/Attendance",
  "Payroll/Payroll",
  "Trip Management/Dashboard",
  "Trip Management/Trip Assignment",
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
  "Payroll/Payroll": Wallet,
  "Payroll/Payroll Cutoffs": CalendarDays,
  "Payroll/Contribution Tables": FileText,
  "Trip Management/Dashboard": Gauge,
  "Trip Management/Delivery Summary": BarChart3,
  "Trip Management/Trip Assignment": Navigation,
  "Trip Management/Trip Approvals": CheckCheck,
  "Trip Management/Trip Confirmation": FileText,
  "Trip Management/Trip Category & Rates": Receipt,
  "Trip Management/Origins": MapPin,
  "Trip Management/Trip Dispatch": Truck,
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
  "Trip Management/Trip Category & Rates": "Trip Rates",
  "Trip Management/Trip Manual Entries": "Manual Entries",
  "Fleet Management/Vehicle Maintenance": "Maintenance",
  "Finance/Trip Review": "Finance Review",
  "Administrator/Cash Advance Settings": "CA Settings",
};

const PHONE_LIMIT = 7;

export default function ModuleShortcuts() {
  const { role, isVisible } = useModuleAccess();

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
  const tiles = [...items].sort((a, b) => rank(a.key) - rank(b.key));
  if (!tiles.length) return null;

  const openMenu = () => window.dispatchEvent(new Event("open-mobile-menu"));

  const Tile = ({ item, hiddenOnPhone }) => {
    const Icon = ICONS[item.key] || LayoutGrid;
    return (
      <Link
        to={item.path}
        className={`group flex flex-col items-center gap-1.5 text-center ${hiddenOnPhone ? "hidden md:flex" : ""}`}
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm transition group-hover:bg-primary/20 group-active:scale-95">
          <Icon size={26} strokeWidth={1.8} />
        </span>
        <span className="line-clamp-2 text-[11px] font-medium leading-tight text-fg">
          {SHORT[item.key] || item.label}
        </span>
      </Link>
    );
  };

  return (
    <div className="rounded-3xl border border-border bg-surface p-4 shadow-sm">
      <div className="grid grid-cols-4 gap-x-2 gap-y-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
        {tiles.map((item, index) => (
          <Tile key={item.key} item={item} hiddenOnPhone={tiles.length > PHONE_LIMIT + 1 && index >= PHONE_LIMIT} />
        ))}
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
    </div>
  );
}
