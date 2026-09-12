import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import SectionTabs from "../../components/ui/sectionTabs/SectionTabs";
import {
  addMonths,
  subMonths,
  format,
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
} from "date-fns";

import { getEmployeeList } from "../../api/employee";
import {
  attendanceRecord,
  updateAttendance,
  bulkAttendanceCheck,
  markAttendance,
  timeInSelfie,
  approveAttendance,
  rejectAttendance,
  adjustAttendanceTime,
} from "../../api/attendance";
import { getHolidays } from "../../api/holidays";

import { employeeRoles } from "../../constants/employeeRole";
import { departmentColors } from "../../constants/departmentColors";
import { statusColors } from "../../constants/statusColors";

import SelfieAttendanceModal from "../../components/attendance/SelfieAttendanceModal";
import AttendancePreviewModal from "../../components/attendance/AttendancePreviewModal";
import AttendanceTable from "../../components/attendance/AttendanceTable";
import AttendanceGridReview from "../../components/attendance/AttendanceGridReview";
import EditAttendanceModal from "../../components/attendance/EditAttendanceModal";
import BulkAttendanceModal from "../../components/attendance/BulkAttendanceModal";
import Alert from "../../components/ui/modals/Alert";
import { useAttendanceWeek } from "../../hooks/useAttendanceWeek";
import usePagination from "../../hooks/usePagination";
import Pagination from "../../components/ui/pagination/Pagination";
import { Button } from "../../components/ui/button/Button";
import useModuleAccess from "../../hooks/useModuleAccess";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers";

const AttendanceList = () => {
  const today = format(new Date(), "yyyy-MM-dd");
  const role = localStorage.getItem("role");
  const isSuperAdmin = role === "superadmin";

  // Sub-permissions under the "Attendance" module (Module Assignment page)
  // -- lets a customized employee be granted just one of the two view
  // modes below instead of the whole page. Unset (not customized) always
  // means both are open, same fallback rule useModuleAccess.isVisible uses
  // for every other nav item.
  const { hasCustomAccess, grantedModules } = useModuleAccess();
  // Neither view-specific key granted (even though this employee's
  // access is otherwise customized) means the superadmin never bothered
  // narrowing it down -- granting "Attendance" alone still opens both
  // views, same as before these two sub-permissions existed.
  const hasAnyAttendanceViewGrant =
    grantedModules.has("hris.attendance_list_view") ||
    grantedModules.has("hris.attendance_grid_view");
  const canSeeListView =
    !hasCustomAccess ||
    !hasAnyAttendanceViewGrant ||
    grantedModules.has("hris.attendance_list_view");
  const canSeeGridView =
    !hasCustomAccess ||
    !hasAnyAttendanceViewGrant ||
    grantedModules.has("hris.attendance_grid_view");

  const { isEditableDate, formattedRange } = useAttendanceWeek(isSuperAdmin);

  const [employeesFromAPI, setEmployeesFromAPI] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [activeEmployeeCount, setActiveEmployeeCount] = useState(0);

  const [filter, setFilter] = useState("All");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [editModal, setEditModal] = useState(null);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showSelfieModal, setShowSelfieModal] = useState(false);
  const [previewModal, setPreviewModal] = useState(null);
  const [alert, setAlert] = useState(null);
  const [showDateModal, setShowDateModal] = useState(false);
  const [dateRange, setDateRange] = useState([null, null]);

  // Lets NeedsReviewCard's "Review" link (dashboard) deep-link straight
  // into Grid Review View on a specific past date, e.g.
  // "/dashboard/attendance?view=grid&date=2026-09-10", instead of always
  // landing here on today with whatever view was last used.
  const [searchParams] = useSearchParams();
  const dateParam = searchParams.get("date");
  const viewParam = searchParams.get("view");

  const [requestedViewMode, setViewMode] = useState(
    viewParam === "table" ? "table" : "grid",
  );
  // Falls back to whichever view is actually accessible instead of the
  // requested one, the same way usePagination clamps an out-of-range page
  // at render time -- avoids landing on a blank view mode if this
  // employee's access was customized after they last picked a tab.
  const viewMode =
    requestedViewMode === "grid" && !canSeeGridView && canSeeListView
      ? "table"
      : requestedViewMode === "table" && !canSeeListView && canSeeGridView
        ? "grid"
        : requestedViewMode;
  const [reviewDate, setReviewDate] = useState(dateParam || today);

  const fromDate = dateRange[0] ? dateRange[0].toDate() : null;
  const toDate = dateRange[1] ? dateRange[1].toDate() : null;

  const [holidays, setHolidays] = useState([]);

  const currentYear = useMemo(() => currentMonth.getFullYear(), [currentMonth]);

  // ---------------------------------------
  // LOAD ATTENDANCE
  // ---------------------------------------

  const loadAttendance = async () => {
    try {
      const data = await attendanceRecord();

      const records = Array.isArray(data) ? data : data?.records || [];

      const totalActiveEmployees = Array.isArray(data)
        ? data.active_employee_count || 0
        : data?.active_employee_count || 0;

      setAttendanceData(records);
      setActiveEmployeeCount(totalActiveEmployees);

      console.log("Admin Active Employees:", data?.admin_count || 0);

      console.log("Motorpool Active Employees:", data?.motorpool_count || 0);

      console.log("Total Active Employees:", totalActiveEmployees);

      console.log("Attendance Records:", records.length);

      return {
        records,
        active_employee_count: totalActiveEmployees,
        admin_count: data?.admin_count || 0,
        motorpool_count: data?.motorpool_count || 0,
      };
    } catch (err) {
      console.error("Failed to load attendance:", err);

      setAttendanceData([]);
      setActiveEmployeeCount(0);

      return {
        records: [],
        active_employee_count: 0,
        admin_count: 0,
        motorpool_count: 0,
      };
    }
  };

  // ---------------------------------------
  // LOAD HOLIDAYS
  // ---------------------------------------

  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        const data = await getHolidays(currentYear);
        setHolidays(data);
      } catch (err) {
        console.error("Failed to fetch holidays:", err);
      }
    };

    fetchHolidays();
  }, [currentYear]);

  // ---------------------------------------
  // INITIAL DATA
  // ---------------------------------------

  useEffect(() => {
    const fetchData = async () => {
      try {
        const empData = await getEmployeeList();

        setEmployeesFromAPI(empData);

        await loadAttendance();
      } catch (err) {
        console.error("Failed to fetch attendance data:", err);
      }
    };

    fetchData();
  }, []);

  // ---------------------------------------
  // ALERT
  // ---------------------------------------

  useEffect(() => {
    if (!alert) return;

    const timer = setTimeout(() => {
      setAlert(null);
    }, 3000);

    return () => clearTimeout(timer);
  }, [alert]);

  // ---------------------------------------
  // EMPLOYEES
  // ---------------------------------------

  const employees = useMemo(() => {
    const searchTerm = employeeSearch.trim().toLowerCase();

    return employeesFromAPI
      .map((emp) => ({
        id: emp.id,
        name: `${emp.first_name || ""} ${emp.last_name || ""}`.trim(),
        role: emp.department,
      }))
      .filter((emp) => filter === "All" || emp.role === filter)
      .filter(
        (emp) => !searchTerm || emp.name.toLowerCase().includes(searchTerm),
      );
  }, [employeesFromAPI, filter, employeeSearch]);

  const {
    page: currentPage,
    setPage: setCurrentPage,
    totalPages,
    paginatedItems: currentEmployees,
  } = usePagination(employees, 15);

  // ---------------------------------------
  // DAYS IN MONTH
  // ---------------------------------------

  const daysInMonth = useMemo(() => {
    const allDays = eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth),
    });

    if (!fromDate || !toDate) return allDays;

    return allDays.filter((day) => day >= fromDate && day <= toDate);
  }, [currentMonth, fromDate, toDate]);

  // ---------------------------------------
  // ATTENDANCE MAP
  // ---------------------------------------

  const attendanceMap = useMemo(() => {
    const map = {};

    attendanceData.forEach((item) => {
      map[`${item.employee_id}-${item.attendance_date}`] = item;
    });

    return map;
  }, [attendanceData]);

  // ---------------------------------------
  // REVIEW RECORDS
  // ---------------------------------------

  const reviewRecords = useMemo(() => {
    // ---------------------------------------
    // ACTIVE EMPLOYEES
    // ADMIN + MOTORPOOL
    // ---------------------------------------

    const activeEmployees = employeesFromAPI.filter((employee) => {
      const department = (employee.department || "").trim().toLowerCase();

      const isActive = employee.is_active === 1 || employee.is_active === true;

      const isAdminOrMotorpool =
        department === "admin" || department === "motorpool";

      const matchesDepartment =
        filter === "All" || department === filter.trim().toLowerCase();

      return isActive && isAdminOrMotorpool && matchesDepartment;
    });

    // ---------------------------------------
    // ATTENDANCE RECORDS FOR SELECTED DATE
    // ---------------------------------------

    const dateRecords = attendanceData.filter((item) => {
      const matchesDate = item.attendance_date === reviewDate;

      const itemDepartment = (item.department || item.employee_department || "")
        .trim()
        .toLowerCase();

      const matchesDepartment =
        filter === "All" || itemDepartment === filter.trim().toLowerCase();

      return matchesDate && matchesDepartment;
    });

    // ---------------------------------------
    // CREATE LOOKUP
    // ---------------------------------------

    const attendanceByEmployee = new Map(
      dateRecords.map((record) => [record.employee_id, record]),
    );

    // ---------------------------------------
    // MERGE EMPLOYEES + ATTENDANCE
    //
    // Employees without attendance will receive
    // a temporary display record.
    // ---------------------------------------

    return activeEmployees.map((employee) => {
      const existingRecord = attendanceByEmployee.get(employee.id);

      if (existingRecord) {
        return existingRecord;
      }

      return {
        id: `missing-${employee.id}-${reviewDate}`,

        employee_id: employee.id,

        employee_name: `${employee.first_name || ""} ${
          employee.last_name || ""
        }`.trim(),

        employee_department: employee.department,
        department: employee.department,

        attendance_date: reviewDate,

        check_in_time: null,
        check_out_time: null,

        time_in_photo_url: null,
        time_out_photo_url: null,

        profile_photo_url: employee.profile_photo_url || null,

        time_in_latitude: null,
        time_in_longitude: null,
        time_in_address: null,

        time_out_latitude: null,
        time_out_longitude: null,
        time_out_address: null,

        face_match_score: null,
        face_review_status: "NO_ATTENDANCE",
        face_review_reason: "Employee has not taken attendance for this date.",

        attendance_method: null,
        status: "NO_ATTENDANCE",
        remarks: null,

        completed_trips: 0,
        trip_tickets: [],

        // Important:
        // This is NOT a real attendance record.
        is_missing_attendance: true,
      };
    });
  }, [employeesFromAPI, attendanceData, reviewDate, filter]);

  // ---------------------------------------
  // HOLIDAY MAP
  // ---------------------------------------

  const holidayMap = useMemo(() => {
    const map = {};

    holidays.forEach((h) => {
      if (h.is_active) {
        map[h.holiday_date] = h;
      }
    });

    return map;
  }, [holidays]);

  // ---------------------------------------
  // STATUS SYMBOL
  // ---------------------------------------

  const getStatusSymbol = (status) => {
    const map = {
      Present: "P",
      "On Leave": "OL",
      Absent: "X",
      Delay: "D",
      Halfday: "U",
      "No Trip": "NT",
      "Rest Day": "RD",
    };

    return map[status] || "";
  };

  // ---------------------------------------
  // MONTH NAVIGATION
  // ---------------------------------------

  const handlePrevMonth = () => setCurrentMonth((prev) => subMonths(prev, 1));

  const handleNextMonth = () => setCurrentMonth((prev) => addMonths(prev, 1));

  // ---------------------------------------
  // SELFIE TIME IN
  // ---------------------------------------

  const handleSelfieTimeIn = async (formData) => {
    try {
      await timeInSelfie(formData);

      await loadAttendance();

      setAlert({
        type: "success",
        message: "Selfie attendance saved successfully!",
      });
    } catch (err) {
      setAlert({
        type: "error",
        message:
          err.response?.data?.detail || "Failed to save selfie attendance.",
      });
    }
  };

  // ---------------------------------------
  // SAVE ATTENDANCE
  // ---------------------------------------

  const handleSave = async () => {
    if (new Date(editModal.date) > new Date()) {
      setAlert({
        type: "error",
        message: "Cannot save attendance for future dates.",
      });

      return;
    }

    const checkInTime = editModal.timeIn
      ? `${editModal.date} ${editModal.timeIn}:00`
      : null;

    const checkOutTime = editModal.timeOut
      ? `${editModal.date} ${editModal.timeOut}:00`
      : null;

    const existing = attendanceMap[`${editModal.employeeId}-${editModal.date}`];

    try {
      if (existing) {
        const statusChanged = existing.status !== editModal.status;

        const remarksChanged =
          (existing.remarks || "") !== (editModal.remarks || "");

        if (statusChanged || remarksChanged) {
          await updateAttendance({
            employee_id: editModal.employeeId,
            attendance_date: editModal.date,
            status: editModal.status,
            remarks: editModal.remarks,
          });
        }

        if (checkInTime || checkOutTime) {
          await adjustAttendanceTime(existing.id, {
            check_in_time: checkInTime,
            check_out_time: checkOutTime,
          });
        }
      } else {
        await markAttendance({
          employee_id: editModal.employeeId,
          attendance_date: editModal.date,
          status: editModal.status,
          remarks: editModal.remarks,
        });

        // Reload data so we can find the
        // newly created attendance record.
        const refreshed = await loadAttendance();

        const createdRecord = refreshed.records.find(
          (item) =>
            item.employee_id === editModal.employeeId &&
            item.attendance_date === editModal.date,
        );

        if (createdRecord && (checkInTime || checkOutTime)) {
          await adjustAttendanceTime(createdRecord.id, {
            check_in_time: checkInTime,
            check_out_time: checkOutTime,
          });
        }

        setAlert({
          type: "success",
          message: "Attendance created successfully!",
        });
      }

      // Refresh after save.
      await loadAttendance();

      setEditModal(null);
    } catch (err) {
      setAlert({
        type: "error",
        message: err.response?.data?.detail || "Operation failed.",
      });
    }
  };

  // ---------------------------------------
  // BULK SAVE
  // ---------------------------------------

  const handleBulkSave = async (records) => {
    try {
      await bulkAttendanceCheck({
        attendances: records,
      });

      await loadAttendance();

      setAlert({
        type: "success",
        message: "Bulk attendance saved successfully!",
      });
    } catch (err) {
      setAlert({
        type: "error",
        message: err.response?.data?.detail || "Failed to save attendance.",
      });
    }
  };

  // ---------------------------------------
  // REFRESH
  // ---------------------------------------

  const refreshAttendance = async () => {
    await loadAttendance();
  };

  // ---------------------------------------
  // APPROVE
  // ---------------------------------------

  const handleApproveAttendance = async (record, side = "time_in") => {
    try {
      const response = await approveAttendance(record.id, side);

      await refreshAttendance();

      toast.success(response?.message || "Attendance approved successfully!");
    } catch (err) {
      toast.error(
        err.response?.data?.detail || "Failed to approve attendance.",
      );
    }
  };

  const handleUpdateAttendance = async (record, changes) => {
    try {
      // ---------------------------------------
      // BUILD DATETIME FOR BACKEND
      // Backend expects:
      // YYYY-MM-DD HH:MM:SS
      // ---------------------------------------

      const checkInDateTime = changes.check_in_time
        ? `${record.attendance_date} ${changes.check_in_time}:00`
        : null;

      const checkOutDateTime = changes.check_out_time
        ? `${record.attendance_date} ${changes.check_out_time}:00`
        : null;

      console.log("Updating attendance:", {
        attendance_id: record.id,
        employee_id: record.employee_id,
        attendance_date: record.attendance_date,
        check_in_time: checkInDateTime,
        check_out_time: checkOutDateTime,
        remarks: changes.remarks,
      });

      // ---------------------------------------
      // UPDATE TIME IN / TIME OUT
      // ---------------------------------------

      const hasTimeChanges =
        changes.check_in_time !== undefined ||
        changes.check_out_time !== undefined;

      if (hasTimeChanges) {
        await adjustAttendanceTime(record.id, {
          check_in_time: checkInDateTime,

          check_out_time: checkOutDateTime,
        });
      }

      // ---------------------------------------
      // UPDATE ABSENT / LEAVE REASON
      // ---------------------------------------

      const status = (record.status || "").toUpperCase();

      const isAbsent = status === "ABSENT";

      const isLeave = status === "LEAVE" || status === "ON LEAVE";

      if ((isAbsent || isLeave) && changes.remarks !== undefined) {
        await updateAttendance({
          employee_id: record.employee_id,

          attendance_date: record.attendance_date,

          status: record.status,

          remarks: changes.remarks,
        });
      }

      // ---------------------------------------
      // REFRESH
      // ---------------------------------------

      await loadAttendance();

      toast.success("Attendance details updated successfully.");
    } catch (error) {
      console.error("Failed to update attendance:", error);

      console.error("Backend response:", error.response?.data);

      toast.error(
        error.response?.data?.detail || "Failed to update attendance details.",
      );

      throw error;
    }
  };

  // ---------------------------------------
  // REJECT
  // ---------------------------------------

  const handleRejectAttendance = async (record, side = "time_in") => {
    try {
      const response = await rejectAttendance(record.id, side);

      await refreshAttendance();

      toast.success(response?.message || "Attendance rejected successfully!");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to reject attendance.");
    }
  };

  // ---------------------------------------
  // DISPLAY TIME → INPUT TIME
  // ---------------------------------------

  const convertDisplayTimeToInput = (timeString) => {
    if (!timeString) return "";

    const [time, period] = timeString.split(" ");

    let [hours, minutes] = time.split(":");

    hours = parseInt(hours, 10);

    if (period === "PM" && hours !== 12) {
      hours += 12;
    }

    if (period === "AM" && hours === 12) {
      hours = 0;
    }

    return `${String(hours).padStart(2, "0")}:${minutes}`;
  };

  // ---------------------------------------
  // RENDER
  // ---------------------------------------

  return (
    <div className="space-y-5">
      <SectionTabs group="HRIS" />

      {alert && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      <div className="hidden text-sm text-fg-muted">
        Editable Week: {formattedRange} (Mon–Sat)
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {viewMode === "table" && isSuperAdmin && (
            <Button onClick={() => setShowBulkModal(true)}>
              Check Attendance
            </Button>
          )}

          {viewMode === "table" && (
            <Button onClick={() => setShowSelfieModal(true)} disabled>
              Selfie Attendance
            </Button>
          )}

          <select
            className="border border-border rounded-lg px-3 h-10 bg-surface text-fg text-sm"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            {Object.values(employeeRoles).map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>

          {viewMode === "table" && (
            <input
              type="text"
              value={employeeSearch}
              onChange={(e) => {
                setEmployeeSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search employee..."
              className="border border-border rounded-lg px-3 h-10 bg-surface text-fg text-sm placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          )}
        </div>

        {viewMode === "table" && (
          <>
            <Button className="h-10" onClick={() => setShowDateModal(true)}>
              {dateRange[0] && dateRange[1]
                ? `${dateRange[0].format("YYYY-MM-DD")} → ${dateRange[1].format(
                    "YYYY-MM-DD",
                  )}`
                : "Pick Date"}
            </Button>

            <Button size="sm" onClick={handlePrevMonth}>
              Prev
            </Button>

            <span className="font-semibold">
              {format(currentMonth, "MMMM yyyy")}
            </span>

            <Button size="sm" onClick={handleNextMonth}>
              Next
            </Button>
          </>
        )}

        <div className="ml-auto flex items-center gap-3">
          {viewMode === "grid" && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-fg-subtle">Review Date</label>

              <input
                type="date"
                value={reviewDate}
                onChange={(e) => setReviewDate(e.target.value)}
                className="h-10 rounded-lg border border-border px-3 text-sm bg-surface text-fg"
              />
            </div>
          )}

          {(canSeeListView || canSeeGridView) && (
            <div className="flex border border-border rounded-lg overflow-hidden h-10 bg-surface">
              {canSeeListView && (
                <button
                  type="button"
                  className={`px-4 text-sm ${
                    viewMode === "table"
                      ? "bg-blue-600 text-white"
                      : "bg-surface text-fg-muted"
                  }`}
                  onClick={() => setViewMode("table")}
                >
                  Table View
                </button>
              )}

              {canSeeGridView && (
                <button
                  type="button"
                  className={`px-4 text-sm ${
                    viewMode === "grid"
                      ? "bg-blue-600 text-white"
                      : "bg-surface text-fg-muted"
                  }`}
                  onClick={() => setViewMode("grid")}
                >
                  Review View
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {!canSeeListView && !canSeeGridView ? (
        <div className="rounded-xl border border-border bg-surface p-10 text-center text-sm text-fg-subtle">
          You don't have access to any Attendance view. Ask a superadmin to
          grant you one under Module Assignment.
        </div>
      ) : viewMode === "table" ? (
        <>
          <AttendanceTable
            employees={currentEmployees}
            daysInMonth={daysInMonth}
            attendanceMap={attendanceMap}
            holidayMap={holidayMap}
            departmentColors={departmentColors}
            statusColors={statusColors}
            getStatusSymbol={getStatusSymbol}
            isEditableDate={isEditableDate}
            isSuperAdmin={isSuperAdmin}
            today={today}
            onPreviewAttendance={(attendance, type) =>
              setPreviewModal({
                attendance,
                type,
              })
            }
            onCellClick={(emp, date, status, attendance) =>
              console.log("Attendance Clicked:", attendance) ||
              setEditModal({
                employeeId: emp.id,
                employeeName: emp.name,
                date,
                status: status || "Present",
                remarks: attendance?.remarks || "",
                attendance,
                timeIn: convertDisplayTimeToInput(attendance?.check_in_time),
                timeOut: convertDisplayTimeToInput(attendance?.check_out_time),
              })
            }
          />

          <Pagination
            page={currentPage}
            totalPages={totalPages}
            onChange={setCurrentPage}
          />
        </>
      ) : (
        <AttendanceGridReview
          records={reviewRecords}
          activeEmployeeCount={activeEmployeeCount}
          onApproveAttendance={handleApproveAttendance}
          onRejectAttendance={handleRejectAttendance}
          onUpdateAttendance={handleUpdateAttendance}
          isSuperAdmin={isSuperAdmin}
        />
      )}

      <BulkAttendanceModal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        employees={employees}
        attendanceMap={attendanceMap}
        today={today}
        onSave={handleBulkSave}
      />

      <EditAttendanceModal
        editModal={editModal}
        setEditModal={setEditModal}
        onSave={handleSave}
        attendanceMap={attendanceMap}
      />

      <SelfieAttendanceModal
        isOpen={showSelfieModal}
        onClose={() => setShowSelfieModal(false)}
        employees={employees}
        onSubmit={handleSelfieTimeIn}
        disabled
      />

      <AttendancePreviewModal
        previewModal={previewModal}
        setPreviewModal={setPreviewModal}
      />

      {showDateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-surface p-6 rounded-xl shadow-xl w-full max-w-sm">
            <h2 className="text-lg font-semibold mb-4">Select Date Range</h2>

            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <div className="flex flex-col gap-3">
                <DatePicker
                  label="From"
                  value={dateRange[0]}
                  onChange={(newValue) =>
                    setDateRange([newValue, dateRange[1]])
                  }
                />

                <DatePicker
                  label="To"
                  value={dateRange[1]}
                  onChange={(newValue) =>
                    setDateRange([dateRange[0], newValue])
                  }
                />
              </div>
            </LocalizationProvider>

            <div className="flex justify-end gap-2 mt-5">
              <Button
                variant="secondary"
                onClick={() => setShowDateModal(false)}
              >
                Cancel
              </Button>

              <Button onClick={() => setShowDateModal(false)}>Apply</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceList;
