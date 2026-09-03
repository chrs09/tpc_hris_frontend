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
    .replace(/[ \t]+/g, " ")
    .trim();
};

const getLines = (text) => {
  return cleanText(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
};

/**
 * Convert common receipt date formats to YYYY-MM-DD.
 */
const normalizeDate = (value) => {
  if (!value) {
    return "";
  }

  const text = value.trim();

  // MM/DD/YYYY or MM-DD-YYYY
  let match = text.match(
    /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/,
  );

  if (match) {
    const month = match[1].padStart(2, "0");
    const day = match[2].padStart(2, "0");
    const year = match[3];

    return `${year}-${month}-${day}`;
  }

  // YYYY-MM-DD
  match = text.match(
    /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/,
  );

  if (match) {
    const year = match[1];
    const month = match[2].padStart(2, "0");
    const day = match[3].padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  // Example:
  // January 20, 2023
  // Jan 20, 2023
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

/**
 * Extract a value after a label.
 *
 * Examples:
 *
 * Invoice No: 12345
 * Invoice #: 12345
 * Receipt No. 12345
 */
const extractAfterLabel = (lines, patterns) => {
  for (const line of lines) {
    for (const pattern of patterns) {
      const match = line.match(pattern);

      if (match?.[1]) {
        return match[1].trim();
      }
    }
  }

  return "";
};

/**
 * Extract invoice / receipt number.
 */
const extractInvoiceNumber = (lines) => {
  return extractAfterLabel(lines, [
    /(?:invoice\s*(?:no|number|#)|sales\s*invoice\s*(?:no|number|#))\s*[:#.-]?\s*(.+)$/i,

    /(?:receipt\s*(?:no|number|#)|or\s*(?:no|number|#))\s*[:#.-]?\s*(.+)$/i,

    /(?:si\s*(?:no|number|#))\s*[:#.-]?\s*(.+)$/i,
  ]);
};

/**
 * Extract PO number.
 */
const extractPONumber = (lines) => {
  return extractAfterLabel(lines, [
    /(?:po|p\.o\.)\s*(?:no|number|#)?\s*[:#.-]?\s*([A-Z0-9-]+)/i,

    /purchase\s*order\s*(?:no|number|#)?\s*[:#.-]?\s*([A-Z0-9-]+)/i,
  ]);
};

/**
 * Extract date from common receipt labels.
 */
const extractInvoiceDate = (lines) => {
  const labeledDate = extractAfterLabel(lines, [
    /(?:invoice\s*)?date\s*[:#.-]?\s*(.+)$/i,

    /transaction\s*date\s*[:#.-]?\s*(.+)$/i,

    /purchase\s*date\s*[:#.-]?\s*(.+)$/i,
  ]);

  if (labeledDate) {
    const normalized = normalizeDate(labeledDate);

    if (normalized) {
      return normalized;
    }
  }

  // Look for common numeric dates anywhere in the receipt.
  for (const line of lines) {
    const match = line.match(
      /\b(\d{1,2}[/-]\d{1,2}[/-]\d{4})\b/,
    );

    if (match) {
      const normalized = normalizeDate(match[1]);

      if (normalized) {
        return normalized;
      }
    }
  }

  // Look for dates such as:
  // January 20, 2023
  // Jan 20, 2023
  for (const line of lines) {
    const match = line.match(
      /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?[,]?\s+\d{4}\b/i,
    );

    if (match) {
      const normalized = normalizeDate(match[0]);

      if (normalized) {
        return normalized;
      }
    }
  }

  return "";
};

/**
 * Extract supplier / vendor name.
 *
 * Most receipts place the business name near the top.
 * We intentionally use a conservative approach here.
 */
const extractSupplier = (lines) => {
  const supplierLabels = [
    /supplier\s*[:#.-]?\s*(.+)$/i,
    /vendor\s*[:#.-]?\s*(.+)$/i,
    /merchant\s*[:#.-]?\s*(.+)$/i,
  ];

  const labeledSupplier = extractAfterLabel(
    lines,
    supplierLabels,
  );

  if (labeledSupplier) {
    return labeledSupplier;
  }

  /*
   * If there is no explicit "Supplier" or "Vendor" label,
   * use the first meaningful line as a candidate.
   *
   * We skip obvious receipt metadata.
   */
  const ignoredPatterns = [
    /^(receipt|invoice|sales invoice|official receipt)/i,
    /^date\s*[:#]/i,
    /^tel/i,
    /^phone/i,
    /^mobile/i,
    /^address/i,
    /^permit/i,
    /^tin/i,
    /^vat/i,
    /^pos/i,
    /^cashier/i,
    /^transaction/i,
  ];

  for (const line of lines.slice(0, 8)) {
    if (line.length < 3) {
      continue;
    }

    if (ignoredPatterns.some((pattern) => pattern.test(line))) {
      continue;
    }

    // Avoid selecting a line that is mostly numeric.
    const letters = line.match(/[A-Za-z]/g) || [];

    if (letters.length < 3) {
      continue;
    }

    return line;
  }

  return "";
};

/**
 * Extract total amount.
 */
const extractTotal = (lines) => {
  const totalPatterns = [
    /(?:grand\s*)?total\s*[:#.-]?\s*(?:₱|php|p)?\s*([\d,]+(?:\.\d{1,2})?)/i,

    /amount\s*(?:due|payable)\s*[:#.-]?\s*(?:₱|php|p)?\s*([\d,]+(?:\.\d{1,2})?)/i,

    /net\s*total\s*[:#.-]?\s*(?:₱|php|p)?\s*([\d,]+(?:\.\d{1,2})?)/i,
  ];

  const value = extractAfterLabel(lines, totalPatterns);

  if (!value) {
    return "";
  }

  return value.replace(/,/g, "");
};

/**
 * Try to extract an item from a receipt line.
 *
 * This is intentionally conservative.
 *
 * Example supported patterns:
 *
 * Bond Paper 5 200.00 1000.00
 * Ballpen 10 25.00 250.00
 */
const parseItemLine = (line) => {
  if (!line) {
    return null;
  }

  /*
   * Ignore lines that are obviously totals or payment information.
   */
  if (
    /^(total|grand total|amount due|subtotal|vat|tax|cash|change|payment|balance|tender)/i.test(
      line,
    )
  ) {
    return null;
  }

  /*
   * Look for:
   *
   * description
   * qty
   * unit price
   * amount
   */
  const match = line.match(
    /^(.+?)\s+(\d+(?:\.\d+)?)\s+(?:₱|php|p)?\s*([\d,]+(?:\.\d{1,2})?)\s+(?:₱|php|p)?\s*([\d,]+(?:\.\d{1,2})?)$/i,
  );

  if (!match) {
    return null;
  }

  const particulars = match[1].trim();

  const qty = Number(match[2]);

  const unitPrice = Number(
    match[3].replace(/,/g, ""),
  );

  const amount = Number(
    match[4].replace(/,/g, ""),
  );

  if (!particulars || !Number.isFinite(qty)) {
    return null;
  }

  return {
    id: null,
    particulars,
    qty,
    unit: "Piece",
    unitPrice,
    amount,
  };
};

/**
 * Extract receipt items.
 */
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

/**
 * Main receipt parser.
 *
 * @param {string} rawText
 * @returns {{
 *   supplier: string,
 *   invoiceDate: string,
 *   invoiceNumber: string,
 *   poNumber: string,
 *   total: string,
 *   items: Array
 * }}
 */
export const parseReceiptText = (rawText) => {
  if (!rawText) {
    return {
      supplier: "",
      invoiceDate: "",
      invoiceNumber: "",
      poNumber: "",
      total: "",
      items: [],
    };
  }

  const lines = getLines(rawText);

  return {
    supplier: extractSupplier(lines),

    invoiceDate: extractInvoiceDate(lines),

    invoiceNumber: extractInvoiceNumber(lines),

    poNumber: extractPONumber(lines),

    total: extractTotal(lines),

    items: extractItems(lines),
  };
};

export default parseReceiptText;