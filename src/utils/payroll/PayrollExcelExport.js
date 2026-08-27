import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

export const exportPayrollExcel = async (
  payrollRows,
  activePeriod,
  department,
) => {
  const workbook = new ExcelJS.Workbook();

  workbook.creator = "Tytan HRIS";
  workbook.company = "Tytan Prime Corporation";

  ////////////////////////////////////////////
  // PAYROLL SHEET
  ////////////////////////////////////////////

  const payroll = workbook.addWorksheet("Payroll", {
    views: [
      {
        state: "frozen",
        ySplit: 7,
      },
    ],
  });

  payroll.mergeCells("A1:V1");

  const title = payroll.getCell("A1");

  title.value = "TYTAN PRIME CORPORATION";

  title.font = {
    bold: true,
    size: 18,
    color: { argb: "FFFFFF" },
  };

  title.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: {
      argb: "1F4E78",
    },
  };

  title.alignment = {
    horizontal: "center",
  };

  payroll.addRow([]);

  payroll.addRow(["Department", department]);

  payroll.addRow([
    "Payroll Period",
    `${activePeriod.cutoffStart} - ${activePeriod.cutoffEnd}`,
  ]);

  payroll.addRow(["Payout Date", activePeriod.payoutDate]);

  payroll.addRow([]);

  const header = payroll.addRow([
    "Employee",
    "Daily Rate",
    "Basic",
    "Allowance",
    "Total Basic",
    "Absent",
    "UT",
    "Adjusted Basic",
    "OT",
    "RH",
    "SH",
    "Leave",
    "Others",
    "Gross",
    "SSS",
    "PhilHealth",
    "PagIBIG",
    "WHT",
    "SSS Loan",
    "Cash Advance",
    "Personal",
    "Net Pay",
  ]);

  header.eachCell((cell) => {
    cell.font = {
      bold: true,
      color: {
        argb: "FFFFFF",
      },
    };

    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: {
        argb: "4472C4",
      },
    };

    cell.alignment = {
      horizontal: "center",
    };

    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });

  payrollRows.forEach((row) => {
    payroll.addRow([
      `${row.employee.last_name}, ${row.employee.first_name}`,

      row.dailyRate,

      row.semiMonthlyBasic,

      row.semiMonthlyAllowance,

      row.totalBasicPay,

      row.absentDeduction,

      row.undertimeDeduction,

      row.basicPay,

      row.otPay,

      row.rhPay,

      row.shPay,

      row.leavePay,

      row.others,

      row.grossPay,

      row.sssDeduction,

      row.philhealthDeduction,

      row.pagibigDeduction,

      row.withholdingTax,

      row.sssLoan,

      row.cashAdvance,

      row.personalDeduction,

      row.netPay,
    ]);
  });

  payroll.columns.forEach((column) => {
    column.width = 15;
  });

  payroll.getColumn(1).width = 30;

  ////////////////////////////////////////////
  // Currency
  ////////////////////////////////////////////

  for (let i = 2; i <= 22; i++) {
    payroll.getColumn(i).numFmt = "₱#,##0.00";
  }

  ////////////////////////////////////////////
  // Attendance Sheet
  ////////////////////////////////////////////

  const attendance = workbook.addWorksheet("Attendance");

  payrollRows.forEach((row) => {
    ////////////////////////////////////

    attendance.addRow([]);

    const employeeRow = attendance.addRow([
      `${row.employee.last_name}, ${row.employee.first_name}`,
    ]);

    employeeRow.font = {
      bold: true,
      size: 14,
    };

    attendance.addRow([]);

    const attendanceHeader = attendance.addRow([
      "Date",

      "Status",

      "Check In",

      "Check Out",

      "Rendered",

      "Regular",

      "OT",

      "UT",
    ]);

    attendanceHeader.eachCell((cell) => {
      cell.font = {
        bold: true,
        color: {
          argb: "FFFFFF",
        },
      };

      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
          argb: "5B9BD5",
        },
      };
    });

    row.records.forEach((record) => {
      attendance.addRow([
        record.attendance_date,

        record.status,

        record.check_in_time_raw,

        record.check_out_time_raw,

        row.renderedHours,

        row.regularHours,

        row.otHours,

        row.undertimeHours,
      ]);
    });

    attendance.addRow([]);
    attendance.addRow([]);
  });

  attendance.columns.forEach((col) => {
    col.width = 18;
  });

  ////////////////////////////////////////////
  // Borders
  ////////////////////////////////////////////

  workbook.eachSheet((sheet) => {
    sheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin" },

          left: { style: "thin" },

          bottom: { style: "thin" },

          right: { style: "thin" },
        };
      });
    });
  });

  ////////////////////////////////////////////
  // Download
  ////////////////////////////////////////////

  const buffer = await workbook.xlsx.writeBuffer();

  const formatForFilename = (dateString) => {
    return dateString.replace(/\//g, "-");
  };

  const period = `${formatForFilename(activePeriod.cutoffStart)}_to_${formatForFilename(activePeriod.cutoffEnd)}`;

  const filename = `Payroll_${department}_${period}.xlsx`;

  saveAs(new Blob([buffer]), filename);
};
