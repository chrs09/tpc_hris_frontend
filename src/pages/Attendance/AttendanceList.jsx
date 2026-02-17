import React, { useEffect, useState, useMemo } from "react";
import {
  addMonths,
  subMonths,
  format,
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  getDay,
} from "date-fns";

import { getEmployeeList } from "./../../api/employee";
import {
  attendanceRecord,
  bulkAttendanceCheck,
  updateAttendance,
} from "./../../api/attendance";

import { employeeRoles } from "../../constants/employeeRole";
import { attendanceStatus } from "../../constants/attendanceStatus";
import { statusColors } from "../../constants/statusColors";
import { departmentColors } from "../../constants/departmentColors";
import { Button } from "../../components/ui/button/Button";
import Alert from "../../components/ui/modals/Alert";
import ConfirmModal from "../../components/ui/modals/ConfirmModal";

const AttendanceList = () => {
  const getCurrentQuincena = () => {
    const today = new Date();
    return today.getDate() <= 15 ? "first" : "second";
  };
  const today = format(new Date(), "yyyy-MM-dd");
  /* ------------------- STATE ------------------- */
  const [employeesFromAPI, setEmployeesFromAPI] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [quincena, setQuincena] = useState(getCurrentQuincena());
  const [filter, setFilter] = useState("All");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [modalRoleFilter, setModalRoleFilter] = useState("All");
  const [modalSelections, setModalSelections] = useState({});
  const [editModal, setEditModal] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [alert, setAlert] = useState(null);
  const employeesPerPage = 10;
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
    loading: false,
  });

  /* ------------------- EFFECTS ------------------- */

  // Lock scroll when ANY modal is open
  useEffect(() => {
    document.body.style.overflow = showModal || editModal ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [showModal, editModal]);

  useEffect(() => {
    const fetchData = async () => {
      const empData = await getEmployeeList();
      const attendance = await attendanceRecord();
      setEmployeesFromAPI(empData);
      setAttendanceData(attendance);
    };
    fetchData();
  }, []);

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setCurrentPage(1);
  };
  /* ------------------- COMPUTED ------------------- */

  const employees = useMemo(() => {
    return employeesFromAPI
      .map((emp) => ({
        id: emp.id,
        name: `${emp.first_name} ${emp.last_name}`,
        role: emp.department,
      }))
      .filter((emp) => filter === "All" || emp.role === filter);
  }, [employeesFromAPI, filter]);

  const totalPages = Math.ceil(employees.length / employeesPerPage);
  const currentEmployees = employees.slice(
    (currentPage - 1) * employeesPerPage,
    currentPage * employeesPerPage,
  );

  const daysInMonth = useMemo(() => {
    const allDays = eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth),
    });

    return allDays.filter((day) => {
      if (quincena === "first") return day.getDate() <= 15;
      if (quincena === "second") return day.getDate() >= 16;
      return true;
    });
  }, [currentMonth, quincena]);

  const attendanceMap = useMemo(() => {
    const map = {};
    attendanceData.forEach((item) => {
      const dateKey = format(new Date(item.check_in_time), "yyyy-MM-dd");
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

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  useEffect(() => {
    if (!alert) return;

    const timer = setTimeout(() => {
      setAlert(null);
    }, 3000);

    return () => clearTimeout(timer);
  }, [alert]);

  /* ======================= UI ======================= */

  return (
    <>
      <h1 className="text-2xl font-bold mb-6">Attendance</h1>

      {/* Alert */}
      {alert && (
        <div className="mb-4">
          <Alert
            type={alert.type}
            message={alert.message}
            onClose={() => setAlert(null)}
          />
        </div>
      )}

      {/* FILTERS */}
      <div className="flex flex-wrap gap-4 mb-6 items-center">
        <Button onClick={() => setShowModal(true)}>Check Attendance</Button>

        <select
          className="border rounded px-3 h-10"
          value={filter}
          onChange={(e) => handleFilterChange(e.target.value)}
        >
          {Object.values(employeeRoles).map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>

        <select
          value={quincena}
          onChange={(e) => setQuincena(e.target.value)}
          className="border rounded px-3 h-10"
        >
          <option value="all">All Dates</option>
          <option value="first">First Quincena</option>
          <option value="second">Second Quincena</option>
        </select>

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

      {/* TABLE */}
      <div className="overflow-x-auto border rounded shadow">
        <table className="min-w-full border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 bg-white border px-4 py-2">
                Employee
              </th>

              {daysInMonth.map((day) => {
                const dateKey = format(day, "yyyy-MM-dd");
                return (
                  <th
                    key={dateKey}
                    className={`border px-2 py-1 text-center ${
                      dateKey === today
                        ? "bg-blue-300"
                        : getDay(day) === 0
                          ? "bg-yellow-200"
                          : "bg-white"
                    }`}
                  >
                    {format(day, "dd")}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {currentEmployees.map((emp) => (
              <tr key={emp.id}>
                <td
                  className={`sticky left-0 border px-4 py-2 font-medium ${
                    departmentColors[emp.role] || "bg-white"
                  }`}
                >
                  {emp.name}
                </td>

                {daysInMonth.map((day) => {
                  const dateKey = format(day, "yyyy-MM-dd");
                  const status = attendanceMap[`${emp.id}-${dateKey}`];
                  const isToday = dateKey === today;

                  const bg =
                    statusColors[status] ||
                    (getDay(day) === 0 ? "bg-yellow-100" : "bg-white");

                  return (
                    <td
                      key={dateKey}
                      className={`border text-center font-bold ${bg} ${
                        isToday ? "cursor-pointer hover:brightness-95" : ""
                      }`}
                      onClick={() => {
                        if (!isToday) return;

                        setEditModal({
                          employeeId: emp.id,
                          employeeName: emp.name,
                          date: dateKey,
                          status: status || "Present",
                        });
                      }}
                    >
                      {status ? getStatusSymbol(status) : ""}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      {employees.length > 0 && (
        <div className="flex justify-center items-center gap-4 mt-6">
          <Button
            size="sm"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((prev) => prev - 1)}
          >
            Prev
          </Button>

          <span className="text-sm font-semibold">
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
      )}

      {/* ================= BULK MODAL ================= */}
      {showModal && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/50 z-50"
          onClick={() => setShowModal(false)}
        >
          <div
            className="relative bg-[#023047] rounded-2xl p-6 w-11/12 md:w-2/3 max-h-[85vh] overflow-y-auto border-2 border-[#fba919] shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-white text-xl font-bold hover:text-[#fba919]"
            >
              ✕
            </button>

            <h2 className="text-xl font-bold mb-6 text-[#fba919]">
              Bulk Check Attendance
            </h2>

            <div className="mb-4">
              <label className="mr-2 font-medium text-white">
                Filter by Role:
              </label>
              <select
                value={modalRoleFilter}
                onChange={(e) => setModalRoleFilter(e.target.value)}
                className="border border-gray-400 rounded h-9 px-3 bg-[#023047] text-white"
              >
                {Object.values(employeeRoles).map((role) => (
                  <option
                    key={role}
                    value={role}
                    className="text-black bg-[#fba919]"
                  >
                    {role}
                  </option>
                ))}
              </select>
            </div>

            <table className="w-full border border-gray-400 text-sm">
              <thead>
                <tr className="bg-[#0b3d5c] text-white">
                  <th className="border p-2 w-1/3">Employee</th>
                  <th className="border p-2">Department</th>
                  <th className="border p-2">Check</th>
                </tr>
              </thead>

              <tbody>
                {employeesFromAPI
                  .map((emp) => ({
                    id: emp.id,
                    name: `${emp.first_name} ${emp.last_name}`,
                    role: emp.department,
                  }))
                  .filter(
                    (emp) =>
                      modalRoleFilter === "All" || emp.role === modalRoleFilter,
                  )
                  .map((emp) => {
                    const existingRecord = attendanceMap[`${emp.id}-${today}`];

                    const isDisabled = !!existingRecord;

                    return (
                      <tr key={emp.id} className="text-white">
                        <td className="border p-2 text-center">{emp.name}</td>
                        <td className="border p-2 text-center">{emp.role}</td>
                        <td className="border p-2 text-center">
                          <select
                            className={`border rounded h-8 px-2 w-full ${
                              isDisabled
                                ? "bg-gray-600 text-gray-300 cursor-not-allowed"
                                : "bg-[#0b3d5c] text-white border-gray-400"
                            }`}
                            value={
                              isDisabled
                                ? existingRecord
                                : modalSelections[emp.id] || "Present"
                            }
                            onChange={(e) =>
                              setModalSelections((prev) => ({
                                ...prev,
                                [emp.id]: e.target.value,
                              }))
                            }
                            disabled={isDisabled}
                          >
                            {Object.values(attendanceStatus).map((status) => (
                              <option
                                key={status}
                                value={status}
                                className="text-black bg-[#fba919]"
                              >
                                {status}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>

            <div className="mt-6 flex justify-end gap-3 text-white">
              <Button variant="secondary" onClick={() => setShowModal(false)}>
                Cancel
              </Button>

              <Button
                onClick={() => {
                  setConfirmModal({
                    isOpen: true,
                    title: "Confirm Bulk Save",
                    message:
                      "Are you sure you want to save attendance for selected employees?",
                    loading: false,
                    onConfirm: async () => {
                      try {
                        setConfirmModal((prev) => ({ ...prev, loading: true }));

                        const recordSave = {
                          attendances: employeesFromAPI
                            .filter(
                              (emp) =>
                                modalRoleFilter === "All" ||
                                emp.department === modalRoleFilter,
                            )
                            .map((emp) => ({
                              employee_id: emp.id,
                              check_in_time: new Date().toISOString(),
                              status: modalSelections[emp.id] || "Present",
                            })),
                        };

                        await bulkAttendanceCheck(recordSave);

                        const refreshed = await attendanceRecord();
                        setAttendanceData(refreshed);

                        setAlert({
                          type: "success",
                          message: "Bulk attendance saved successfully!",
                        });

                        setModalSelections({});
                        setShowModal(false);

                        setConfirmModal((prev) => ({
                          ...prev,
                          isOpen: false,
                          loading: false,
                        }));
                      } catch {
                        setAlert({
                          type: "error",
                          message: "Failed to save attendance.",
                        });

                        setConfirmModal((prev) => ({
                          ...prev,
                          loading: false,
                        }));
                      }
                    },
                  });
                }}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ================= EDIT MODAL ================= */}
      {editModal && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/40 z-50"
          onClick={() => setEditModal(null)}
        >
          <div
            className="bg-[#0b3d5c] rounded-xl p-6 w-80 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-3 text-white">
              Edit Attendance
            </h3>

            <p className="text-sm mb-2 text-white">
              <strong>Employee:</strong> {editModal.employeeName}
            </p>

            <p className="text-sm mb-4 text-white">
              <strong>Date:</strong> {editModal.date}
            </p>

            <select
              value={editModal.status}
              onChange={(e) =>
                setEditModal((prev) => ({
                  ...prev,
                  status: e.target.value,
                }))
              }
              className="w-full border rounded h-10 px-3 mb-4 text-white"
            >
              {Object.values(attendanceStatus).map((status) => (
                <option
                  key={status}
                  value={status}
                  className="bg-[#fba919] text-black"
                >
                  {status}
                </option>
              ))}
            </select>

            <div className="flex justify-end gap-3 text-white">
              <Button variant="secondary" onClick={() => setEditModal(null)}>
                Cancel
              </Button>

              <Button
                onClick={() => {
                  setConfirmModal({
                    isOpen: true,
                    title: "Confirm Update",
                    message: "Are you sure you want to update this attendance?",
                    loading: false,
                    onConfirm: async () => {
                      try {
                        setConfirmModal((prev) => ({ ...prev, loading: true }));

                        await updateAttendance({
                          employee_id: editModal.employeeId,
                          date: editModal.date,
                          status: editModal.status,
                        });

                        const refreshed = await attendanceRecord();
                        setAttendanceData(refreshed);

                        setAlert({
                          type: "success",
                          message: "Attendance updated successfully!",
                        });

                        setEditModal(null);

                        setConfirmModal((prev) => ({
                          ...prev,
                          isOpen: false,
                          loading: false,
                        }));
                      } catch {
                        setAlert({
                          type: "error",
                          message: "Failed to update attendance.",
                        });

                        setConfirmModal((prev) => ({
                          ...prev,
                          loading: false,
                        }));
                      }
                    },
                  });
                }}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        loading={confirmModal.loading}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
      />
    </>
  );
};

export default AttendanceList;
