import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

// Trip Document -> All Trips -> .xlsx: every trip matching the page's
// filters (all pages, not just the one on screen).

const HEAD_BG = "FF1F3A5F";
const BORDER_COLOR = { argb: "FFD1D5DB" };
const BORDER = {
  top: { style: "thin", color: BORDER_COLOR },
  left: { style: "thin", color: BORDER_COLOR },
  bottom: { style: "thin", color: BORDER_COLOR },
  right: { style: "thin", color: BORDER_COLOR },
};

const COLUMNS = [
  ["Trip date", 22, (t) => t.trip_date || ""],
  ["Shipment", 18, (t) => t.ticket_no || ""],
  ["Trip code", 16, (t) => t.trip_code || ""],
  ["Trip", 8, (t, tripNo) => tripNo || ""],
  ["Driver", 24, (t) => t.driver_name || ""],
  ["Plate", 12, (t) => t.plate_number || ""],
  ["Helpers", 30, (t) => (t.helpers || []).map((h) => h.name).join(", ")],
  ["Outlets", 40, (t) => (t.outlets || []).join(", ")],
  ["Status", 14, (t) => `${t.status_no <= 8 ? `${t.status_no}. ` : ""}${t.status_label}`],
  ["Responsible", 22, (t) => t.responsible || ""],
  ["Since", 22, (t) => t.since || ""],
  ["Hours waiting", 10, (t) => (t.hours_waiting != null ? t.hours_waiting : "")],
  ["Note", 36, (t) => t.note || ""],
];

const ordinal = (n) => {
  if (!n) return "";
  if (n % 100 >= 11 && n % 100 <= 13) return `${n}th`;
  return `${n}${{ 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th"}`;
};

// trips: the filtered list; tripNoOf(t): the trip-of-the-day number shown
// on the page; period: "Oct 25 – Nov 24, 2026" style label.
export async function exportTripDocumentsExcel({ trips, tripNoOf, period, filtersNote }) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Trip Documents", { views: [{ state: "frozen", ySplit: 3 }] });

  ws.mergeCells(1, 1, 1, COLUMNS.length);
  ws.getCell(1, 1).value = `Trip Documents · ${period}`;
  ws.getCell(1, 1).font = { bold: true, size: 14 };
  ws.mergeCells(2, 1, 2, COLUMNS.length);
  ws.getCell(2, 1).value = `${trips.length} trip(s)${filtersNote ? ` · ${filtersNote}` : ""}`;
  ws.getCell(2, 1).font = { italic: true, color: { argb: "FF6B7280" } };

  const head = ws.getRow(3);
  COLUMNS.forEach(([title, width], i) => {
    ws.getColumn(i + 1).width = width;
    const cell = head.getCell(i + 1);
    cell.value = title;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEAD_BG } };
    cell.border = BORDER;
    cell.alignment = { vertical: "middle", wrapText: true };
  });
  head.height = 22;

  trips.forEach((t) => {
    const tripNo = ordinal(tripNoOf(t));
    const row = ws.addRow(COLUMNS.map(([, , get]) => get(t, tripNo)));
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = BORDER;
      cell.alignment = { vertical: "top", wrapText: true };
    });
  });
  ws.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: COLUMNS.length } };

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), `Trip Documents ${period.replace(/[\\/:*?"<>|]/g, "-")}.xlsx`);
}
