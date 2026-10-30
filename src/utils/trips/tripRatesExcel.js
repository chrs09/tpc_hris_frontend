import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

// Trip Categories & Rates -> .xlsx (one per tab): Categories and Driver
// Rates (truck · lane · date). Exports what the tab shows (search /
// archived filters applied).

const HEADER_BG = "FF111827";
const HEADER_FG = "FFFFFFFF";
const PESO = '"₱"#,##0.00';

const todayPH = () =>
  new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);

const toDate = (value) => (value ? new Date(`${String(value).slice(0, 10)}T00:00:00`) : null);

async function writeSheet(fileName, sheetName, columns, rows) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName, { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width || 16 }));

  const header = ws.getRow(1);
  header.height = 22;
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: HEADER_FG } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_BG } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  });

  rows.forEach((row) => ws.addRow(row));

  columns.forEach((c, i) => {
    const col = ws.getColumn(i + 1);
    if (c.type === "money") col.numFmt = PESO;
    if (c.type === "date") col.numFmt = "mmm d, yyyy";
    col.alignment = { vertical: "top", wrapText: c.wrap || false };
  });
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };

  const buffer = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${fileName} ${todayPH()}.xlsx`,
  );
}

const RATE_COLUMNS = [
  { key: "driver_first_trip_rate", header: "Driver 1st" },
  { key: "driver_allowance", header: "Driver Allowance" },
  { key: "driver_other", header: "Driver Other" },
  { key: "driver_next_trip_rate", header: "Driver Next" },
  { key: "helper_first_trip_rate", header: "Helper 1st" },
  { key: "helper_next_trip_rate", header: "Helper Next" },
];

const num = (value) => (value === null || value === undefined || value === "" ? null : Number(value));

// Categories tab: each category's rates in effect today, plus the next
// scheduled change.
export async function exportTripCategories(categories) {
  const today = todayPH();
  const rows = categories.map((rate) => {
    const current = rate.current_rates || rate;
    const upcoming = (rate.rate_changes || [])
      .filter((change) => change.effective_from > today)
      .reverse()[0];
    return {
      category: rate.profile_name,
      code: rate.code || "",
      helpers: rate.helper_count ?? "",
      stores: rate.store_count ?? 0,
      ...Object.fromEntries(RATE_COLUMNS.map(({ key }) => [key, num(current[key])])),
      // current_rates: driver_first_trip_rate is the total, the basic is apart.
      driver_first_trip_rate: num(current.driver_basic_rate ?? current.driver_first_trip_rate),
      first_trip_total: rate.current_rates
        ? num(current.driver_first_trip_rate)
        : Number(current.driver_first_trip_rate || 0) +
          Number(current.driver_allowance || 0) +
          Number(current.driver_other || 0),
      since: toDate(rate.current_rates?.since),
      upcoming: upcoming
        ? `From ${upcoming.effective_from}: ${RATE_COLUMNS.filter(({ key }) => upcoming[key] !== null)
            .map(({ key, header }) => `${header} ₱${Number(upcoming[key]).toLocaleString()}`)
            .join(", ")}`
        : "",
      status: rate.is_active ? "Active" : "Archived",
    };
  });

  await writeSheet(
    "Trip Categories",
    "Categories",
    [
      { key: "category", header: "Category", width: 28 },
      { key: "code", header: "Code", width: 12 },
      { key: "helpers", header: "Helpers", width: 10 },
      { key: "stores", header: "Stores using it", width: 14 },
      ...RATE_COLUMNS.map((c) => ({ ...c, type: "money", width: 14 })),
      { key: "first_trip_total", header: "1st Trip Total", type: "money", width: 14 },
      { key: "since", header: "Rates since", type: "date", width: 14 },
      { key: "upcoming", header: "Upcoming change", width: 44, wrap: true },
      { key: "status", header: "Status", width: 11 },
    ],
    rows,
  );
}

// Driver Rates tab: every rule. A blank rate keeps the category's rate,
// written as "category" like on the page.
export async function exportDriverRates(rules) {
  const today = todayPH();
  const rows = rules.map((rule) => ({
    category: rule.trip_rate_profile || "Any",
    truck: rule.truck_type || "Any",
    from: rule.origin_store || "Any",
    to: rule.destination_store || (rule.destination_area ? `Area: ${rule.destination_area}` : "Any"),
    ...Object.fromEntries(
      RATE_COLUMNS.map(({ key }) => [key, num(rule[key]) ?? "category"]),
    ),
    effective: toDate(rule.effective_from),
    status: rule.effective_from > today ? "Upcoming" : "In effect",
    notes: rule.notes || "",
  }));

  await writeSheet(
    "Driver Rates",
    "Driver Rates",
    [
      { key: "category", header: "Category", width: 22 },
      { key: "truck", header: "Truck", width: 14 },
      { key: "from", header: "From", width: 30 },
      { key: "to", header: "To", width: 30 },
      ...RATE_COLUMNS.map((c) => ({ ...c, type: "money", width: 13 })),
      { key: "effective", header: "Effective", type: "date", width: 14 },
      { key: "status", header: "Status", width: 12 },
      { key: "notes", header: "Notes", width: 36, wrap: true },
    ],
    rows,
  );
}
