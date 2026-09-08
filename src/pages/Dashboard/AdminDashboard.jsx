// src/pages/dashboard/AdminDashboard.jsx

import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Eye, Clock3 } from "lucide-react";
import { getDashboardSummary } from "../../api/dashboard";
import { getApplicants } from "../../api/adminApplicants/index";
import { getMyLeaveRequests } from "../../api/leave";
import LeaveHistoryList from "../../components/leave/LeaveHistoryList";
import LeaveRequestModal from "../../components/leave/LeaveRequestModal";

const Card = ({ children, className = "" }) => (
  <div
    className={`bg-surface rounded-2xl p-5 border border-border shadow-sm ${className}`}
  >
    {children}
  </div>
);

const StatCard = ({
  title,
  value,
  dotColor = "bg-blue-400",
  subtitle = "",
}) => {
  return (
    <Card className="hover:border-primary/60 transition-all duration-200">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-fg-muted truncate">
            {title}
          </p>
          <h2 className="text-2xl font-bold text-fg leading-tight mt-1">
            {value}
          </h2>
          {subtitle ? (
            <p className="text-[10px] text-fg-subtle mt-1 truncate">
              {subtitle}
            </p>
          ) : null}
        </div>
        <div className={`w-2.5 h-2.5 rounded-full mt-1 ${dotColor}`} />
      </div>
    </Card>
  );
};

const ProgressMiniCard = ({ title, value, colorClass, subtitle }) => (
  <Card>
    <div className="flex items-center justify-between mb-2">
      <p className="text-[11px] uppercase tracking-wide text-fg-muted">
        {title}
      </p>
      <span className="text-sm font-semibold text-fg">{value}%</span>
    </div>

    <div className="w-full h-2 rounded-full bg-surface-active overflow-hidden">
      <div
        className={`h-full rounded-full ${colorClass}`}
        style={{ width: `${value}%` }}
      />
    </div>

    <p className="text-[10px] text-fg-subtle mt-2">{subtitle}</p>
  </Card>
);

const SectionListCard = ({ title, items }) => (
  <Card>
    <h3 className="text-sm font-semibold text-fg mb-3">{title}</h3>
    <div className="grid grid-cols-2 gap-2">
      {items.map((item, index) => (
        <div key={index} className="bg-surface-hover rounded-lg px-3 py-2">
          <p className="text-[11px] text-fg-muted truncate">{item.label}</p>
          <p className="text-sm font-semibold text-fg mt-1">{item.value}</p>
        </div>
      ))}
    </div>
  </Card>
);

const LatestApplicantsCard = ({ applicants = [] }) => {
  return (
    <Card className="xl:col-span-2">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-fg">
            Latest Applicants
          </h3>
          <p className="text-[11px] text-fg-muted mt-1">
            5 most recent applicant records
          </p>
        </div>

        <Link
          to="/dashboard/applicants"
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-surface-hover hover:bg-surface-active transition-colors"
          title="Open Applicants page"
        >
          <Eye size={16} className="text-fg-muted" />
        </Link>
      </div>

      {applicants.length === 0 ? (
        <div className="text-xs text-fg-muted">No applicants found.</div>
      ) : (
        <div className="space-y-2">
          {applicants.map((applicant) => (
            <div
              key={applicant.id}
              className="flex items-center justify-between gap-3 rounded-xl bg-surface-hover px-3 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-fg truncate">
                  {applicant.first_name} {applicant.last_name}
                </p>
                <p className="text-[11px] text-fg-muted truncate">
                  {applicant.position_applied || "No position applied"} •{" "}
                  {applicant.status || "pending"}
                </p>
                {applicant.email ? (
                  <p className="text-[11px] text-fg-subtle truncate mt-1">
                    {applicant.email}
                  </p>
                ) : null}
              </div>

              <Link
                to="/admin/applicants/"
                className="shrink-0 text-[11px] text-primary hover:text-primary-hover"
              >
                View
              </Link>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

const VerseCard = () => {
  const verse = {
    text: "Whatever you do, work at it with all your heart.",
    reference: "Colossians 3:23",
  };

  return (
    <Card>
      <h3 className="text-sm font-semibold text-fg mb-3">Daily Verse</h3>
      <p className="text-xs text-fg-muted italic leading-relaxed">
        “{verse.text}”
      </p>
      <p className="text-[11px] text-fg-subtle mt-2">— {verse.reference}</p>
    </Card>
  );
};

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
  const [currentTime, setCurrentTime] = useState(new Date());

  const role = localStorage.getItem("role");
  const [myLeaves, setMyLeaves] = useState([]);
  const [showLeaveSection, setShowLeaveSection] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);

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

  // Everyone who lands on this dashboard can file leave except
  // superadmin (drivers/employees/helpers have their own dashboards
  // with their own leave section already).
  const canFileLeave = role !== "superadmin";

  useEffect(() => {
    if (canFileLeave) {
      loadMyLeaves();
    }
  }, [canFileLeave, loadMyLeaves]);

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

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

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
      <div className="p-6 text-sm text-fg-muted">Loading dashboard...</div>
    );
  }

  return (
    <div className="p-4 bg-background min-h-screen space-y-4">
      {/* HERO */}
      <Card className="rounded-3xl p-6 bg-linear-to-br from-primary/10 via-surface to-surface">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="max-w-2xl">
            <h1 className="text-3xl sm:text-4xl font-bold text-fg">
              {getGreeting()} 👋
            </h1>

            <p className="text-fg-muted text-lg mt-2">{today}</p>

            <p className="mt-4 text-fg-muted text-base">
              Monitor workforce activity and attendance in real-time.
            </p>

            <div className="w-16 h-0.5 bg-border my-6" />

            <p className="italic text-fg-muted text-base leading-relaxed">
              “Whatever you do, work at it with all your heart.”
            </p>
            <p className="mt-2 text-sm text-primary">— Colossians 3:23</p>
          </div>

          <div className="text-left lg:text-right">
            <p className="text-sm text-fg-muted">Current Time</p>
            <div className="flex items-center gap-2 lg:justify-end mt-1">
              <Clock3 size={18} className="text-primary" />
              <p className="text-3xl font-semibold text-fg">
                {currentTime.toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
        <StatCard title="Employees" value={stats.total_employees} />
        <StatCard
          title="Present"
          value={stats.present}
          dotColor="bg-success"
        />
        <StatCard title="Absent" value={stats.absent} dotColor="bg-danger" />
        <StatCard
          title="On Leave"
          value={stats.on_leave}
          dotColor="bg-warning"
        />
        <StatCard
          title="Applicants"
          value={stats.total_applicants}
          dotColor="bg-purple-400"
        />
        <StatCard
          title="Hired %"
          value={`${applicantConversionRate}%`}
          dotColor="bg-pink-400"
        />
        <StatCard
          title="Active Trips"
          value={stats.active_trips}
          dotColor="bg-cyan-400"
        />
        <StatCard
          title="Pending"
          value={stats.pending_trip_approvals}
          dotColor="bg-orange-400"
        />
      </div>

      {/* PROGRESS */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <ProgressMiniCard
          title="Attendance"
          value={attendanceRate}
          subtitle="Present vs employees"
          colorClass={
            attendanceRate >= 80
              ? "bg-success"
              : attendanceRate >= 60
                ? "bg-warning"
                : "bg-danger"
          }
        />
        <ProgressMiniCard
          title="Applicants"
          value={applicantConversionRate}
          subtitle="Hired vs applicants"
          colorClass="bg-purple-400"
        />
        <ProgressMiniCard
          title="Trips"
          value={tripCompletionRate}
          subtitle="Completed vs volume"
          colorClass="bg-cyan-400"
        />
        <ProgressMiniCard
          title="Availability"
          value={workforceAvailabilityRate}
          subtitle="Workforce ready"
          colorClass="bg-primary"
        />
      </div>

      {/* MAIN */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
        <SectionListCard
          title="Workforce"
          items={[
            { label: "Present", value: stats.present },
            { label: "Absent", value: stats.absent },
            { label: "Leave", value: stats.on_leave },
            { label: "Drivers", value: stats.available_drivers },
          ]}
        />

        <SectionListCard
          title="Recruitment"
          items={[
            { label: "New", value: stats.new_applicants_today },
            { label: "Interview", value: stats.for_interview },
            { label: "Hired", value: stats.hired_applicants },
            { label: "Rejected", value: stats.rejected_applicants },
          ]}
        />

        <SectionListCard
          title="Trips"
          items={[
            { label: "Active", value: stats.active_trips },
            { label: "Done", value: stats.completed_trips_today },
            { label: "Pending", value: stats.pending_trip_approvals },
            { label: "Unknown", value: stats.unknown_store_checkins },
          ]}
        />
      </div>

      {/* BOTTOM */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
        <Card>
          <h3 className="text-sm font-semibold text-fg mb-3">Action</h3>
          <div className="text-xs text-fg-muted space-y-1">
            <div>• {stats.for_interview} applicants waiting</div>
            <div>• {stats.pending_trip_approvals} trips pending</div>
            <div>• {stats.unknown_store_checkins} unknown stores</div>
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-fg mb-3">System</h3>
          <div className="text-xs text-fg-muted space-y-1">
            <div>🟢 API Stable</div>
            <div>🟢 Sync Real-time</div>
            <div>🟢 Modules Active</div>
          </div>
        </Card>

        <VerseCard />
      </div>

      {/* WHITE SPACE FILLER / ACTIONABLE CONTENT */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
        <LatestApplicantsCard applicants={latestApplicants} />

        <Card>
          <h3 className="text-sm font-semibold text-fg mb-3">
            Recruitment Focus
          </h3>
          <div className="space-y-2">
            <div className="bg-surface-hover rounded-xl px-3 py-3 flex items-center justify-between">
              <span className="text-xs text-fg-muted">
                Applicants waiting
              </span>
              <span className="text-sm font-semibold text-fg">
                {stats.for_interview}
              </span>
            </div>
            <div className="bg-surface-hover rounded-xl px-3 py-3 flex items-center justify-between">
              <span className="text-xs text-fg-muted">Total applicants</span>
              <span className="text-sm font-semibold text-fg">
                {stats.total_applicants}
              </span>
            </div>
            <div className="bg-surface-hover rounded-xl px-3 py-3 flex items-center justify-between">
              <span className="text-xs text-fg-muted">Hired applicants</span>
              <span className="text-sm font-semibold text-fg">
                {stats.hired_applicants}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* MY LEAVE (admin, when linked to an employee record) */}
      {canFileLeave && showLeaveSection && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-fg">My Leave</h3>
            <button
              onClick={() => setShowLeaveModal(true)}
              className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary-hover transition-colors"
            >
              + File Leave
            </button>
          </div>
          <LeaveHistoryList leaves={myLeaves} onChanged={loadMyLeaves} />
        </section>
      )}

      {showLeaveModal && (
        <LeaveRequestModal
          onClose={() => setShowLeaveModal(false)}
          onFiled={loadMyLeaves}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
