// src/pages/dashboard/AdminDashboard.jsx

import React, { useState, useEffect, useCallback, useMemo } from "react";
import ModuleShortcuts from "../../components/dashboard/ModuleShortcuts";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import toast from "react-hot-toast";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Hourglass,
  Plane,
  Truck,
  UserCheck,
  UserPlus,
  Users,
  UserX,
} from "lucide-react";
import { DashboardHero, KpiTile, MeterCard, SectionLabel } from "../../components/dashboard/DashboardKit";
import { getDashboardSummary } from "../../api/dashboard";
import { getApplicants } from "../../api/adminApplicants/index";
import {
  getMyLeaveRequests,
  getAllLeaveRequests,
  approveLeaveRequest,
  rejectLeaveRequest,
} from "../../api/leave";
import { promptDialog } from "../../components/ui/dialog/dialogService";
import { getMyAttendanceForRange, getMyCutoffs } from "../../api/attendance";
import { getMyOvertimeRequests } from "../../api/overtimeRequests";
import { getMyMissedDays, getMyTimeCorrections } from "../../api/attendance/requests";
import TimeCorrectionModal from "../../components/timeCorrection/TimeCorrectionModal";
import TimeCorrectionHistoryList from "../../components/timeCorrection/TimeCorrectionHistoryList";
import useCanFileCorrection from "../../components/timeCorrection/useCanFileCorrection";
import useMyScheduleChanges from "../../components/scheduleChange/useMyScheduleChanges";
import { getHolidays } from "../../api/holidays";
import LeaveHistoryList from "../../components/leave/LeaveHistoryList";
import LeaveRequestModal from "../../components/leave/LeaveRequestModal";
import AttendanceHistoryList from "../../components/employeeDashboard/AttendanceHistoryList";
import OvertimeHistoryList from "../../components/overtime/OvertimeHistoryList";
import OvertimeActionButton from "../../components/overtime/OvertimeActionButton";
import DashboardCard from "../../components/dashboard/DashboardCard";
import NeedsReviewCard from "../../components/attendance/NeedsReviewCard";
import useModuleAccess from "../../hooks/useModuleAccess";
import { getNavGroups } from "../../constants/navGroups";

const initialsOf = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

const Initials = ({ name }) => (
  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
    {initialsOf(name) || "?"}
  </span>
);

const ViewAll = ({ to, label = "View all" }) => (
  <Link
    to={to}
    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10"
  >
    {label} <ArrowRight size={13} />
  </Link>
);

// Four numbers in a 2 x 2 block (Workforce / Recruitment / Trips).
const BreakdownCard = ({ title, icon, to, items }) => (
  <DashboardCard title={title} icon={icon} action={to ? <ViewAll to={to} label="Open" /> : null}>
    <div className="grid grid-cols-2 gap-2">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl bg-surface-hover/70 px-3 py-2.5">
          <p className="text-[11px] font-medium text-fg-muted">{item.label}</p>
          <p className={`mt-0.5 text-lg font-bold tabular-nums ${item.tone || "text-fg"}`}>{item.value}</p>
        </div>
      ))}
    </div>
  </DashboardCard>
);

const STATUS_PILL = {
  hired: "bg-success/10 text-success",
  rejected: "bg-danger/10 text-danger",
  interview: "bg-violet-500/10 text-violet-600 dark:text-violet-300",
  reviewed: "bg-primary/10 text-primary",
};

const LatestApplicantsCard = ({ applicants = [] }) => (
  <DashboardCard
    title="Latest Applicants"
    subtitle="5 most recent applications"
    icon={UserPlus}
    className="xl:col-span-2"
    action={<ViewAll to="/dashboard/applicants" />}
  >
    {applicants.length === 0 ? (
      <p className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-fg-subtle">
        No applicants yet.
      </p>
    ) : (
      <ul className="divide-y divide-border">
        {applicants.map((applicant) => {
          const name = `${applicant.first_name || ""} ${applicant.last_name || ""}`.trim();
          const status = (applicant.status || "pending").toLowerCase();
          return (
            <li key={applicant.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
              <Initials name={name} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-fg">{name || "Unnamed"}</p>
                <p className="truncate text-xs text-fg-subtle">
                  {applicant.position_applied || "No position applied"}
                  {applicant.email ? ` · ${applicant.email}` : ""}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${
                  STATUS_PILL[status] || "bg-warning/10 text-warning"
                }`}
              >
                {status.replace("_", " ")}
              </span>
            </li>
          );
        })}
      </ul>
    )}
  </DashboardCard>
);

const IncomingLeaveRequestsCard = ({ leaves = [], onApprove, onReject, actioningId }) => (
  <DashboardCard
    title="Incoming Leave Requests"
    subtitle="Pending company-wide leave filings"
    icon={Plane}
    className="xl:col-span-2"
    action={<ViewAll to="/dashboard/approvals?tab=leave" />}
  >
    {leaves.length === 0 ? (
      <div className="flex items-center gap-2 rounded-xl border border-dashed border-border p-5 text-xs text-fg-subtle">
        <CheckCircle2 size={16} className="text-success" />
        No pending leave requests.
      </div>
    ) : (
      <ul className="space-y-2">
        {leaves.map((leave) => (
          <li
            key={leave.id}
            className="flex flex-col gap-3 rounded-xl border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 items-start gap-3">
              <Initials name={leave.employee_name || ""} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-fg">
                  {leave.employee_name || `Employee #${leave.employee_id}`}
                </p>
                <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-fg-muted">
                  <span className="rounded-md bg-warning/10 px-1.5 py-0.5 text-[11px] font-semibold capitalize text-warning">
                    {leave.leave_type}
                  </span>
                  <span>
                    {leave.start_date}
                    {leave.start_date !== leave.end_date && ` – ${leave.end_date}`}
                  </span>
                </p>
                {leave.reason && <p className="mt-1 line-clamp-2 text-xs text-fg-subtle">“{leave.reason}”</p>}
                {leave.requested_at && <p className="mt-0.5 text-[11px] text-fg-subtle">Filed {leave.requested_at}</p>}
              </div>
            </div>
            <div className="flex shrink-0 gap-2 self-end sm:self-center">
              <button
                onClick={() => onReject(leave.id)}
                disabled={actioningId === leave.id}
                className="rounded-lg border border-danger/40 px-3 py-1.5 text-xs font-semibold text-danger transition hover:bg-danger/10 disabled:opacity-50"
              >
                Reject
              </button>
              <button
                onClick={() => onApprove(leave.id)}
                disabled={actioningId === leave.id}
                className="rounded-lg bg-success px-3 py-1.5 text-xs font-semibold text-success-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
              >
                Approve
              </button>
            </div>
          </li>
        ))}
      </ul>
    )}
  </DashboardCard>
);

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    total_employees: 0,
    present: 0,
    absent: 0,
    on_leave: 0,

    total_applicants: 0,
    new_applicants_today: 0,
    for_interview: 0,
    hired_applicants: 0,
    rejected_applicants: 0,

    active_trips: 0,
    pending_trip_approvals: 0,
    completed_trips_today: 0,
    unknown_store_checkins: 0,

    available_drivers: 0,
    available_helpers: 0,
  });

  const [latestApplicants, setLatestApplicants] = useState([]);
  const [loading, setLoading] = useState(true);

  const { role, isSuperAdmin, isVisible, approvesAny, canEditModule } =
    useModuleAccess();
  // Needs Review: only attendance reviewers -- superadmin, an Org Chart
  // head ticked for Attendance, or an Attendance grid "Can edit" grant
  // (same rule as the backend's /attendance/for-my-approval).
  const showNeedsReview =
    isSuperAdmin ||
    approvesAny("attendance") ||
    canEditModule("hris.attendance_grid_view");
  const [myLeaves, setMyLeaves] = useState([]);
  const [showLeaveSection, setShowLeaveSection] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  const [myAttendance, setMyAttendance] = useState([]);
  const [myAttendanceLoading, setMyAttendanceLoading] = useState(true);
  // My Attendance Records by payroll cutoff (current first).
  const [myCutoffs, setMyCutoffs] = useState([]);
  const [myCutoffIndex, setMyCutoffIndex] = useState(0);

  const [myOvertimeRequests, setMyOvertimeRequests] = useState([]);
  const [myOvertimeLoading, setMyOvertimeLoading] = useState(true);

  const [upcomingHolidays, setUpcomingHolidays] = useState([]);
  const [holidaysLoading, setHolidaysLoading] = useState(true);

  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [pendingLeavesLoading, setPendingLeavesLoading] = useState(true);
  const [actioningLeaveId, setActioningLeaveId] = useState(null);

  const loadMyLeaves = useCallback(async () => {
    try {
      const data = await getMyLeaveRequests();
      setMyLeaves(data);
      setShowLeaveSection(true);
    } catch (error) {
      console.error("Failed to load leave requests:", error);
      setShowLeaveSection(false);
    }
  }, []);

  const loadMyAttendance = useCallback(async (cutoff) => {
    try {
      setMyAttendanceLoading(true);
      // The cutoff picked, else the current one, else this month.
      let period = cutoff;
      if (!period) {
        const cutoffs = await getMyCutoffs(12).catch(() => []);
        setMyCutoffs(cutoffs);
        period = cutoffs[0];
      }
      const start = period?.start || format(new Date(), "yyyy-MM-01");
      const end = period?.end || format(new Date(), "yyyy-MM-dd");
      const data = await getMyAttendanceForRange(start, end);
      setMyAttendance(data);
    } catch (error) {
      console.error("Failed to load attendance history:", error);
    } finally {
      setMyAttendanceLoading(false);
    }
  }, []);

  const pickMyCutoff = (index) => {
    setMyCutoffIndex(index);
    loadMyAttendance(myCutoffs[index]);
  };

  const loadMyOvertime = useCallback(async () => {
    try {
      setMyOvertimeLoading(true);
      const data = await getMyOvertimeRequests();
      setMyOvertimeRequests(data);
    } catch (error) {
      console.error("Failed to load overtime requests:", error);
    } finally {
      setMyOvertimeLoading(false);
    }
  }, []);

  // Time corrections (forgot to time in / out): own requests, and days a
  // head confirmed worked without a time in -- same as the employee
  // dashboard. correctionDate: null = form closed, "" / a date = open.
  const [myCorrections, setMyCorrections] = useState([]);
  const [myMissedDays, setMyMissedDays] = useState([]);
  const [correctionDate, setCorrectionDate] = useState(null);
  // Anyone who times in / out -- superadmin included (server decides).
  const canCorrect = useCanFileCorrection();
  // A different time on a day (only people allowed on their 201).
  const schedule = useMyScheduleChanges();
  const loadMyCorrections = useCallback(async () => {
    try {
      const [corrections, missed] = await Promise.all([
        getMyTimeCorrections(),
        getMyMissedDays(),
      ]);
      setMyCorrections(corrections);
      setMyMissedDays(missed);
    } catch (error) {
      console.error("Failed to load time corrections:", error);
    }
  }, []);

  const loadUpcomingHolidays = useCallback(async () => {
    try {
      setHolidaysLoading(true);
      const data = await getHolidays(new Date().getFullYear());
      const today = format(new Date(), "yyyy-MM-dd");

      const upcoming = (Array.isArray(data) ? data : [])
        .filter((h) => h.holiday_date >= today)
        .sort((a, b) => a.holiday_date.localeCompare(b.holiday_date))
        .slice(0, 5);

      setUpcomingHolidays(upcoming);
    } catch (error) {
      console.error("Failed to load holidays:", error);
    } finally {
      setHolidaysLoading(false);
    }
  }, []);

  const loadPendingLeaves = useCallback(async () => {
    try {
      setPendingLeavesLoading(true);
      const data = await getAllLeaveRequests("pending");
      setPendingLeaves(data);
    } catch (error) {
      console.error("Failed to load pending leave requests:", error);
    } finally {
      setPendingLeavesLoading(false);
    }
  }, []);

  const handleApproveLeave = async (id) => {
    try {
      setActioningLeaveId(id);
      await approveLeaveRequest(id);
      toast.success("Leave request approved.");
      loadPendingLeaves();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to approve.");
    } finally {
      setActioningLeaveId(null);
    }
  };

  const handleRejectLeave = async (id) => {
    const remarks = await promptDialog(
      "Reason for rejecting this leave request (optional):",
    );
    if (remarks === null) return;

    try {
      setActioningLeaveId(id);
      await rejectLeaveRequest(id, remarks || undefined);
      toast.success("Leave request rejected.");
      loadPendingLeaves();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to reject.");
    } finally {
      setActioningLeaveId(null);
    }
  };

  // Everyone who lands on this dashboard gets their own quick-access HR
  // widgets (attendance, leave, holidays, overtime) except superadmin,
  // who manages these company-wide instead of filing their own
  // (drivers/employees/helpers have their own dashboards with their own
  // versions of this section already).
  const canFileLeave = role !== "superadmin";

  // The company-wide overview (KPI/progress/workforce/recruitment/trips
  // cards) is superadmin's territory. A non-superadmin still sees the
  // recruitment widgets specifically if they've been granted the HRIS
  // Applicants module (Module Assignment page) -- same rule Sidebar/
  // SectionTabs use for that nav item.
  const applicantsNavItem = useMemo(() => {
    const hrisGroup = getNavGroups(role).find((g) => g.label === "HRIS");
    return hrisGroup?.children.find((c) => c.label === "Applicants");
  }, [role]);

  const canSeeRecruitment =
    isSuperAdmin || (applicantsNavItem ? isVisible(applicantsNavItem) : false);

  useEffect(() => {
    if (canFileLeave) {
      loadMyLeaves();
      loadMyAttendance();
      loadMyOvertime();
      loadUpcomingHolidays();
    }
  }, [canFileLeave, loadMyLeaves, loadMyAttendance, loadMyOvertime, loadUpcomingHolidays]);

  useEffect(() => {
    if (canCorrect) loadMyCorrections();
  }, [canCorrect, loadMyCorrections]);

  useEffect(() => {
    if (isSuperAdmin) {
      loadPendingLeaves();
    }
  }, [isSuperAdmin, loadPendingLeaves]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [summary, applicants] = await Promise.all([
          getDashboardSummary(),
          getApplicants(),
        ]);

        setStats((prev) => ({
          ...prev,
          ...summary,
        }));

        const pendingApplicants = Array.isArray(applicants)
          ? applicants.filter((a) => {
              const status = (a.status || "").toLowerCase();
              return status === "pending" || status === "for_review";
            })
          : [];

        const sortedApplicants = [...pendingApplicants].sort((a, b) => {
          const dateA = new Date(
            a.created_at || a.createdAt || a.updated_at || 0,
          ).getTime();

          const dateB = new Date(
            b.created_at || b.createdAt || b.updated_at || 0,
          ).getTime();

          return dateB - dateA;
        });

        setLatestApplicants(sortedApplicants.slice(0, 5));
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();

  }, []);

  const attendanceRate =
    stats.total_employees > 0
      ? Math.round((stats.present / stats.total_employees) * 100)
      : 0;

  const applicantConversionRate =
    stats.total_applicants > 0
      ? Math.round((stats.hired_applicants / stats.total_applicants) * 100)
      : 0;

  const tripCompletionRate =
    stats.active_trips + stats.completed_trips_today > 0
      ? Math.round(
          (stats.completed_trips_today /
            (stats.active_trips + stats.completed_trips_today)) *
            100,
        )
      : 0;

  const workforceAvailabilityRate =
    stats.total_employees > 0
      ? Math.round(
          ((stats.total_employees - stats.absent - stats.on_leave) /
            stats.total_employees) *
            100,
        )
      : 0;

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <div className="h-40 animate-pulse rounded-3xl border border-border bg-surface" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl border border-border bg-surface" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-5 bg-background p-4">
      <DashboardHero
        verse
        subtitle={
          isSuperAdmin
            ? "Here's what's happening across the company today."
            : "Your work for today, all in one place."
        }
      />

      {/* Shortcut tiles to every page this person can open (GCash-style). */}
      <ModuleShortcuts />

      {/* QUICK ACTIONS (admin/coordinator/payroll/office admin -- not
          superadmin, who manages these company-wide instead of filing
          their own) -- kept right under the hero so it's the first
          actionable thing on the page, above the overview cards below. */}
      {(canFileLeave || canCorrect || schedule.canRequest) && (
        <DashboardCard title="Quick Actions" subtitle="File a request for yourself" icon={CalendarDays}>
          <div className="flex flex-wrap items-center gap-2">
            {canFileLeave && showLeaveSection && (
              <button
                onClick={() => setShowLeaveModal(true)}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover"
              >
                + File Leave
              </button>
            )}
            {canFileLeave && <OvertimeActionButton onChanged={loadMyOvertime} />}
            {canCorrect && (
              <button
                onClick={() => setCorrectionDate("")}
                className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-fg transition-colors hover:bg-surface-hover"
              >
                Time Correction
              </button>
            )}
            {schedule.canRequest && (
              <button
                onClick={schedule.openForm}
                className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-fg transition-colors hover:bg-surface-hover"
              >
                Schedule Change
              </button>
            )}
          </div>
        </DashboardCard>
      )}

      {isSuperAdmin && (
        <>
          <SectionLabel>Today at a glance</SectionLabel>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
            <KpiTile icon={Users} label="Employees" value={stats.total_employees} tone="primary" to="/dashboard/employees" />
            <KpiTile
              icon={UserCheck}
              label="Present"
              value={stats.present}
              hint={`${attendanceRate}% of employees`}
              tone="success"
              to="/dashboard/attendance"
            />
            <KpiTile icon={UserX} label="Absent" value={stats.absent} tone="danger" to="/dashboard/attendance" />
            <KpiTile icon={Plane} label="On Leave" value={stats.on_leave} tone="warning" to="/dashboard/approvals?tab=leave" />
            <KpiTile icon={UserPlus} label="Applicants" value={stats.total_applicants} tone="violet" to="/dashboard/applicants" />
            <KpiTile icon={BadgeCheck} label="Hired" value={`${applicantConversionRate}%`} hint="of applicants" tone="pink" />
            <KpiTile icon={Truck} label="Active Trips" value={stats.active_trips} tone="cyan" to="/dashboard/admin/trip-dashboard" />
            <KpiTile
              icon={Hourglass}
              label="Trips to approve"
              value={stats.pending_trip_approvals}
              tone={stats.pending_trip_approvals ? "warning" : "slate"}
              to="/dashboard/admin/trip-dashboard"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MeterCard title="Attendance" pct={attendanceRate} subtitle="Present vs employees" />
            <MeterCard title="Hiring" pct={applicantConversionRate} subtitle="Hired vs applicants" tone="primary" />
            <MeterCard title="Trips completed" pct={tripCompletionRate} subtitle="Completed vs today's volume" tone="primary" />
            <MeterCard title="Availability" pct={workforceAvailabilityRate} subtitle="Workforce ready today" />
          </div>
        </>
      )}

      {/* ATTENDANCE REVIEW + INCOMING LEAVE REQUESTS */}
      {(showNeedsReview || isSuperAdmin) && (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          {showNeedsReview && (
            <div className="xl:col-span-1">
              <NeedsReviewCard />
            </div>
          )}

          {isSuperAdmin && !pendingLeavesLoading && (
            <IncomingLeaveRequestsCard
              leaves={pendingLeaves}
              onApprove={handleApproveLeave}
              onReject={handleRejectLeave}
              actioningId={actioningLeaveId}
            />
          )}
        </div>
      )}

      {isSuperAdmin && (
        <>
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
            <BreakdownCard
              title="Workforce"
              icon={Users}
              to="/dashboard/attendance"
              items={[
                { label: "Present", value: stats.present, tone: "text-success" },
                { label: "Absent", value: stats.absent, tone: stats.absent ? "text-danger" : "text-fg" },
                { label: "On leave", value: stats.on_leave, tone: stats.on_leave ? "text-warning" : "text-fg" },
                { label: "Drivers free", value: stats.available_drivers },
              ]}
            />
            <BreakdownCard
              title="Recruitment"
              icon={BriefcaseBusiness}
              to="/dashboard/applicants"
              items={[
                { label: "New today", value: stats.new_applicants_today },
                { label: "Interview", value: stats.for_interview },
                { label: "Hired", value: stats.hired_applicants, tone: "text-success" },
                { label: "Rejected", value: stats.rejected_applicants },
              ]}
            />
            <BreakdownCard
              title="Trips"
              icon={Truck}
              to="/dashboard/admin/trip-dashboard"
              items={[
                { label: "Active", value: stats.active_trips },
                { label: "Done today", value: stats.completed_trips_today, tone: "text-success" },
                { label: "To approve", value: stats.pending_trip_approvals, tone: stats.pending_trip_approvals ? "text-warning" : "text-fg" },
                { label: "Unknown stores", value: stats.unknown_store_checkins, tone: stats.unknown_store_checkins ? "text-danger" : "text-fg" },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
            <DashboardCard title="Needs attention" subtitle="Open items waiting on someone" icon={AlertCircle} className="xl:col-span-2">
              <ul className="grid gap-2 sm:grid-cols-3">
                {[
                  { label: "Applicants waiting", value: stats.for_interview, to: "/dashboard/applicants" },
                  { label: "Trips to approve", value: stats.pending_trip_approvals, to: "/dashboard/admin/trip-dashboard" },
                  { label: "Unknown store check-ins", value: stats.unknown_store_checkins, to: "/dashboard/admin/trip-dashboard" },
                ].map((item) => (
                  <li key={item.label}>
                    <Link
                      to={item.to}
                      className="group flex items-center justify-between gap-2 rounded-xl border border-border p-3 transition hover:border-primary/40 hover:bg-surface-hover"
                    >
                      <span className="min-w-0">
                        <span className={`block text-xl font-bold tabular-nums ${item.value ? "text-warning" : "text-fg"}`}>{item.value}</span>
                        <span className="block truncate text-xs text-fg-muted">{item.label}</span>
                      </span>
                      <ArrowRight size={15} className="shrink-0 text-fg-subtle transition group-hover:translate-x-0.5 group-hover:text-primary" />
                    </Link>
                  </li>
                ))}
              </ul>
            </DashboardCard>

            <DashboardCard title="System" subtitle="Live status" icon={Activity}>
              <ul className="space-y-2.5 text-sm">
                {["API", "Real-time sync", "Modules"].map((label) => (
                  <li key={label} className="flex items-center justify-between">
                    <span className="text-fg-muted">{label}</span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                      </span>
                      Online
                    </span>
                  </li>
                ))}
              </ul>
            </DashboardCard>
          </div>
        </>
      )}

      {/* RECRUITMENT (superadmin, or anyone granted the HRIS Applicants
          module via Module Assignment) */}
      {canSeeRecruitment && (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          <LatestApplicantsCard applicants={latestApplicants} />

          <DashboardCard title="Recruitment Focus" icon={BriefcaseBusiness}>
            <ul className="space-y-2">
              {[
                { label: "Applicants waiting", value: stats.for_interview },
                { label: "Total applicants", value: stats.total_applicants },
                { label: "Hired applicants", value: stats.hired_applicants },
              ].map((row) => (
                <li key={row.label} className="flex items-center justify-between rounded-xl bg-surface-hover/70 px-3 py-2.5">
                  <span className="text-xs text-fg-muted">{row.label}</span>
                  <span className="text-sm font-bold tabular-nums text-fg">{row.value}</span>
                </li>
              ))}
            </ul>
          </DashboardCard>
        </div>
      )}

      {/* MY HR (admin/coordinator/payroll/office admin -- not superadmin,
          who manages these company-wide instead of filing their own) */}
      {canFileLeave && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          <DashboardCard
            title="My Attendance Records"
            action={
              myCutoffs.length > 0 && (
                <select
                  id="my-attendance-cutoff"
                  aria-label="Payroll cutoff"
                  value={myCutoffIndex}
                  onChange={(e) => pickMyCutoff(Number(e.target.value))}
                  className="h-9 rounded-lg border border-border bg-surface px-2 text-xs text-fg focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {myCutoffs.map((cutoff, index) => (
                    <option key={cutoff.start} value={index}>
                      {cutoff.label}
                      {cutoff.is_current ? " (current)" : ""}
                    </option>
                  ))}
                </select>
              )
            }
          >
            {!myAttendanceLoading && myAttendance.length > 0 && (
              <p className="mb-2 text-xs text-fg-subtle">
                {["Present", "Absent", "On Leave"]
                  .map((status) => [status, myAttendance.filter((r) => r.status === status).length])
                  .filter(([, n]) => n > 0)
                  .map(([status, n]) => `${n} ${status}`)
                  .join(" · ")}
              </p>
            )}
            {myAttendanceLoading ? (
              <p className="text-sm text-fg-muted">Loading...</p>
            ) : (
              <AttendanceHistoryList
                records={myAttendance}
                start={myCutoffs[myCutoffIndex]?.start}
                end={myCutoffs[myCutoffIndex]?.end}
              />
            )}
          </DashboardCard>

          {showLeaveSection && (
            <DashboardCard title="My Leave">
              <LeaveHistoryList leaves={myLeaves} onChanged={loadMyLeaves} />
            </DashboardCard>
          )}

          <DashboardCard title="Upcoming Holidays">
            {holidaysLoading ? (
              <p className="text-sm text-fg-muted">Loading...</p>
            ) : upcomingHolidays.length === 0 ? (
              <p className="text-sm text-fg-muted">
                No upcoming holidays this year.
              </p>
            ) : (
              <div className="space-y-2">
                {upcomingHolidays.map((holiday) => (
                  <div
                    key={holiday.id}
                    className="flex items-center justify-between rounded-xl bg-surface-hover px-3 py-3"
                  >
                    <span className="text-sm font-medium text-fg">
                      {holiday.holiday_name}
                    </span>
                    <span className="text-xs text-fg-muted">
                      {new Date(
                        `${holiday.holiday_date}T00:00:00`,
                      ).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </DashboardCard>

          <DashboardCard title="My Overtime Requests">
            {myOvertimeLoading ? (
              <p className="text-sm text-fg-muted">Loading...</p>
            ) : (
              <OvertimeHistoryList
                requests={myOvertimeRequests}
                onChanged={loadMyOvertime}
              />
            )}
          </DashboardCard>

        </div>
      )}

      {canCorrect && (
        <DashboardCard
          title="Time Corrections"
          action={
            <button
              onClick={() => setCorrectionDate("")}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary-hover"
            >
              + File Correction
            </button>
          }
        >
          <TimeCorrectionHistoryList
            requests={myCorrections}
            missedDays={myMissedDays}
            onFile={setCorrectionDate}
            onChanged={loadMyCorrections}
          />
        </DashboardCard>
      )}

      {schedule.canRequest && (
        <DashboardCard title="Schedule Changes" action={schedule.button}>
          {schedule.content}
        </DashboardCard>
      )}
      {schedule.modal}

      {showLeaveModal && (
        <LeaveRequestModal
          onClose={() => setShowLeaveModal(false)}
          onFiled={loadMyLeaves}
        />
      )}

      {correctionDate !== null && (
        <TimeCorrectionModal
          date={correctionDate}
          onClose={() => setCorrectionDate(null)}
          onFiled={loadMyCorrections}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
