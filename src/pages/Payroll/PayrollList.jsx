import React, { useEffect, useMemo, useState } from "react";
import { getEmployeeList } from "../../api/employee";
import { attendanceRecord } from "../../api/attendance";
import { getPayrollCutoff } from "../../utils/payroll/payrollCutoff";
import { getPayrollPeriods } from "../../utils/payroll/getPayrollPeriods";
import PayrollDetailModal from "../../components/payroll/PayrollDetailModal";
import {
  approveOT,
  getOTApprovals,
  reverseOT,
} from "../../api/payroll/overtimeApproval";
import { calculateAttendanceHours } from "../../utils/payroll/calculateAttendanceHours";

const PayrollList = () => {
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [department, setDepartment] = useState("Motorpool");
  const [searchEmployee, setSearchEmployee] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState(0);
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [otApprovals, setOTApprovals] = useState([]);

  useEffect(() => {
    setSelectedPeriod(0);
  }, [department]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [employeeData, attendanceData] = await Promise.all([
          getEmployeeList(),
          attendanceRecord(),
        ]);

        setEmployees(employeeData);
        setAttendance(attendanceData);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const loadOTApprovals = async () => {
    try {
      const data = await getOTApprovals();

      setOTApprovals(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadOTApprovals();
  }, []);

  const departments = useMemo(() => {
    return [
      ...new Set(employees.map((e) => e.department).filter(Boolean)),
    ].sort();
  }, [employees]);

  const cutoffInfo = useMemo(() => {
    return getPayrollCutoff(department, new Date());
  }, [department]);

  const periods = useMemo(() => {
    return getPayrollPeriods(department, 24);
  }, [department]);
  const activePeriod = periods[selectedPeriod] || cutoffInfo;

  const payrollRows = useMemo(() => {
    return employees
      .filter((emp) => emp.department === department)

      .filter((emp) => {
        const fullName = `${emp.first_name || ""} ${
          emp.last_name || ""
        }`.toLowerCase();

        return fullName.includes(searchEmployee.toLowerCase());
      })

      .map((employee) => {
        const records = attendance
          .filter(
            (record) =>
              record.employee_id === employee.id &&
              record.attendance_date >= activePeriod.cutoffStart &&
              record.attendance_date <= activePeriod.cutoffEnd,
          )
          .sort(
            (a, b) => new Date(a.attendance_date) - new Date(b.attendance_date),
          );

        let totalHours = 0;
        let otHours = 0;
        let daysWorked = 0;
        let undertimeHours = 0;
        let undertimeDeduction = 0;

        let attendanceCount = records.length;
        let missingTimeouts = 0;
        let warnings = [];

        records.forEach((record) => {
          const isLeave = record.status === "On Leave";

          const isAbsent = record.status === "Absent";

          if (
            !isLeave &&
            !isAbsent &&
            record.check_in_time_raw &&
            !record.check_out_time_raw
          ) {
            missingTimeouts++;
          }
          if (!record.check_in_time_raw || !record.check_out_time_raw) {
            return;
          }

          daysWorked++;

          const checkIn = new Date(record.check_in_time_raw);

          const checkOut = new Date(record.check_out_time_raw);

          //  const {
          //   regularHours,
          //   overtimeHours,
          //   undertimeHours:
          //     recordUndertime,
          // } =
          // calculateAttendanceHours(
          //   checkIn,
          //   checkOut,
          // );

          const result = calculateAttendanceHours({
            checkIn,
            checkOut,
            schedule: employee.schedule_template,
            attendanceDate: record.attendance_date,
          });

          if (
            Number.isNaN(result.renderedHours) ||
            Number.isNaN(result.regularHours) ||
            Number.isNaN(result.undertimeHours) ||
            Number.isNaN(result.overtimeHours)
          ) {
            console.error("BAD RECORD FOUND", {
              employee: employee.first_name + " " + employee.last_name,

              attendanceDate: record.attendance_date,

              checkInRaw: record.check_in_time_raw,

              checkOutRaw: record.check_out_time_raw,

              result,
            });
          }

          // end

          totalHours += result.renderedHours;

          otHours += result.overtimeHours;

          undertimeHours += result.undertimeHours;
        });

        const rate = Number(employee.daily_rate || 0);

        const payrollType = employee.payroll_type;

        let basicPay = 0;
        let hourlyRate = 0;

        if (payrollType === "Daily" || payrollType === "Weekly") {
          hourlyRate = rate / 8;

          basicPay = totalHours * hourlyRate;

          undertimeDeduction = undertimeHours * hourlyRate;
        } else if (payrollType === "Monthly") {
          basicPay = rate / 2;

          // Optional for future
          undertimeDeduction = 0;
        }

        const approval = otApprovals.find(
          (item) =>
            item.employee_id === employee.id &&
            item.cutoff_start === activePeriod.cutoffStart &&
            item.cutoff_end === activePeriod.cutoffEnd &&
            item.status === "Approved",
        );

        const approvedOTHours = approval?.approved_ot_hours || 0;

        const otPay = approvedOTHours * hourlyRate * 1.25;

        const grossPay = basicPay + otPay - undertimeDeduction;

        if (missingTimeouts > 0) {
          warnings.push(`${missingTimeouts} Missing Timeout`);
        }

        if (rate <= 0) {
          warnings.push("No Payroll Rate");
        }

        if (!payrollType) {
          warnings.push("No Payroll Type");
        }

        return {
          employee,

          attendanceCount,
          missingTimeouts,
          warnings,

          daysWorked,
          undertimeHours,
          undertimeDeduction,
          dailyRate: rate,
          payrollType,

          totalHours,
          otHours,

          approvedOTHours,

          otStatus: approval?.status || "Pending",

          basicPay,
          otPay,
          grossPay,

          records,

          needsOTApproval: otHours > 0 && approvedOTHours === 0,
        };
      });
  }, [
    employees,
    attendance,
    department,
    activePeriod,
    otApprovals,
    searchEmployee,
  ]);

  const summary = useMemo(() => {
    return {
      employees: payrollRows.length,
      totalHours: payrollRows.reduce((sum, row) => sum + row.totalHours, 0),
      totalOT: payrollRows.reduce((sum, row) => sum + row.otHours, 0),
      totalGross: payrollRows.reduce((sum, row) => sum + row.grossPay, 0),
    };
  }, [payrollRows]);

  const handleApproveOT = async (row) => {
    try {
      await approveOT({
        employee_id: row.employee.id,

        cutoff_start: activePeriod.cutoffStart,

        cutoff_end: activePeriod.cutoffEnd,

        detected_ot_hours: row.otHours,

        approved_ot_hours: row.otHours,

        remarks: "Approved by HR",
      });

      await loadOTApprovals();
    } catch (err) {
      console.error(err);
    }
  };

  const handleReverseOT = async (row) => {
    try {
      await reverseOT({
        employee_id: row.employee.id,

        cutoff_start: activePeriod.cutoffStart,

        cutoff_end: activePeriod.cutoffEnd,
      });

      await loadOTApprovals();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Payroll</h1>
          <p className="text-sm text-gray-500">
            Showing {payrollRows.length} employees
          </p>

          <p className="text-gray-500">Payroll Preview</p>
        </div>

        <div className="flex gap-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(Number(e.target.value))}
          >
            {periods.map((period, index) => (
              <option key={index} value={index}>
                {period.label}
              </option>
            ))}
          </select>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="border rounded-lg px-3 h-10 bg-white"
          >
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Search employee..."
            value={searchEmployee}
            onChange={(e) => setSearchEmployee(e.target.value)}
            className="border rounded-lg px-3 h-10 bg-white"
          />

          <button className="bg-blue-600 text-white px-4 rounded-lg">
            Generate Payroll
          </button>

          <button className="bg-green-600 text-white px-4 rounded-lg">
            Export Excel
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-500">Department</p>

            <p className="font-semibold">{department}</p>
          </div>

          <div>
            <p className="text-xs text-gray-500">Payroll Type</p>

            <p className="font-semibold">{activePeriod.payrollType}</p>
          </div>

          <div>
            <p className="text-xs text-gray-500">Cutoff Period</p>

            <p className="font-semibold">
              {activePeriod.cutoffStart} → {activePeriod.cutoffEnd}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-500">Payout Date</p>

            <p className="font-semibold text-green-700">
              {activePeriod.payoutDate}
            </p>
          </div>
        </div>
      </div>

      {/* SUMMARY */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border rounded-xl p-4">
          <p className="text-sm text-gray-500">Employees</p>

          <h2 className="text-2xl font-bold">{summary.employees}</h2>
        </div>

        <div className="bg-white border rounded-xl p-4">
          <p className="text-sm text-gray-500">Total Hours</p>

          <h2 className="text-2xl font-bold">
            {summary.totalHours.toFixed(2)}
          </h2>
        </div>

        <div className="bg-white border rounded-xl p-4">
          <p className="text-sm text-gray-500">OT Hours</p>

          <h2 className="text-2xl font-bold">{summary.totalOT.toFixed(2)}</h2>
        </div>

        <div className="bg-white border rounded-xl p-4">
          <p className="text-sm text-gray-500">Gross Payroll</p>

          <h2 className="text-2xl font-bold text-green-700">
            ₱
            {summary.totalGross.toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}
          </h2>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-6">Loading...</div>
        ) : (
          <div className="overflow-auto max-h-[70vh]">
            <table className="min-w-550 w-full">
              <thead className="sticky top-0 z-30 bg-gray-50">
                <tr>
                  <th className="sticky left-0 z-20 bg-gray-50 px-4 py-3 text-left min-w-55">
                    Employee
                  </th>

                  <th className="px-4 py-3 text-left">Days</th>

                  <th className="px-4 py-3 text-left">Daily Rate</th>

                  <th className="px-4 py-3 text-left">Payroll Type</th>

                  <th className="px-4 py-3 text-left">Hours</th>

                  <th className="px-4 py-3 text-left">Undertime</th>

                  <th className="px-4 py-3 text-left">UT Deduction</th>

                  <th className="px-4 py-3 text-left">OT</th>
                  <th className="px-4 py-3 text-left">Approved OT</th>

                  <th className="px-4 py-3 text-left">OT Status</th>

                  <th className="px-4 py-3 text-left">Basic Pay</th>

                  <th className="px-4 py-3 text-left">OT Pay</th>

                  <th className="px-4 py-3 text-left">Gross Pay</th>

                  <th className="px-4 py-3 text-left">Status</th>

                  <th className="px-4 py-3 text-left">Attendance Records</th>
                  <th className="px-4 py-3 text-left">Missing Timeout</th>
                  <th className="px-4 py-3 text-left">Warnings</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>

              <tbody>
                {payrollRows.map((row) => (
                  <tr key={row.employee.id} className="border-t">
                    <td className="sticky left-0 z-10 bg-white px-4 py-3 min-w-55 border-r">
                      {row.employee.first_name} {row.employee.last_name}
                    </td>

                    <td className="px-4 py-3">{row.daysWorked}</td>

                    <td className="px-4 py-3">₱{row.dailyRate}</td>

                    <td className="px-4 py-3">{row.payrollType}</td>
                    <td className="px-4 py-3">{row.totalHours.toFixed(2)}</td>

                    <td className="px-4 py-3 text-red-600 font-medium">
                      {row.undertimeHours.toFixed(2)}
                    </td>

                    <td className="px-4 py-3">
                      {row.undertimeDeduction.toFixed(2)}
                    </td>

                    <td className="px-4 py-3">{row.otHours.toFixed(2)}</td>

                    <td className="px-4 py-3">
                      {row.approvedOTHours.toFixed(2)}
                    </td>

                    <td className="px-4 py-3">{row.otStatus}</td>

                    <td className="px-4 py-3">₱{row.basicPay.toFixed(2)}</td>

                    <td className="px-4 py-3">₱{row.otPay.toFixed(2)}</td>

                    <td className="px-4 py-3 font-semibold text-green-700">
                      ₱{row.grossPay.toFixed(2)}
                    </td>

                    <td className="px-4 py-3">
                      {row.needsOTApproval ? (
                        <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-700">
                          Needs OT Approval
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">
                          Ready
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3">{row.attendanceCount}</td>

                    <td className="px-4 py-3">{row.missingTimeouts}</td>

                    <td className="px-4 py-3">
                      {row.warnings.length > 0 ? (
                        <div className="space-y-1">
                          {row.warnings.map((warning, index) => (
                            <div key={index} className="text-xs text-red-600">
                              ⚠ {warning}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-green-600 text-xs">
                          No Issues
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex gap-2 flex-wrap">
                        <button
                          className="px-3 py-1 rounded-lg bg-blue-600 text-white text-xs"
                          onClick={() => setSelectedPayroll(row)}
                        >
                          View Details
                        </button>

                        {row.otHours > 0 && row.otStatus !== "Approved" ? (
                          <button
                            className="px-3 py-1 rounded-lg bg-green-600 text-white text-xs"
                            onClick={() => handleApproveOT(row)}
                          >
                            Approve OT
                          </button>
                        ) : null}

                        {row.otStatus === "Approved" ? (
                          <button
                            className="px-3 py-1 rounded-lg bg-red-600 text-white text-xs"
                            onClick={() => handleReverseOT(row)}
                          >
                            Reverse OT
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <PayrollDetailModal
        isOpen={!!selectedPayroll}
        payroll={selectedPayroll}
        activePeriod={activePeriod}
        onClose={() => setSelectedPayroll(null)}
        onOTApproved={async () => {
          await loadOTApprovals();
        }}
      />
    </div>
  );
};

export default PayrollList;
