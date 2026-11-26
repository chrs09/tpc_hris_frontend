import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Briefcase,
  CalendarClock,
  CalendarDays,
  FileText,
  Hash,
  IdCard,
  Mail,
  Phone,
  ReceiptText,
  UserRound,
  Wallet,
} from "lucide-react";
import { getMyProfile } from "../../api/employee";
import { getScheduleTemplates } from "../../api/scheduleTemplates";
import { mapEmployeeToForm } from "../../utils/mapEmployee";
import EmployeeForm from "../../components/employees/EmployeeForm";
import MySalaryTab from "../../components/employees/MySalaryTab";

// My Profile: the logged-in person's own 201 record, read-only. Same
// sections as HRIS -> Employees, without Work History, plus a Salary tab
// with their own pay and salary history. Changes go through HR.
const TABS = [
  { key: "basic", label: "Basic Information", icon: UserRound },
  { key: "personal", label: "Personal Details", icon: BadgeCheck },
  { key: "government", label: "Government & Legal", icon: IdCard },
  { key: "files", label: "Employment Files", icon: FileText },
  { key: "salary", label: "Salary", icon: Wallet },
];

const noop = () => {};

const fileUrl = (path) =>
  !path ? null : path.startsWith("http") ? path : `${import.meta.env.VITE_API_URL}/${path}`;

const initials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

// "2 yrs 3 mos" since the hire date.
const tenure = (iso) => {
  if (!iso) return null;
  const start = new Date(`${iso.slice(0, 10)}T00:00:00`);
  const now = new Date();
  let months = (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth();
  if (now.getDate() < start.getDate()) months -= 1;
  if (months < 0) return null;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const parts = [];
  if (years) parts.push(`${years} yr${years > 1 ? "s" : ""}`);
  if (rest || !years) parts.push(`${rest} mo${rest === 1 ? "" : "s"}`);
  return parts.join(" ");
};

const fmtDay = (iso) =>
  iso
    ? new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("en-PH", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "—";

function Fact({ icon: Icon, label, value, hint }) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-2xl border border-border bg-surface p-3.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {Icon && <Icon size={17} />}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-fg-subtle">{label}</p>
        <p className="truncate text-sm font-semibold text-fg" title={typeof value === "string" ? value : undefined}>
          {value || "—"}
        </p>
        {hint && <p className="truncate text-xs text-fg-muted">{hint}</p>}
      </div>
    </div>
  );
}

export default function MyProfilePage() {
  const [employee, setEmployee] = useState(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("basic");
  const [scheduleTemplates, setScheduleTemplates] = useState([]);
  const [previewImage, setPreviewImage] = useState(null);
  const [photoBroken, setPhotoBroken] = useState(false);

  useEffect(() => {
    getMyProfile()
      .then(setEmployee)
      .catch((err) =>
        setError(err?.response?.data?.detail || "Couldn't load your profile. Try again later."),
      );
    getScheduleTemplates()
      .then((data) => setScheduleTemplates(data || []))
      .catch(() => setScheduleTemplates([]));
  }, []);

  const form = useMemo(() => (employee ? mapEmployeeToForm(employee) : null), [employee]);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl rounded-3xl border border-border bg-surface p-10 text-center shadow-sm">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface-hover text-fg-muted">
          <UserRound size={22} />
        </span>
        <h2 className="mt-3 text-xl font-bold text-fg">My Profile</h2>
        <p className="mt-1 text-sm text-fg-muted">{error}</p>
      </div>
    );
  }

  if (!employee || !form) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="h-56 animate-pulse rounded-3xl border border-border bg-surface" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl border border-border bg-surface" />
          ))}
        </div>
      </div>
    );
  }

  const fullName = [form.first_name, form.middle_name, form.last_name, form.suffix].filter(Boolean).join(" ");
  const photo = fileUrl(employee.files?.find((f) => f.document_type === "PROFILE_IMAGE")?.file_url);
  const active = Number(employee.is_active ?? 1) === 1;
  const schedule = scheduleTemplates.find((t) => String(t.id) === String(form.schedule_template_id))?.name;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {/* ---- header */}
      <section className="overflow-hidden rounded-3xl border border-border bg-surface shadow-sm">
        <div className="relative h-32 bg-gradient-to-br from-primary via-primary/70 to-primary/30 sm:h-40">
          <div
            aria-hidden
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.6) 1px, transparent 0)",
              backgroundSize: "18px 18px",
            }}
          />
          <span className="absolute right-4 top-4 rounded-full bg-black/25 px-3 py-1 text-xs font-medium text-white backdrop-blur">
            View only · changes go through HR
          </span>
        </div>

        <div className="relative px-5 pb-5 sm:px-8 sm:pb-7">
          <div className="-mt-14 flex flex-col gap-4 sm:-mt-16 sm:flex-row sm:items-end">
            {photo && !photoBroken ? (
              <button type="button" onClick={() => {
                  // The preview lives in the form, which the Salary tab replaces.
                  setActiveTab((t) => (t === "salary" ? "basic" : t));
                  setPreviewImage(photo);
                }} className="shrink-0" aria-label="View photo">
                <img
                  src={photo}
                  alt=""
                  onError={() => setPhotoBroken(true)}
                  className="h-28 w-28 rounded-3xl object-cover shadow-xl ring-4 ring-surface sm:h-32 sm:w-32"
                />
              </button>
            ) : (
              <span className="flex h-28 w-28 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-primary-hover text-3xl font-bold text-primary-foreground shadow-xl ring-4 ring-surface sm:h-32 sm:w-32">
                {initials(fullName) || "?"}
              </span>
            )}

            <div className="min-w-0 flex-1 sm:pb-1">
              <h1 className="truncate text-2xl font-bold tracking-tight text-fg sm:text-3xl">{fullName}</h1>
              <p className="mt-0.5 text-sm text-fg-muted">
                {[form.position, form.department].filter(Boolean).join(" · ")}
              </p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    active ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-success" : "bg-danger"}`} />
                  {active ? "Active" : "Inactive"}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-0.5 text-xs text-fg-muted">
                  <Hash size={11} /> Employee ID {employee.id}
                </span>
                {form.employment_type && (
                  <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-fg-muted">
                    {form.employment_type}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- quick facts */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Fact icon={CalendarDays} label="Date hired" value={fmtDay(form.date_hired)} hint={tenure(form.date_hired) && `${tenure(form.date_hired)} with the company`} />
        <Fact icon={Briefcase} label="Pay type" value={form.payroll_type} hint={form.employment_type} />
        <Fact icon={CalendarClock} label="Work schedule" value={schedule || "No schedule"} />
        <Fact icon={form.contact_number ? Phone : Mail} label={form.contact_number ? "Contact" : "Email"} value={form.contact_number || form.email} hint={form.contact_number ? form.email : undefined} />
      </div>

      {/* ---- tabs + content */}
      <section className="overflow-hidden rounded-3xl border border-border bg-surface shadow-sm">
        <div className="border-b border-border bg-surface-hover/40 p-2">
          <div className="flex gap-1 overflow-x-auto [scrollbar-width:none]">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const on = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition ${
                    on ? "bg-surface text-fg shadow-sm ring-1 ring-border" : "text-fg-muted hover:bg-surface/60 hover:text-fg"
                  }`}
                >
                  {Icon && <Icon size={15} className={on ? "text-primary" : ""} />}
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {activeTab === "salary" ? (
          <MySalaryTab />
        ) : (
          <EmployeeForm
            employee={employee}
            formData={form}
            isEditing={false}
            activeTab={activeTab}
            handleChange={noop}
            handleFileChange={noop}
            previewImage={previewImage}
            setPreviewImage={setPreviewImage}
            scheduleTemplates={scheduleTemplates}
            hideProfileHeader
          />
        )}
      </section>

      <p className="flex items-center justify-center gap-1.5 pb-2 text-xs text-fg-subtle">
        <ReceiptText size={13} /> Something wrong on your record? Ask HR to update it.
      </p>
    </div>
  );
}
