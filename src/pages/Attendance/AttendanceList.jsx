import React, { useEffect, useState, useMemo } from "react";
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
} from "../../api/attendance";

import { employeeRoles } from "../../constants/employeeRole";
import { departmentColors } from "../../constants/departmentColors";
import { statusColors } from "../../constants/statusColors";

import AttendanceTable from "../../components/attendance/AttendanceTable";
import EditAttendanceModal from "../../components/attendance/EditAttendanceModal";
import BulkAttendanceModal from "../../components/attendance/BulkAttendanceModal";
import Alert from "../../components/ui/modals/Alert";
import { useAttendanceWeek } from "../../hooks/useAttendanceWeek";
import { Button } from "../../components/ui/button/Button";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers";
// import dayjs from "dayjs";

const AttendanceList = () => {
  const today = format(new Date(), "yyyy-MM-dd");
  const role = localStorage.getItem("role");
  const isSuperAdmin = role === "superadmin";

  const { isEditableDate, formattedRange } = useAttendanceWeek(isSuperAdmin);

  /* ---------------- STATE ---------------- */
  const [employeesFromAPI, setEmployeesFromAPI] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [filter, setFilter] = useState("All");
  // const [quincena, setQuincena] = useState("second");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [editModal, setEditModal] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [alert, setAlert] = useState(null);
  const [showDateModal, setShowDateModal] = useState(false);
  const [dateRange, setDateRange] = useState([null, null]);
  const fromDate = dateRange[0] ? dateRange[0].toDate() : null;
  const toDate = dateRange[1] ? dateRange[1].toDate() : null;

  const employeesPerPage = 10;

  /* ---------------- FETCH ---------------- */
  useEffect(() => {
    const fetchData = async () => {
      const empData = await getEmployeeList();
      const attendance = await attendanceRecord();
      setEmployeesFromAPI(empData);
      setAttendanceData(attendance);
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!alert) return;

    const timer = setTimeout(() => {
      setAlert(null);
    }, 3000);

    return () => clearTimeout(timer);
  }, [alert]);

  /* ---------------- FILTERED EMPLOYEES ---------------- */
  const employees = useMemo(() => {
    return employeesFromAPI
      .map((emp) => ({
        id: emp.id,
        name: `${emp.first_name} ${emp.last_name}`,
        role: emp.department,
      }))
      .filter((emp) => filter === "All" || emp.role === filter);
  }, [employeesFromAPI, filter]);

  /* ---------------- PAGINATION ---------------- */
  const totalPages = Math.ceil(employees.length / employeesPerPage);

  const currentEmployees = employees.slice(
    (currentPage - 1) * employeesPerPage,
    currentPage * employeesPerPage,
  );

  /* ---------------- DAYS IN MONTH ---------------- */
  const daysInMonth = useMemo(() => {
    const allDays = eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth),
    });

    if (!fromDate || !toDate) return allDays;

    return allDays.filter((day) => day >= fromDate && day <= toDate);
  }, [currentMonth, fromDate, toDate]);

  /* ---------------- ATTENDANCE MAP ---------------- */
  const attendanceMap = useMemo(() => {
    const map = {};
    attendanceData.forEach((item) => {
      const dateKey = item.attendance_date;
      map[`${item.employee_id}-${dateKey}`] = item.status;
    });

    return map;
  }, [attendanceData]);

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

  /* ---------------- MONTH NAVIGATION ---------------- */
  const handlePrevMonth = () => setCurrentMonth((prev) => subMonths(prev, 1));

  const handleNextMonth = () => setCurrentMonth((prev) => addMonths(prev, 1));

  /* ---------------- SAVE LOGIC ---------------- */
  const handleSave = async () => {
    // 🚫 Prevent future save (extra safety)
    if (new Date(editModal.date) > new Date()) {
      setAlert({
        type: "error",
        message: "Cannot save attendance for future dates.",
      });
      return;
    }

    const existing = attendanceMap[`${editModal.employeeId}-${editModal.date}`];

    try {
      if (existing) {
        await updateAttendance({
          employee_id: editModal.employeeId,
          attendance_date: editModal.date,
          status: editModal.status,
        });

        setAlert({
          type: "success",
          message: "Attendance updated successfully!",
        });
      } else {
        await markAttendance({
          employee_id: editModal.employeeId,
          attendance_date: editModal.date,
          status: editModal.status,
        });

        setAlert({
          type: "success",
          message: "Attendance created successfully!",
        });
      }

      const refreshed = await attendanceRecord();
      setAttendanceData(refreshed);
      setEditModal(null);
    } catch (err) {
      setAlert({
        type: "error",
        message: err.response?.data?.detail || "Operation failed.",
      });
    }
  };

  const handleBulkSave = async (records) => {
    try {
      await bulkAttendanceCheck({ attendances: records });

      const refreshed = await attendanceRecord();
      setAttendanceData(refreshed);

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
  /* ================= Cutoff Filter Function ================= */

  /* ================= UI ================= */
  return (
    <>
      <h1 className="text-2xl font-bold mb-4">Attendance</h1>
      {alert && (
        <div className="mb-4">
          <Alert
            type={alert.type}
            message={alert.message}
            onClose={() => setAlert(null)}
          />
        </div>
      )}
      {/* Editable Week Indicator */}
      <div className="mb-4 text-sm font-semibold text-green-600">
        Editable Week: {formattedRange} (Mon–Sat)
      </div>

      {/* CONTROLS */}
      <div className="flex flex-wrap gap-4 mb-6 items-center">
        <Button onClick={() => setShowBulkModal(true)}>Check Attendance</Button>

        <select
          className="border rounded px-3 h-10"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          {Object.values(employeeRoles).map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>

        <Button className="h-10" onClick={() => setShowDateModal(true)}>
          {dateRange[0] && dateRange[1]
            ? `${dateRange[0].format("YYYY-MM-DD")} → ${dateRange[1].format("YYYY-MM-DD")}`
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
      </div>

      <AttendanceTable
        employees={currentEmployees}
        daysInMonth={daysInMonth}
        attendanceMap={attendanceMap}
        departmentColors={departmentColors}
        statusColors={statusColors}
        getStatusSymbol={getStatusSymbol}
        isEditableDate={isEditableDate}
        isSuperAdmin={isSuperAdmin} // ✅ ADD THIS
        today={today}
        onCellClick={(emp, date, status) =>
          setEditModal({
            employeeId: emp.id,
            employeeName: emp.name,
            date,
            status,
          })
        }
      />

      {/* PAGINATION */}
      <div className="flex justify-center items-center gap-4 mt-6">
        <Button
          size="sm"
          disabled={currentPage === 1}
          onClick={() => setCurrentPage((prev) => prev - 1)}
        >
          Prev
        </Button>

        <span>
          Page {currentPage} of {totalPages}
        </span>

        <Button
          size="sm"
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage((prev) => prev + 1)}
        >
          Next
        </Button>
      </div>
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
      {showDateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl w-87.5">
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
    </>
  );
};

export default AttendanceList;
