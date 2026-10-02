import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

// Delivery Summary -> .xlsx, styled like the page (and the original
// Coca-Cola sheet): DRIVERS / LOCATION / DAILY blocks side by side with an
// orange Count column, green headers, light-green rows and a dark-green
// Total row; then one records sheet per truck type.

const ORANGE = "FFFBBF24";
const GREEN = "FF22C55E";
const LIGHT_GREEN = "FFDCFCE7";
const DARK_GREEN = "FF16A34A";
const WHITE = "FFFFFFFF";
const STATUS_COLORS = { Yes: "FF16A34A", Absent: "FFDC2626", LEAVE: "FFD97706" };

const fill = (argb) => ({ type: "pattern", pattern: "solid", fgColor: { argb } });
const BORDER = {
  top: { style: "thin", color: { argb: "FF9CA3AF" } },
  left: { style: "thin", color: { argb: "FF9CA3AF" } },
  bottom: { style: "thin", color: { argb: "FF9CA3AF" } },
  right: { style: "thin", color: { argb: "FF9CA3AF" } },
};
const CENTER = { horizontal: "center", vertical: "middle", wrapText: true };

const style = (cell, { bg, bold = false, color, size } = {}) => {
  if (bg) cell.fill = fill(bg);
  cell.font = { bold, ...(color ? { color: { argb: color } } : {}), ...(size ? { size } : {}) };
  cell.border = BORDER;
  cell.alignment = CENTER;
};

// One block (header row, data rows, Total row) starting at (row, col).
// Returns the next free row below it.
const writeBlock = (ws, row, col, { head, rows, total, countColumn = false }) => {
  head.forEach((title, i) => {
    const cell = ws.getCell(row, col + i);
    cell.value = title;
    style(cell, { bg: countColumn && i === 0 ? ORANGE : GREEN, bold: true });
  });
  ws.getRow(row).height = 30;
  rows.forEach((values, r) => {
    values.forEach((value, i) => {
      const cell = ws.getCell(row + 1 + r, col + i);
      cell.value = value;
      style(cell, {
        bg: countColumn && i === 0 ? ORANGE : LIGHT_GREEN,
        bold: i === values.length - 1 || (countColumn && i === 0),
      });
    });
  });
  const totalRow = row + 1 + rows.length;
  ws.mergeCells(totalRow, col, totalRow, col + head.length - 2);
  const label = ws.getCell(totalRow, col);
  label.value = "Total";
  style(label, { bg: DARK_GREEN, bold: true, color: WHITE });
  label.alignment = { horizontal: "right", vertical: "middle" };
  const value = ws.getCell(totalRow, col + head.length - 1);
  value.value = total;
  style(value, { bg: DARK_GREEN, bold: true, color: WHITE });
  return totalRow + 2;
};

const title = (ws, row, fromCol, toCol, text) => {
  ws.mergeCells(row, fromCol, row, toCol);
  const cell = ws.getCell(row, fromCol);
  cell.value = text;
  cell.font = { bold: true, size: 14 };
  cell.alignment = CENTER;
};

export async function exportDeliverySummaryExcel({
  data,
  monthLabel,
  driverBlocks,
  recordColumns,
  longDate,
}) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Tytan Prime HRIS";
  const monthTitle = `Month of ${monthLabel}`;

  // ---------------- Total Trips Summary
  const ws = wb.addWorksheet("Total Trips Summary", {
    views: [{ showGridLines: false }],
  });
  // A-D drivers, F-H location, J-L daily (E, I = gaps)
  ws.columns = [
    { width: 8 }, { width: 30 }, { width: 16 }, { width: 12 }, { width: 3 },
    { width: 24 }, { width: 16 }, { width: 12 }, { width: 3 },
    { width: 22 }, { width: 28 }, { width: 12 },
  ];
  ws.getRow(1).height = 26;
  title(ws, 1, 1, 4, "DRIVERS");
  title(ws, 1, 6, 8, "LOCATION");
  title(ws, 1, 10, 12, "DAILY");

  let row = 2;
  driverBlocks.forEach((block) => {
    row = writeBlock(ws, row, 1, {
      head: ["Count", `${monthTitle}\nDriver`, "Type of Truck", "Total Trips"],
      rows: block.rows.map((r, i) => [i + 1, r.driver, r.truck_type, r.trips]),
      total: block.rows.reduce((sum, r) => sum + r.trips, 0),
      countColumn: true,
    });
  });

  writeBlock(ws, 2, 6, {
    head: [`${monthTitle}\nLocation`, "Type of Truck", "Total Trips"],
    rows: data.by_location.map((r) => [r.location, r.truck_type, r.trips]),
    total: data.total_trips,
  });

  writeBlock(ws, 2, 10, {
    head: [`${monthTitle}\nBy Date`, "Location", "Total Trips"],
    rows: data.by_day.map((r) => [longDate(r.date), r.location, r.trips]),
    total: data.total_trips,
  });

  // ---------------- one records sheet per truck type
  data.truck_types.forEach((truck) => {
    // Excel caps sheet names at 31 characters: fall back to the short
    // month ("Sep 2026"), then trim.
    const shortMonth = monthLabel.replace(/^(\w{3})\w*/, "$1");
    const full = `${truck} Records ${monthLabel}`;
    const name = (full.length <= 31 ? full : `${truck} Records ${shortMonth}`).slice(0, 31);
    const sheet = wb.addWorksheet(name, {
      views: [{ state: "frozen", ySplit: 1 }],
    });
    sheet.columns = recordColumns.map(([header]) => ({
      header,
      width: header === "Driver" || header === "Helper" ? 28 : header.length > 14 ? 20 : 16,
    }));
    sheet.getRow(1).eachCell((cell) => style(cell, { bg: GREEN, bold: true }));
    sheet.getRow(1).height = 24;

    (data.records[truck] || []).forEach((record) => {
      const added = sheet.addRow(recordColumns.map(([, get]) => get(record)));
      added.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        style(cell, { bg: LIGHT_GREEN });
        if (recordColumns[colNumber - 1]?.[0] === "Trip" && STATUS_COLORS[record.status]) {
          cell.font = { bold: true, color: { argb: STATUS_COLORS[record.status] } };
        }
      });
    });
    if (!(data.records[truck] || []).length) {
      sheet.addRow([`No ${truck} trips in ${monthLabel}.`]);
    }
  });

  const buffer = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `Tytan Prime Coca-Cola Delivery Summary ${monthLabel}.xlsx`,
  );
}
