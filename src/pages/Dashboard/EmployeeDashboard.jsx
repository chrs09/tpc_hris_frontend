import React, { useEffect, useState, useCallback } from "react";
import { format, addMonths, subMonths, parse } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getMyAttendanceHistory } from "../../api/attendance";
import { getMyLeaveRequests } from "../../api/leave";
import { getMyOvertimeRequests } from "../../api/overtimeRequests";
import AttendanceHistoryList from "../../components/employeeDashboard/AttendanceHistoryList";
import LeaveHistoryList from "../../components/leave/LeaveHistoryList";
import LeaveRequestModal from "../../components/leave/LeaveRequestModal";
import OvertimeHistoryList from "../../components/overtime/OvertimeHistoryList";
import OvertimeActionButton from "../../components/overtime/OvertimeActionButton";
import DashboardCard from "../../components/dashboard/DashboardCard";
import useIsDesktop from "../../hooks/useIsDesktop";

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
};

const EmployeeDashboard = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [attendance, setAttendance] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() =>
    format(new Date(), "yyyy-MM"),
  );
  const [leaves, setLeaves] = useState([]);
  const [overtimeRequests, setOvertimeRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const isDesktop = useIsDesktop();

  const employeeName = localStorage.getItem("username") || "there";

  const loadAttendance = useCallback(async (month) => {
    try {
      setAttendanceLoading(true);
      const data = await getMyAttendanceHistory(month);
      setAttendance(data);
    } catch (error) {
      console.error("Failed to load attendance history:", error);
    } finally {
      setAttendanceLoading(false);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [leaveData, overtimeData] = await Promise.all([
        getMyLeaveRequests(),
        getMyOvertimeRequests(),
      ]);
      setLeaves(leaveData);
      setOvertimeRequests(overtimeData);
    } catch (error) {
      console.error("Failed to load employee dashboard:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadAttendance(selectedMonth);
  }, [selectedMonth, loadAttendance]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const selectedMonthDate = parse(selectedMonth, "yyyy-MM", new Date());
  const isCurrentMonth = selectedMonth === format(new Date(), "yyyy-MM");

  const goToPrevMonth = () =>
    setSelectedMonth(format(subMonths(selectedMonthDate, 1), "yyyy-MM"));

  const goToNextMonth = () => {
    if (isCurrentMonth) return;
    setSelectedMonth(format(addMonths(selectedMonthDate, 1), "yyyy-MM"));
  };

  const presentCount = attendance.filter((a) => a.status === "Present").length;
  const absentCount = attendance.filter((a) => a.status === "Absent").length;
  const leaveCount = attendance.filter((a) => a.status === "On Leave").length;

  const fileLeaveButton = (
    <button
      onClick={() => setShowLeaveModal(true)}
      className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary-hover transition-colors"
    >
      + File Leave
    </button>
  );

  const overtimeActionButton = <OvertimeActionButton onChanged={loadData} />;

  const attendanceMonthNav = (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={goToPrevMonth}
        aria-label="Previous month"
        className="rounded-lg p-1 text-fg-subtle transition-colors hover:bg-surface-hover hover:text-fg"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="min-w-26 text-center text-xs font-medium text-fg-muted">
        {format(selectedMonthDate, "MMMM yyyy")}
      </span>
      <button
        type="button"
        onClick={goToNextMonth}
        disabled={isCurrentMonth}
        aria-label="Next month"
        className="rounded-lg p-1 text-fg-subtle transition-colors hover:bg-surface-hover hover:text-fg disabled:cursor-not-allowed disabled:opacity-30"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );

  const attendanceContent = attendanceLoading ? (
    <p className="text-sm text-fg-muted">Loading...</p>
  ) : (
    <AttendanceHistoryList records={attendance} />
  );

  const leaveContent = loading ? (
    <p className="text-sm text-fg-muted">Loading...</p>
  ) : (
    <LeaveHistoryList leaves={leaves} onChanged={loadData} />
  );

  const overtimeContent = loading ? (
    <p className="text-sm text-fg-muted">Loading...</p>
  ) : (
    <OvertimeHistoryList requests={overtimeRequests} onChanged={loadData} />
  );

  return (
    <div
      className={
        isDesktop
          ? "min-h-screen space-y-4 bg-background p-4"
          : "mx-auto min-h-screen max-w-md space-y-6 bg-background pb-10"
      }
    >
      {/* HERO */}
      <div className="rounded-3xl border border-border bg-linear-to-br from-primary/10 via-surface to-surface p-5 text-fg shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">
              {getGreeting()}, {employeeName}
            </h1>
            <p className="text-sm text-fg-muted">
              {new Date().toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-fg-muted">Time</p>
            <p className="text-lg font-semibold">
              {currentTime.toLocaleTimeString()}
            </p>
          </div>
        </div>

        {/* QUICK STATS */}
        <div className="mt-5 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl border border-border bg-background p-3">
            <p className="text-lg font-bold text-success">{presentCount}</p>
            <p className="text-xs text-fg-muted">Present</p>
          </div>
          <div className="rounded-xl border border-border bg-background p-3">
            <p className="text-lg font-bold text-danger">{absentCount}</p>
            <p className="text-xs text-fg-muted">Absent</p>
          </div>
          <div className="rounded-xl border border-border bg-background p-3">
            <p className="text-lg font-bold text-warning">{leaveCount}</p>
            <p className="text-xs text-fg-muted">On Leave</p>
          </div>
        </div>
      </div>

      {isDesktop ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <DashboardCard title="Attendance History" action={attendanceMonthNav}>
            {attendanceContent}
          </DashboardCard>

          <DashboardCard title="Leave Requests" action={fileLeaveButton}>
            {leaveContent}
          </DashboardCard>

          <DashboardCard
            title="Overtime Requests"
            action={overtimeActionButton}
          >
            {overtimeContent}
          </DashboardCard>
        </div>
      ) : (
        <>
          {/* ATTENDANCE HISTORY */}
          <section className="px-1">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-fg">
                Attendance History
              </h2>
              {attendanceMonthNav}
            </div>
            {attendanceContent}
          </section>

          {/* LEAVE */}
          <section className="px-1">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-fg">
                Leave Requests
              </h2>
              {fileLeaveButton}
            </div>
            {leaveContent}
          </section>

          {/* OVERTIME */}
          <section className="px-1">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-fg">
                Overtime Requests
              </h2>
              {overtimeActionButton}
            </div>
            {overtimeContent}
          </section>
        </>
      )}

      {showLeaveModal && (
        <LeaveRequestModal
          onClose={() => setShowLeaveModal(false)}
          onFiled={loadData}
        />
      )}
    </div>
  );
};

export default EmployeeDashboard;
