// POS sample data + helpers (UI only -- no backend yet). Products and
// sales live in this browser's localStorage so the pages feel real;
// replace these functions with API calls when the backend exists.

export const CATEGORIES = ["All", "Beverages", "Snacks", "Meals", "Essentials", "Auto"];

export const PAYMENT_METHODS = [
  { key: "cash", label: "Cash" },
  { key: "gcash", label: "GCash" },
  { key: "card", label: "Card" },
  { key: "salary", label: "Salary Deduct" },
];

export const VAT_RATE = 0.12;

const SEED_PRODUCTS = [
  { id: 1, sku: "BEV-001", name: "Bottled Water 500ml", category: "Beverages", price: 20, stock: 140, emoji: "💧" },
  { id: 2, sku: "BEV-002", name: "Iced Coffee", category: "Beverages", price: 45, stock: 38, emoji: "🧋" },
  { id: 3, sku: "BEV-003", name: "Energy Drink", category: "Beverages", price: 35, stock: 6, emoji: "⚡" },
  { id: 4, sku: "BEV-004", name: "Softdrink 1.5L", category: "Beverages", price: 75, stock: 24, emoji: "🥤" },
  { id: 5, sku: "SNK-001", name: "Chips Regular", category: "Snacks", price: 28, stock: 52, emoji: "🥔" },
  { id: 6, sku: "SNK-002", name: "Crackers Pack", category: "Snacks", price: 15, stock: 80, emoji: "🍘" },
  { id: 7, sku: "SNK-003", name: "Chocolate Bar", category: "Snacks", price: 40, stock: 4, emoji: "🍫" },
  { id: 8, sku: "SNK-004", name: "Banana Chips", category: "Snacks", price: 25, stock: 30, emoji: "🍌" },
  { id: 9, sku: "MEL-001", name: "Chicken Rice Meal", category: "Meals", price: 95, stock: 18, emoji: "🍗" },
  { id: 10, sku: "MEL-002", name: "Pork Adobo Meal", category: "Meals", price: 99, stock: 15, emoji: "🍛" },
  { id: 11, sku: "MEL-003", name: "Instant Noodles", category: "Meals", price: 30, stock: 64, emoji: "🍜" },
  { id: 12, sku: "MEL-004", name: "Siopao", category: "Meals", price: 35, stock: 0, emoji: "🥟" },
  { id: 13, sku: "ESS-001", name: "Face Towel", category: "Essentials", price: 55, stock: 20, emoji: "🧻" },
  { id: 14, sku: "ESS-002", name: "Alcohol 250ml", category: "Essentials", price: 65, stock: 26, emoji: "🧴" },
  { id: 15, sku: "ESS-003", name: "Phone Charger Cable", category: "Essentials", price: 150, stock: 9, emoji: "🔌" },
  { id: 16, sku: "AUT-001", name: "Engine Oil 1L", category: "Auto", price: 320, stock: 12, emoji: "🛢️" },
  { id: 17, sku: "AUT-002", name: "Coolant 1L", category: "Auto", price: 210, stock: 3, emoji: "🧪" },
  { id: 18, sku: "AUT-003", name: "Work Gloves", category: "Auto", price: 85, stock: 40, emoji: "🧤" },
];

export const LOW_STOCK = 10;

const PRODUCTS_KEY = "pos_products_v1";
const SALES_KEY = "pos_sales_v1";

const read = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const write = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore (private browsing / full storage)
  }
};

export const loadProducts = () => read(PRODUCTS_KEY, SEED_PRODUCTS);
export const saveProducts = (products) => write(PRODUCTS_KEY, products);

// A few past sales so the Sales page isn't empty on first open.
const seedSales = () => {
  const now = Date.now();
  const sample = [
    { mins: 25, method: "cash", cashier: "Front Desk", items: [[2, 2], [5, 1]] },
    { mins: 70, method: "gcash", cashier: "Front Desk", items: [[9, 1], [1, 1]] },
    { mins: 140, method: "salary", cashier: "Front Desk", items: [[16, 1], [18, 2]], customer: "Juan Dela Cruz" },
    { mins: 300, method: "card", cashier: "Yard Store", items: [[4, 2], [6, 3]] },
    { mins: 60 * 26, method: "cash", cashier: "Yard Store", items: [[10, 2], [3, 2]] },
    { mins: 60 * 30, method: "gcash", cashier: "Front Desk", items: [[14, 1], [13, 1]] },
  ];
  return sample.map((s, i) => {
    const lines = s.items.map(([id, qty]) => {
      const p = SEED_PRODUCTS.find((x) => x.id === id);
      return { id, name: p.name, price: p.price, qty };
    });
    return buildSale({
      no: 1006 - i,
      lines,
      discount: 0,
      method: s.method,
      tendered: null,
      cashier: s.cashier,
      customer: s.customer || "",
      at: new Date(now - s.mins * 60000).toISOString(),
    });
  });
};

export const loadSales = () => read(SALES_KEY, null) || seedSales();
export const saveSales = (sales) => write(SALES_KEY, sales);

export const nextSaleNo = (sales) =>
  sales.reduce((max, s) => Math.max(max, s.no), 1000) + 1;

// Prices are VAT-inclusive; VAT is shown as a breakdown.
export function computeTotals(lines, discount = 0) {
  const gross = lines.reduce((sum, l) => sum + l.price * l.qty, 0);
  const disc = Math.min(Math.max(Number(discount) || 0, 0), gross);
  const total = gross - disc;
  const vatable = total / (1 + VAT_RATE);
  return {
    gross,
    discount: disc,
    total,
    vatable,
    vat: total - vatable,
    items: lines.reduce((sum, l) => sum + l.qty, 0),
  };
}

export function buildSale({ no, lines, discount, method, tendered, cashier, customer, at }) {
  const totals = computeTotals(lines, discount);
  return {
    id: `S-${no}`,
    no,
    at: at || new Date().toISOString(),
    lines,
    method,
    tendered: method === "cash" ? Number(tendered) || totals.total : null,
    change: method === "cash" ? Math.max((Number(tendered) || totals.total) - totals.total, 0) : 0,
    cashier,
    customer,
    status: "paid",
    ...totals,
  };
}

export const peso = (value) =>
  `₱${Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export const methodLabel = (key) =>
  PAYMENT_METHODS.find((m) => m.key === key)?.label || key;
