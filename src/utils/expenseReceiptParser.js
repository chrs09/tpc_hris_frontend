/**
 * Parse OCR text extracted from a receipt.
 *
 * This parser is intentionally flexible because receipts
 * can have different layouts and labels.
 *
 * It does NOT save anything to the database.
 * It only converts raw OCR text into structured data.
 */

const cleanText = (text) => {
  if (!text) {
    return "";
  }

  return text
    .replace(/\r/g, "")
    .replace(/[\u00a0]/g, " ")
    .replace(/[\t]+/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .trim();
};

const getLines = (text) => {
  return cleanText(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) =>
      line
        .replace(/\s*[:;]\s*/g, ": ")
        .replace(/[–—]/g, "-")
        .replace(/\s+/g, " ")
        .trim(),
    );
};

const normalizeCurrencyNumber = (value = "") => {
  if (!value) {
    return "";
  }

  return value
    .replace(/[^\d.,-]/g, "")
    .replace(/,(?=\d{3}(?:\D|$))/g, "")
    .replace(/,/g, "")
    .trim();
};

const normalizeDate = (value) => {
  if (!value) {
    return "";
  }

  let text = value.trim();
  text = text.replace(/^\s*[:#.-]+\s*/, "").trim();

  const monthDayYear = text.match(
    /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/,
  );

  if (monthDayYear) {
    return `${monthDayYear[3]}-${monthDayYear[1].padStart(2, "0")}-${monthDayYear[2].padStart(2, "0")}`;
  }

  const yearMonthDay = text.match(
    /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/,
  );

  if (yearMonthDay) {
    return `${yearMonthDay[1]}-${yearMonthDay[2].padStart(2, "0")}-${yearMonthDay[3].padStart(2, "0")}`;
  }

  const parsed = new Date(text);

  if (!Number.isNaN(parsed.getTime())) {
    return [
      parsed.getFullYear(),
      String(parsed.getMonth() + 1).padStart(2, "0"),
      String(parsed.getDate()).padStart(2, "0"),
    ].join("-");
  }

  return "";
};

const extractAfterLabel = (lines, patterns) => {
  for (const line of lines) {
    for (const pattern of patterns) {
      const match = line.match(pattern);

      if (match?.[1]) {
        const value = match[1].trim();

        if (/^(no|number|num)$/i.test(value)) {
          continue;
        }

        return value;
      }
    }
  }

  return "";
};

const extractInvoiceNumber = (lines) => {
  const patterns = [
    /(?:invoice|inv|sales\s*invoice|sales\s*inv)\s*(?:no|number|num)?\s*[:#.-]?\s*([A-Z0-9/-]+(?:\s*[A-Z0-9/-]+)*)/i,
    /(?:official\s*receipt|or|receipt)\s*(?:no|number|num)?\s*[:#.-]?\s*([A-Z0-9/-]+(?:\s*[A-Z0-9/-]+)*)/i,
    /(?:si)\s*(?:no|number|#)?\s*[:#.-]?\s*([A-Z0-9/-]+(?:\s*[A-Z0-9/-]+)*)/i,
  ];

  return extractAfterLabel(lines, patterns)
    .replace(/[\s]+/g, " ")
    .trim();
};

const extractPONumber = (lines) => {
  const patterns = [
    /(?:po|p\.o\.|purchase\s*order)\s*(?:no|number|num|#)?\s*[:#.-]?\s*([A-Z0-9/-]+)/i,
    /(?:purchase\s*order)\s*(?:no|number|num|#)?\s*[:#.-]?\s*([A-Z0-9/-]+)/i,
  ];

  return extractAfterLabel(lines, patterns).trim();
};

const extractInvoiceDate = (lines) => {
  const labeledDate = extractAfterLabel(lines, [
    /(?:invoice\s*)?date\s*[:#.-]?\s*(.+)$/i,
    /(?:transaction|purchase|sales)\s*date\s*[:#.-]?\s*(.+)$/i,
    /(?:date\s*issued|date\s*paid)\s*[:#.-]?\s*(.+)$/i,
  ]);

  if (labeledDate) {
    const normalized = normalizeDate(labeledDate);
    if (normalized) return normalized;
  }

  for (const line of lines) {
    const match = line.match(/\b(\d{1,2}[/-]\d{1,2}[/-]\d{4}|\d{4}[-/]\d{1,2}[-/]\d{1,2})\b/);

    if (match) {
      const normalized = normalizeDate(match[1]);
      if (normalized) return normalized;
    }
  }

  for (const line of lines) {
    const match = line.match(
      /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?[,]?\s+\d{4}\b/i,
    );

    if (match) {
      const normalized = normalizeDate(match[0]);
      if (normalized) return normalized;
    }
  }

  return "";
};

const extractSupplierCandidates = (lines) => {
  const explicitLabels = [
    /supplier\s*[:#.-]?\s*(.+)$/i,
    /vendor\s*[:#.-]?\s*(.+)$/i,
    /merchant\s*[:#.-]?\s*(.+)$/i,
    /from\s*[:#.-]?\s*(.+)$/i,
    /company\s*[:#.-]?\s*(.+)$/i,
  ];

  const labeledSupplier = extractAfterLabel(lines, explicitLabels);
  const candidates = [];

  if (labeledSupplier) {
    candidates.push(labeledSupplier);
  }

  const ignoredPatterns = [
    /^(receipt|invoice|official receipt|sales invoice|or|date|tin|tel|phone|mobile|address|permit|vat|pos|cashier|transaction|qty|description|unit price|amount|total|grand total)$/i,
    /^thank you$/i,
    /^customer service$/i,
  ];

  for (const line of lines.slice(0, 12)) {
    if (line.length < 3) continue;
    if (ignoredPatterns.some((pattern) => pattern.test(line))) continue;

    const letters = (line.match(/[A-Za-z]/g) || []).length;
    const numbers = (line.match(/[\d]/g) || []).length;

    if (letters < 3 || (numbers > 0 && letters < 5)) {
      continue;
    }

    const candidate = line.replace(/^[#:.\-\s]+|[\s]+$/g, "").trim();

    if (!candidates.some((value) => value.toLowerCase() === candidate.toLowerCase())) {
      candidates.push(candidate);
    }
  }

  return candidates.slice(0, 3);
};

const extractSupplier = (lines) => {
  return extractSupplierCandidates(lines)[0] || "";
};

const extractTotal = (lines) => {
  const patterns = [
    /(?:grand\s*)?total\s*[:#.-]?\s*(?:₱|php|p)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /amount\s*(?:due|payable)\s*[:#.-]?\s*(?:₱|php|p)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /net\s*total\s*[:#.-]?\s*(?:₱|php|p)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:total)\s*[:#.-]?\s*(?:₱|php|p)?\s*([\d,]+(?:\.\d{1,2})?)/i,
  ];

  const value = extractAfterLabel(lines, patterns);
  if (!value) {
    return "";
  }

  return normalizeCurrencyNumber(value);
};

const parseItemLine = (line) => {
  if (!line) {
    return null;
  }

  const smallText = line.trim();

  if (
    /^(total|grand total|amount due|subtotal|vat|tax|cash|change|payment|balance|tender|qty|description|unit price|amount|thank you)/i.test(
      smallText,
    )
  ) {
    return null;
  }

  const variants = [
    /^([0-9]+(?:\.\d+)?)\s+(.+?)\s+([\d,]+(?:\.\d{1,2})?)\s+([\d,]+(?:\.\d{1,2})?)$/,
    /^(.+?)\s+([0-9]+(?:\.\d+)?)\s+([\d,]+(?:\.\d{1,2})?)\s+([\d,]+(?:\.\d{1,2})?)$/,
    /^(.+?)\s+([\d,]+(?:\.\d{1,2})?)\s+([\d,]+(?:\.\d{1,2})?)$/,
  ];

  for (const pattern of variants) {
    const match = smallText.match(pattern);
    if (!match) continue;

    let qty = 1;
    let particulars = "";
    let unitPrice = "";
    let amount = "";

    if (pattern.source.startsWith("^([0-9]+")) {
      qty = Number(match[1]);
      particulars = match[2].trim();
      unitPrice = normalizeCurrencyNumber(match[3]);
      amount = normalizeCurrencyNumber(match[4]);
    } else if (pattern.source.startsWith("^(.+?)\\s+([0-9]+")) {
      particulars = match[1].trim();
      qty = Number(match[2]);
      unitPrice = normalizeCurrencyNumber(match[3]);
      amount = normalizeCurrencyNumber(match[4]);
    } else {
      particulars = match[1].trim();
      unitPrice = normalizeCurrencyNumber(match[2]);
      amount = normalizeCurrencyNumber(match[3]);
    }

    if (!particulars || !Number.isFinite(qty)) {
      continue;
    }

    if (!unitPrice && !amount) {
      continue;
    }

    return {
      id: null,
      particulars,
      qty,
      unit: "Piece",
      unitPrice: Number(unitPrice || amount || 0),
      amount: Number(amount || unitPrice || 0),
    };
  }

  return null;
};

const extractItems = (lines) => {
  const items = [];

  for (const line of lines) {
    const item = parseItemLine(line);
    if (item) {
      items.push(item);
    }
  }

  return items;
};

export const parseReceiptText = (rawText) => {
  if (!rawText) {
    return {
      supplier: "",
      invoiceDate: "",
      invoiceNumber: "",
      poNumber: "",
      total: "",
      items: [],
      supplierCandidates: [],
    };
  }

  const lines = getLines(rawText);

  return {
    supplier: extractSupplier(lines),
    supplierCandidates: extractSupplierCandidates(lines),
    invoiceDate: extractInvoiceDate(lines),
    invoiceNumber: extractInvoiceNumber(lines),
    poNumber: extractPONumber(lines),
    total: extractTotal(lines),
    items: extractItems(lines),
  };
};

export default parseReceiptText;
