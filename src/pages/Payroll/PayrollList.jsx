import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { getEmployeeList } from "../../api/employee";
import { attendanceRecord } from "../../api/attendance";
import { getHolidays } from "../../api/holidays/index"
import { getPayrollCutoff } from "../../utils/payroll/payrollCutoff";
import { getPayrollPeriods } from "../../utils/payroll/getPayrollPeriods";
import PayrollDetailModal from "../../components/payroll/PayrollDetailModal";
import {
  approveOT,
  getOTApprovals,
  reverseOT,
} from "../../api/payroll/overtimeApproval";
import { calculateAttendanceHours } from "../../utils/payroll/calculateAttendanceHours";
import { exportPayrollExcel } from "../../utils/payroll/PayrollExcelExport";
import { getSSSEmployeeDeduction } from "../../utils/payroll/sssContributionTable";
import PayslipModal from "../../components/payroll/PayslipModal";
import {
  savePayrollDeduction,
  savePayrollDeductionsBulk,
  getPayrollDeductions,
} from "../../api/payroll/payroll_deductions";


/*
 * Government contribution lookup used by Admin payroll.
 *
 * Because Admin payroll is semi-monthly:
 *
 * SSS EE  -> employee deduction selected from the gross-pay contribution range
 * PHIC EE -> 2.5% of Basic per cutoff (allowance excluded)
 * Pag-IBIG EE default ₱200/month -> ₱100 per cutoff
 *
 * SSS is calculated from `grossPay` inside the main payroll loop; PHIC is
 * calculated from `semiMonthlyBasic`; Pag-IBIG uses the flat lookup below.
 */
const getPagibigEmployeeShare = (monthlyBasic) => {
  const basic = Number(monthlyBasic || 0);

  if (basic <= 0) return 0;

  // Default monthly Pag-IBIG EE contribution = ₱200.
  // Admin payroll is semi-monthly, so deduct ₱100 per cutoff.
  const monthlyPagibigEE = 200;

  return monthlyPagibigEE / 2;
};

const PayrollList = () => {
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [department, setDepartment] = useState("Motorpool");
  const [searchEmployee, setSearchEmployee] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState(0);
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [selectedPayslips, setSelectedPayslips] = useState([]);
  const [otApprovals, setOTApprovals] = useState([]);
  const [holidays, setHolidays] = useState([]);

  // Manual per-employee, per-cutoff entries that aren't computed from
  // attendance (Others, government deductions, personal deductions, etc.)
  // Keyed by `${employeeId}_${cutoffStart}_${cutoffEnd}`.
  // NOTE: this lives only in local state for now — nothing is persisted to
  // the backend. If you want these saved, they'll need employee/payroll
  // fields + an API endpoint on your end.
  const [adjustments, setAdjustments] = useState({});

  const getAdjustmentKey = (employeeId, period) =>
    `${employeeId}_${period.cutoffStart}_${period.cutoffEnd}`;

  const updateAdjustment = (employeeId, period, field, value) => {
    const key = getAdjustmentKey(employeeId, period);

    setAdjustments((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value === "" ? 0 : Number(value),
      },
    }));
  };

  useEffect(() => {
    setSelectedPeriod(0);
  }, [department]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentYear = new Date().getFullYear();

        const [
            employeeData,
            attendanceData,
            holidayData,
        ] = await Promise.all([
            getEmployeeList(),
            attendanceRecord(),
            getHolidays(currentYear),
        ]);

        setEmployees(employeeData);
        setAttendance(attendanceData);
        setHolidays(holidayData);
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

  // Re-hydrates the manual SSS/PhilHealth/Pag-IBIG override inputs from
  // whatever was last saved to `payroll_deductions` for this cutoff +
  // department. Without this, `adjustments` starts empty on every page
  // load/refresh and the inputs silently fall back to their computed
  // defaults even though a row was already saved.
  useEffect(() => {
    if (!activePeriod?.cutoffStart || !activePeriod?.cutoffEnd) return;

    const loadSavedDeductions = async () => {
      try {
        const cutoff_period = `${activePeriod.cutoffStart}_${activePeriod.cutoffEnd}`;
        const saved = await getPayrollDeductions({ cutoff_period, department });
        const records = Array.isArray(saved) ? saved : saved?.items || [];

        if (records.length === 0) return;

        setAdjustments((prev) => {
          const next = { ...prev };

          records.forEach((record) => {
            const key = getAdjustmentKey(record.employee_id, activePeriod);

            next[key] = {
              // Seed from the DB first...
              sssDeduction: record.sss_deduction,
              philhealthDeduction: record.philhealth_deduction,
              pagibigDeduction: record.pagibig_deduction,
              // ...but let any value already edited locally this session
              // (e.g. the user just typed something) win.
              ...prev[key],
            };
          });

          return next;
        });
      } catch (err) {
        console.error("Failed to load saved payroll_deductions", err);
      }
    };

    loadSavedDeductions();
  }, [activePeriod, department]);

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

        //new added
        const isTripBasedEmployee =
          employee.department?.toLowerCase().includes("driver") ||
          employee.department?.toLowerCase().includes("helper");

        let tripPay = 0;
        let totalTrips = 0;
        let tripBreakdown = [];

        const tripsByDate = {};
        const processedTrips = new Set();

        let renderedHours = 0;
        let regularHours = 0;
        let otHours = 0;
        let daysWorked = 0;

        let undertimeHours = 0;
        let tardinessHours = 0;

        let undertimeDeduction = 0;
        let tardinessDeduction = 0;

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

          renderedHours += result.renderedHours;

          regularHours += result.regularHours;

          otHours += result.overtimeHours;

          undertimeHours += result.undertimeHours;
          tardinessHours += result.tardinessHours || 0;
        });

        //added
        if (isTripBasedEmployee) {
          records.forEach((record) => {
            console.log(
              "PAYROLL RECORD",
              employee.first_name,
              record.attendance_date,
              record.completed_trips,
              record.trip_tickets,
            );

            const trips = record.trip_tickets || [];

            if (!trips.length) return;

            if (!tripsByDate[record.attendance_date]) {
              tripsByDate[record.attendance_date] = [];
            }

            tripsByDate[record.attendance_date].push(...trips);
          });

          const dailyTripCounter = {};

          Object.entries(tripsByDate).forEach(([date, trips]) => {
            trips.forEach((trip) => {
              if (processedTrips.has(trip.trip_id)) {
                return;
              }

              processedTrips.add(trip.trip_id);

              dailyTripCounter[date] = (dailyTripCounter[date] || 0) + 1;

              const isFirstTrip = dailyTripCounter[date] === 1;

              let rate = 0;

              if (employee.department?.toLowerCase().includes("driver")) {
                rate = isFirstTrip
                  ? Number(trip.driver_first_trip_rate || 0)
                  : Number(trip.driver_next_trip_rate || 0);
              } else {
                rate = isFirstTrip
                  ? Number(trip.helper_first_trip_rate || 0)
                  : Number(trip.helper_next_trip_rate || 0);
              }

              tripPay += rate;
              totalTrips++;

              console.log(
                "TRIP SEQUENCE",
                date,
                dailyTripCounter[date],
                trip.ticket_no,
              );

              tripBreakdown.push({
                date,

                trip_id: trip.trip_id,

                ticket_no: trip.ticket_no,

                vehicle_unit: trip.vehicle_unit,

                plate_number: trip.plate_number,

                trip_rate_profile: trip.trip_rate_profile,

                rate,

                tripSequence: dailyTripCounter[date],

                isFirstTrip,
              });
            });
          });
        }
        //

        const payrollType = employee.payroll_type;
        const isMonthlyRateType = payrollType === "Monthly";

        // Monthly-rate employees: Monthly Basic/Allow is the source of
        // truth. Daily equivalents are derived using Factor 313
        // (Annual Basic ÷ 313), matching the rate sheet:
        //   Daily Rate = (Monthly Basic × 12) ÷ 313
        //   Daily Allow = (Monthly Allow × 12) ÷ 313
        // Daily/Weekly employees: daily_rate/daily_allowance is the
        // source of truth, entered directly (no conversion).
        const monthlyBasic = Number(employee.monthly_basic || 0);
        const monthlyAllow = Number(employee.monthly_allow || 0);

        const rate = isMonthlyRateType
          ? Math.round((monthlyBasic * 12) / 313)
          : Number(employee.daily_rate || 0);

        const dailyAllowanceFromRate = isMonthlyRateType
          ? Math.round((monthlyAllow * 12) / 313)
          : Number(employee.daily_allowance || employee.allowance || 0);

        let basicPay = 0;
        let hourlyRate = rate / 8;

        // NEW
        let semiMonthlyBasic = 0;
        let semiMonthlyAllowance = 0;
        let totalBasicPay = 0;
        let absentDeduction = 0;

        // Daily & Weekly
        if (
            payrollType === "Daily" ||
            payrollType === "Weekly"
        ) {
            basicPay = regularHours * hourlyRate;

            undertimeDeduction =
                undertimeHours * hourlyRate;

            tardinessDeduction =
                tardinessHours * hourlyRate;
        }

        // Monthly
        else if (payrollType === "Monthly") {

            // Display values
            semiMonthlyBasic = monthlyBasic / 2;

            semiMonthlyAllowance = monthlyAllow / 2;

            totalBasicPay =
                semiMonthlyBasic +
                semiMonthlyAllowance;

            const absentDays = records.filter(
                (record) => record.status === "Absent"
            ).length;

            // An absent day removes both the daily Basic rate and the
            // daily Allowance rate from the semi-monthly pay.
            absentDeduction =
                absentDays *
                (rate + dailyAllowanceFromRate);

            undertimeDeduction =
                undertimeHours * hourlyRate;

            tardinessDeduction =
                tardinessHours * hourlyRate;

            basicPay =
                totalBasicPay -
                absentDeduction -
                undertimeDeduction -
                tardinessDeduction;
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

        // ===== Allowance =====
        // Paid per day actually worked. Derived above from monthly_allow
        // (Monthly type) or entered directly as daily_allowance (Daily/
        // Weekly type).
        const dailyAllowance = dailyAllowanceFromRate;
        const allowancePay =
          payrollType === "Monthly"
              ? 0
              : dailyAllowance * daysWorked;

        // ===== Special / Regular Holiday pay =====
        // Counts days where the attendance record status marks a holiday
        // was worked. Multipliers follow the common DOLE convention
        // (Special Non-Working Holiday worked = 130%, Regular Holiday
        // worked = 200%) — adjust these if your company policy differs.
        // const shDaysWorked = records.filter(
        //   (r) => r.status === "Special Holiday",
        // ).length;
        // const rhDaysWorked = records.filter(
        //   (r) => r.status === "Regular Holiday",
        // ).length;

        const regularHolidayDates = holidays
            .filter(h => h.holiday_type === "regular")
            .map(h => h.holiday_date);

        const specialHolidayDates = holidays
            .filter(
                h =>
                    h.holiday_type ===
                    "special_non_working"
            )
            .map(h => h.holiday_date);

        const rhDaysWorked = records.filter(record =>

            regularHolidayDates.includes(record.attendance_date) &&

            record.check_in_time_raw &&
            record.check_out_time_raw

        ).length;

        const shDaysWorked =
        records.filter(record =>
            specialHolidayDates.includes(
                record.attendance_date
            )
        ).length;

        const shPay = rate * 1.3 * shDaysWorked;
        const rhPay = rate * rhDaysWorked;

        // ===== Leave pay =====
        // Only pays out for leave explicitly marked paid on the record
        // (e.g. record.is_paid_leave === true). Your sheet shows "no leave
        // credit" for most rows, so this defaults to 0 unless the record
        // says otherwise.
        const paidLeaveDays = records.filter(
          (r) => r.status === "On Leave" && r.is_paid_leave,
        ).length;
        const leavePay = rate * paidLeaveDays;

        // Monthly Basic used for statutory computations — for Daily-type
        // employees this is the derived equivalent (Daily Rate × 26),
        // computed above via `monthlyBasic` when Monthly type, or here for
        // Daily type, so PHIC/WHT formulas have a consistent base either way.
        const monthlyBasicForContributions = isMonthlyRateType
          ? monthlyBasic
          : rate * 26;
        const annualBasicForContributions = monthlyBasicForContributions * 12;

        // ===== Manual entries (Others) =====
        const adjKey = getAdjustmentKey(employee.id, activePeriod);
        const adj = adjustments[adjKey] || {};

        const others = Number(adj.others || 0);

        // ===== Gross pay =====
        // Computed before statutory deductions since SSS and PHIC are now
        // calculated as a percentage of gross pay for the cutoff.
        let grossPay = 0;

        if (payrollType === "Monthly") {

            grossPay =
                basicPay +
                otPay +
                shPay +
                rhPay +
                leavePay +
                others;

        } else {

            grossPay =
                basicPay +
                allowancePay +
                otPay +
                shPay +
                rhPay +
                leavePay +
                others -
                undertimeDeduction -
                tardinessDeduction;
        }

        // ===== Statutory deductions =====
        // SSS is looked up from the official contribution table (see
        // utils/payroll/sssContributionTable.js) — grossPay for the cutoff
        // is matched directly against the bracket ranges, and the boxed
        // "Employee Total" amount for that bracket is deducted as-is.
        // PHIC = 2.5% of Basic only for the cutoff; allowance is excluded.
        // Pag-IBIG EE (flat ₱100/cutoff) and WHT keep their existing
        // calculations.
        let sssDeduction = 0;
        let philhealthDeduction = 0;
        let pagibigDeduction = 0;
        let withholdingTax = 0;

        const computedPhilhealth = semiMonthlyBasic * 0.025;
        const computedWithholdingTax =
            annualBasicForContributions > 250000
                ? ((annualBasicForContributions - 250000) * 0.15) / 12
                : 0;
        const computedPagibig = getPagibigEmployeeShare(monthlyBasicForContributions);
        const computedSSS = getSSSEmployeeDeduction(grossPay);

        sssDeduction =
            adj.sssDeduction !== undefined
                ? Number(adj.sssDeduction)
                : payrollType === "Monthly"
                ? computedSSS
                : 0;

        philhealthDeduction =
            adj.philhealthDeduction !== undefined
                ? Number(adj.philhealthDeduction)
                : payrollType === "Monthly"
                ? computedPhilhealth
                : 0;

        pagibigDeduction =
            adj.pagibigDeduction !== undefined
                ? Number(adj.pagibigDeduction)
                : computedPagibig;

        withholdingTax =
            adj.withholdingTax !== undefined
                ? Number(adj.withholdingTax)
                : payrollType === "Monthly"
                ? computedWithholdingTax
                : 0;

        const sssLoan = Number(adj.sssLoan || 0);
        const cashAdvance = Number(adj.cashAdvance || 0);
        const personalDeduction = Number(adj.personalDeduction || 0);

        const govtDeductions =
          sssDeduction + philhealthDeduction + pagibigDeduction + withholdingTax;

        const otherDeductions = sssLoan + cashAdvance + personalDeduction;

        const totalDeductions = govtDeductions + otherDeductions;

        const netPay = grossPay - totalDeductions;

        if (!isTripBasedEmployee) {
          if (missingTimeouts > 0) {
            warnings.push(`${missingTimeouts} Missing Timeout`);
          }

          if (rate <= 0) {
            warnings.push("No Payroll Rate");
          }

          if (!payrollType) {
            warnings.push("No Payroll Type");
          }
        }

        //added
        if (isTripBasedEmployee) {
          console.log(employee.first_name, employee.last_name, tripBreakdown);
        }
        if (isTripBasedEmployee) {
          return {
            employee,

            isTripBasedEmployee: true,

            totalTrips,

            tripPay,

            grossPay: tripPay,

            tripBreakdown,

            records,

            warnings: [],

            daysWorked: Object.keys(tripsByDate).length,

            dailyRate: 0,

            payrollType: "Trip-Based",

            totalHours: 0,

            undertimeHours,
            tardinessHours,

            undertimeDeduction,
            tardinessDeduction,

            otHours: 0,

            approvedOTHours: 0,

            basicPay: tripPay,

            otPay: 0,

            allowancePay: 0,
            shPay: 0,
            rhPay: 0,
            leavePay: 0,
            others: 0,
            sssDeduction: 0,
            philhealthDeduction: 0,
            pagibigDeduction: 0,
            withholdingTax: 0,
            sssLoan: 0,
            cashAdvance: 0,
            personalDeduction: 0,
            totalDeductions: 0,
            netPay: tripPay,

            attendanceCount: records.length,

            missingTimeouts: 0,

            otStatus: "N/A",

            needsOTApproval: false,
          };
        }

        console.log("deductions",{
            grossPay,
            sssDeduction,
            philhealthDeduction,
            pagibigDeduction,
            withholdingTax,
            totalDeductions,
            netPay
        });

        return {
          employee,

          isTripBasedEmployee: false,

          attendanceCount,
          missingTimeouts,
          warnings,

          daysWorked,

          undertimeHours,
          tardinessHours,

          undertimeDeduction,
          tardinessDeduction,

          dailyRate: rate,
          isMonthlyRateType,
          monthlyBasic: isMonthlyRateType ? monthlyBasic : null,
          monthlyAllow: isMonthlyRateType ? monthlyAllow : null,

          // NEW
          semiMonthlyBasic,
          semiMonthlyAllowance,
          totalBasicPay,
          absentDeduction,

          payrollType,

          renderedHours,
          regularHours,
          otHours,

          approvedOTHours,

          otStatus: approval?.status || "Pending",

          basicPay,
          otPay,

          allowancePay,
          shDaysWorked,
          rhDaysWorked,
          shPay,
          rhPay,
          paidLeaveDays,
          leavePay,
          others,
          sssDeduction,
          philhealthDeduction,
          pagibigDeduction,
          withholdingTax,
          sssLoan,
          cashAdvance,
          personalDeduction,
          totalDeductions,

          grossPay,
          netPay,

          records,

          needsOTApproval: otHours > 0 && approvedOTHours === 0,
        };
      });
  }, [
    employees,
    attendance,
    holidays,
    department,
    activePeriod,
    otApprovals,
    searchEmployee,
    adjustments,
  ]);

  const summary = useMemo(() => {
    return {
      employees: payrollRows.length,

      totalRenderedHours: payrollRows.reduce(
        (sum, row) => sum + (row.renderedHours || 0),
        0,
      ),

      totalRegularHours: payrollRows.reduce(
        (sum, row) => sum + (row.regularHours || 0),
        0,
      ),

      totalOT: payrollRows.reduce((sum, row) => sum + (row.otHours || 0), 0),

      totalGross: payrollRows.reduce(
        (sum, row) => sum + (row.grossPay || 0),
        0,
      ),

      totalNet: payrollRows.reduce((sum, row) => sum + (row.netPay || 0), 0),
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

  const [savingPayslipFor, setSavingPayslipFor] = useState(null);

  // Persists the SSS / PhilHealth / Pag-IBIG / tardiness / undertime /
  // absent deductions (and gross/net pay, for reference) to the
  // `payroll_deductions` table, then opens the payslip modal. Backend
  // upserts on (employee_id, cutoff_period) so re-generating a payslip
  // for the same cutoff updates the existing row instead of duplicating it.
  const handleGeneratePayslip = async (row) => {
    if (!row.isTripBasedEmployee) {
      setSavingPayslipFor(row.employee.id);

      try {
        await savePayrollDeduction({
          cutoff_period: `${activePeriod.cutoffStart}_${activePeriod.cutoffEnd}`,
          employee_id: row.employee.id,
          department,
          gross_pay: row.grossPay,
          sss_deduction: row.sssDeduction,
          philhealth_deduction: row.philhealthDeduction,
          pagibig_deduction: row.pagibigDeduction,
          tardiness_deduction: row.tardinessDeduction,
          undertime_deduction: row.undertimeDeduction,
          absent_deduction: row.absentDeduction,
          net_pay: row.netPay,
        });
      } catch (err) {
        console.error("Failed to save payroll_deductions", err);

        // Surface it — silently swallowing this means deductions can look
        // "saved" from the UI's perspective when they never hit the DB.
        alert(
          `Could not save deductions for ${row.employee.first_name} ${row.employee.last_name}: ` +
            (err?.response?.data?.detail || err.message || "Unknown error") +
            "\n\nThe payslip will still open, but this record was NOT saved.",
        );
      } finally {
        setSavingPayslipFor(null);
      }
    }

    setSelectedPayslips([row]);
  };

  const [isExporting, setIsExporting] = useState(false);
  const [isGeneratingPayroll, setIsGeneratingPayroll] = useState(false);

  const buildDeductionRows = () =>
    payrollRows
      .filter((row) => !row.isTripBasedEmployee)
      .map((row) => ({
        cutoff_period: `${activePeriod.cutoffStart}_${activePeriod.cutoffEnd}`,
        employee_id: row.employee.id,
        department,
        gross_pay: row.grossPay,
        sss_deduction: row.sssDeduction,
        philhealth_deduction: row.philhealthDeduction,
        pagibig_deduction: row.pagibigDeduction,
        tardiness_deduction: row.tardinessDeduction,
        undertime_deduction: row.undertimeDeduction,
        absent_deduction: row.absentDeduction,
        net_pay: row.netPay,
      }));

  // Bulk-saves every row's deductions for the active cutoff to
  // `payroll_deductions`. Shared by "Generate Payroll" and "Export Excel"
  // so both buttons persist the exact same data the same way.
  const saveAllDeductions = async ({ onErrorSuffix = "" } = {}) => {
    const deductionRows = buildDeductionRows();

    if (deductionRows.length === 0) return true;

    try {
      await savePayrollDeductionsBulk(deductionRows);

      return true;
    } catch (err) {
      console.error("Failed to save payroll_deductions", err);

      alert(
        "Some deduction records could not be saved to the database: " +
          (err?.response?.data?.detail || err.message || "Unknown error") +
          onErrorSuffix,
      );

      return false;
    }
  };

  const handleGeneratePayroll = async () => {
    setIsGeneratingPayroll(true);

    const saved = await saveAllDeductions();

    setIsGeneratingPayroll(false);

    if (saved) {
      alert(
        `Payroll deductions saved for ${payrollRows.filter((r) => !r.isTripBasedEmployee).length} employee(s).`,
      );
    }
  };

  const handleExportExcel = async () => {
    setIsExporting(true);

    await saveAllDeductions({
      onErrorSuffix: "\n\nThe Excel file will still be generated.",
    });

    setIsExporting(false);

    exportPayrollExcel(payrollRows, activePeriod, department);
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

          <button
            className="bg-blue-600 text-white px-4 rounded-lg disabled:opacity-60"
            disabled={isGeneratingPayroll}
            onClick={handleGeneratePayroll}
          >
            {isGeneratingPayroll ? "Saving..." : "Generate Payroll"}
          </button>

          <button 
            className="bg-green-600 text-white px-4 rounded-lg hover:bg-green-700 transition disabled:opacity-60"
            disabled={isExporting}
            onClick={handleExportExcel}
          >
            {isExporting ? "Saving..." : "Export Excel"}
          </button>

          <button
            type="button"
            className="bg-violet-600 text-white px-4 rounded-lg hover:bg-violet-700 transition disabled:cursor-not-allowed disabled:bg-violet-300"
            onClick={() => setSelectedPayslips(payrollRows)}
            disabled={payrollRows.length === 0}
          >
            Generate Bulk Payslips
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
            {summary.totalRenderedHours.toFixed(2)}
            {summary.totalRegularHours.toFixed(2)}
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

        <div className="bg-white border rounded-xl p-4">
          <p className="text-sm text-gray-500">Net Payroll</p>

          <h2 className="text-2xl font-bold text-blue-700">
            ₱
            {summary.totalNet.toLocaleString(undefined, {
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

                  <th className="px-4 py-3">Trip Profile</th>

                  <th className="px-4 py-3 text-left">
                    {department?.toLowerCase().includes("driver") ||
                    department?.toLowerCase().includes("helper")
                      ? "Trips"
                      : "Days Worked"}
                  </th>

                  <th className="px-4 py-3 text-left">Daily Rate</th>

                  <th className="px-4 py-3 text-left">Payroll Type</th>

                  <th className="px-4 py-3 text-left">Hours</th>

                  <th className="px-4 py-3 text-left">Undertime</th>

                  <th className="px-4 py-3 text-left">UT Deduction</th>

                  <th className="px-4 py-3 text-left">OT</th>
                  <th className="px-4 py-3 text-left">Approved OT</th>

                  <th className="px-4 py-3 text-left">OT Status</th>

                  <th className="px-4 py-3 text-left">Basic</th>

                  <th className="px-4 py-3 text-left">Allowance</th>

                  <th className="px-4 py-3 text-left">Total Basic</th>

                  <th className="px-4 py-3 text-left">Absent</th>

                  <th className="px-4 py-3 text-left">Tardiness Deduction</th>

                  <th className="px-4 py-3 text-left">UT Deduction</th>

                  <th className="px-4 py-3 text-left">Adjusted Basic</th>

                  <th className="px-4 py-3 text-left">OT Pay</th>

                  <th className="px-4 py-3 text-left">SH Pay</th>

                  <th className="px-4 py-3 text-left">RH Pay</th>

                  <th className="px-4 py-3 text-left">Leave Pay</th>

                  <th className="px-4 py-3 text-left">Others</th>

                  <th className="px-4 py-3 text-left">Gross Pay</th>

                  <th className="px-4 py-3 text-left">SSS</th>

                  <th className="px-4 py-3 text-left">PhilHealth</th>

                  <th className="px-4 py-3 text-left">Pag-IBIG</th>

                  <th className="px-4 py-3 text-left">WHT</th>

                  <th className="px-4 py-3 text-left">SSS Loan</th>

                  <th className="px-4 py-3 text-left">Cash Advance</th>

                  <th className="px-4 py-3 text-left">Personal Ded.</th>

                  <th className="px-4 py-3 text-left">Net Pay</th>

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

                    <td className="px-4 py-3">
                      {row.isTripBasedEmployee
                        ? row.tripBreakdown?.[0]?.trip_rate_profile || "-"
                        : "-"}
                    </td>

                    <td className="px-4 py-3">
                      {row.isTripBasedEmployee
                        ? row.totalTrips
                        : row.daysWorked}
                    </td>

                    <td className="px-4 py-3">
                      ₱{row.dailyRate.toFixed(2)}
                      {row.isMonthlyRateType && (
                        <div className="text-xs text-gray-400">
                          (₱{row.monthlyBasic?.toLocaleString()}/mo ÷ 313)
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3">{row.payrollType}</td>
                    <td className="px-4 py-3">
                      {row.isTripBasedEmployee
                        ? `${row.totalTrips} Trips`
                        : row.renderedHours.toFixed(2)}
                    </td>

                    <td className="px-4 py-3 text-red-600 font-medium">
                      {row.isTripBasedEmployee
                        ? "--"
                        : row.undertimeHours.toFixed(2)}
                    </td>

                    <td className="px-4 py-3">
                      {row.undertimeDeduction.toFixed(2)}
                    </td>

                    <td className="px-4 py-3">
                      {row.isTripBasedEmployee ? "--" : row.otHours.toFixed(2)}
                    </td>

                    <td className="px-4 py-3">
                      {row.approvedOTHours.toFixed(2)}
                    </td>

                    <td className="px-4 py-3">{row.otStatus}</td>

                    {/* Basic */}
                    <td className="px-4 py-3">
                      {row.isTripBasedEmployee
                        ? "--"
                        : `₱${row.semiMonthlyBasic.toFixed(2)}`}
                    </td>

                    {/* Allowance */}
                    <td className="px-4 py-3">
                      {row.isTripBasedEmployee
                        ? "--"
                        : `₱${row.semiMonthlyAllowance.toFixed(2)}`}
                    </td>

                    {/* Total Basic */}
                    <td className="px-4 py-3 font-semibold text-blue-700">
                      {row.isTripBasedEmployee
                        ? "--"
                        : `₱${row.totalBasicPay.toFixed(2)}`}
                    </td>

                    {/* Absent */}
                    <td className="px-4 py-3 text-red-600">
                      {row.isTripBasedEmployee
                        ? "--"
                        : `₱${row.absentDeduction.toFixed(2)}`}
                    </td>

                    {/* Tardiness */}
                    <td className="px-4 py-3 text-red-600">
                        {row.isTripBasedEmployee
                            ? "--"
                            : `₱${row.tardinessDeduction.toFixed(2)}`}
                    </td>

                    {/* Undertime */}
                    <td className="px-4 py-3 text-red-600">
                        {row.isTripBasedEmployee
                            ? "--"
                            : `₱${row.undertimeDeduction.toFixed(2)}`}
                    </td>

                    {/* Adjusted Basic */}
                    <td className="px-4 py-3 font-semibold">
                      {row.isTripBasedEmployee
                        ? "--"
                        : `₱${row.basicPay.toFixed(2)}`}
                    </td>

                    {/* OT */}
                    <td className="px-4 py-3">
                      {row.isTripBasedEmployee
                        ? "--"
                        : `₱${row.otPay.toFixed(2)}`}
                    </td>

                    {/* SH */}
                    <td className="px-4 py-3">
                      {row.isTripBasedEmployee
                        ? "--"
                        : `₱${row.shPay.toFixed(2)}`}
                    </td>

                    {/* RH */}
                    <td className="px-4 py-3">
                      {row.isTripBasedEmployee
                        ? "--"
                        : `₱${row.rhPay.toFixed(2)}`}
                    </td>

                    {/* Leave */}
                    <td className="px-4 py-3">
                      {row.isTripBasedEmployee
                        ? "--"
                        : `₱${row.leavePay.toFixed(2)}`}
                    </td>

                    {/* Others */}
                    <td className="px-4 py-3">
                      {row.isTripBasedEmployee ? (
                        "--"
                      ) : (
                        <input
                          type="number"
                          className="w-24 border rounded px-2 py-1 text-sm"
                          value={row.others || ""}
                          placeholder="0"
                          onChange={(e) =>
                            updateAdjustment(
                              row.employee.id,
                              activePeriod,
                              "others",
                              e.target.value,
                            )
                          }
                        />
                      )}
                    </td>

                    {/* Gross */}
                    <td className="px-4 py-3 font-semibold text-green-700">
                      ₱{row.grossPay.toFixed(2)}
                    </td>

                    <td className="px-4 py-3">
                      {row.isTripBasedEmployee ? (
                        "--"
                      ) : (
                        <input
                          type="number"
                          className="w-24 border rounded px-2 py-1 text-sm"
                          value={row.sssDeduction || ""}
                          placeholder="0"
                          onChange={(e) =>
                            updateAdjustment(
                              row.employee.id,
                              activePeriod,
                              "sssDeduction",
                              e.target.value,
                            )
                          }
                        />
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {row.isTripBasedEmployee ? (
                        "--"
                      ) : (
                        <input
                          type="number"
                          className="w-20 border rounded px-2 py-1 text-sm"
                          value={row.philhealthDeduction || ""}
                          placeholder="0"
                          onChange={(e) =>
                            updateAdjustment(
                              row.employee.id,
                              activePeriod,
                              "philhealthDeduction",
                              e.target.value,
                            )
                          }
                        />
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {row.isTripBasedEmployee ? (
                        "--"
                      ) : (
                        <input
                          type="number"
                          className="w-20 border rounded px-2 py-1 text-sm"
                          value={row.pagibigDeduction || ""}
                          placeholder="0"
                          onChange={(e) =>
                            updateAdjustment(
                              row.employee.id,
                              activePeriod,
                              "pagibigDeduction",
                              e.target.value,
                            )
                          }
                        />
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {row.isTripBasedEmployee ? (
                        "--"
                      ) : (
                        <input
                          type="number"
                          className="w-20 border rounded px-2 py-1 text-sm"
                          value={row.withholdingTax || ""}
                          placeholder="0"
                          onChange={(e) =>
                            updateAdjustment(
                              row.employee.id,
                              activePeriod,
                              "withholdingTax",
                              e.target.value,
                            )
                          }
                        />
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {row.isTripBasedEmployee ? (
                        "--"
                      ) : (
                        <input
                          type="number"
                          className="w-20 border rounded px-2 py-1 text-sm"
                          value={row.sssLoan || ""}
                          placeholder="0"
                          onChange={(e) =>
                            updateAdjustment(
                              row.employee.id,
                              activePeriod,
                              "sssLoan",
                              e.target.value,
                            )
                          }
                        />
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {row.isTripBasedEmployee ? (
                        "--"
                      ) : (
                        <input
                          type="number"
                          className="w-24 border rounded px-2 py-1 text-sm"
                          value={row.cashAdvance || ""}
                          placeholder="0"
                          onChange={(e) =>
                            updateAdjustment(
                              row.employee.id,
                              activePeriod,
                              "cashAdvance",
                              e.target.value,
                            )
                          }
                        />
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {row.isTripBasedEmployee ? (
                        "--"
                      ) : (
                        <input
                          type="number"
                          className="w-24 border rounded px-2 py-1 text-sm"
                          value={row.personalDeduction || ""}
                          placeholder="0"
                          onChange={(e) =>
                            updateAdjustment(
                              row.employee.id,
                              activePeriod,
                              "personalDeduction",
                              e.target.value,
                            )
                          }
                        />
                      )}
                    </td>

                    <td className="px-4 py-3 font-semibold text-blue-700">
                      ₱{row.netPay.toFixed(2)}
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

                    <td>
                      {row.isTripBasedEmployee ? "--" : row.attendanceCount}
                    </td>

                    <td>
                      {row.isTripBasedEmployee ? "--" : row.missingTimeouts}
                    </td>

                    <td className="px-4 py-3">
                      {row.isTripBasedEmployee ? (
                        <span className="text-gray-400 text-xs">N/A</span>
                      ) : row.warnings.length > 0 ? (
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

                        <button
                          className="px-3 py-1 rounded-lg bg-violet-600 text-white text-xs hover:bg-violet-700 disabled:opacity-60"
                          disabled={savingPayslipFor === row.employee.id}
                          onClick={() => handleGeneratePayslip(row)}
                        >
                          {savingPayslipFor === row.employee.id
                            ? "Saving..."
                            : "Generate Payslip"}
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
      <PayslipModal
        isOpen={selectedPayslips.length > 0}
        payrolls={selectedPayslips}
        activePeriod={activePeriod}
        onClose={() => setSelectedPayslips([])}
      />
    </div>
  );
};

export default PayrollList;