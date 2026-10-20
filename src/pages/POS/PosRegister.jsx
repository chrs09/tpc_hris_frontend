import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  Banknote,
  CreditCard,
  Minus,
  Plus,
  Search,
  ShoppingCart,
  Smartphone,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import SectionTabs from "../../components/ui/sectionTabs/SectionTabs";
import ReceiptModal from "../../components/pos/ReceiptModal";
import {
  CATEGORIES,
  LOW_STOCK,
  PAYMENT_METHODS,
  buildSale,
  computeTotals,
  loadProducts,
  loadSales,
  nextSaleNo,
  peso,
  saveProducts,
  saveSales,
} from "./posData";

const METHOD_ICONS = {
  cash: Banknote,
  gcash: Smartphone,
  card: CreditCard,
  salary: Wallet,
};

const QUICK_CASH = [100, 200, 500, 1000];

export default function PosRegister() {
  const [products, setProducts] = useState(loadProducts);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [discount, setDiscount] = useState("");
  const [method, setMethod] = useState("cash");
  const [tendered, setTendered] = useState("");
  const [customer, setCustomer] = useState("");
  const [cartOpen, setCartOpen] = useState(false); // phones: cart sheet
  const [receipt, setReceipt] = useState(null);

  const cashier = localStorage.getItem("username") || "Cashier";

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter(
      (p) =>
        (category === "All" || p.category === category) &&
        (!q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)),
    );
  }, [products, search, category]);

  const totals = computeTotals(cart, discount);
  const qtyInCart = (id) => cart.find((l) => l.id === id)?.qty || 0;

  const addToCart = (product) => {
    if (qtyInCart(product.id) >= product.stock) {
      toast.error(`Only ${product.stock} ${product.name} in stock.`);
      return;
    }
    setCart((prev) => {
      const existing = prev.find((l) => l.id === product.id);
      if (existing) {
        return prev.map((l) => (l.id === product.id ? { ...l, qty: l.qty + 1 } : l));
      }
      return [...prev, { id: product.id, name: product.name, price: product.price, qty: 1 }];
    });
  };

  const changeQty = (id, delta) => {
    const product = products.find((p) => p.id === id);
    setCart((prev) =>
      prev
        .map((l) => {
          if (l.id !== id) return l;
          const qty = l.qty + delta;
          if (product && qty > product.stock) {
            toast.error(`Only ${product.stock} in stock.`);
            return l;
          }
          return { ...l, qty };
        })
        .filter((l) => l.qty > 0),
    );
  };

  const clearSale = () => {
    setCart([]);
    setDiscount("");
    setTendered("");
    setCustomer("");
    setMethod("cash");
  };

  const handleCharge = () => {
    if (!cart.length) return;
    if (method === "cash" && (Number(tendered) || 0) < totals.total) {
      toast.error("Cash received is less than the total.");
      return;
    }
    if (method === "salary" && !customer.trim()) {
      toast.error("Enter the employee for salary deduction.");
      return;
    }

    const sales = loadSales();
    const sale = buildSale({
      no: nextSaleNo(sales),
      lines: cart,
      discount,
      method,
      tendered,
      cashier,
      customer: customer.trim(),
    });
    saveSales([sale, ...sales]);

    const nextProducts = products.map((p) => {
      const line = cart.find((l) => l.id === p.id);
      return line ? { ...p, stock: p.stock - line.qty } : p;
    });
    setProducts(nextProducts);
    saveProducts(nextProducts);

    clearSale();
    setCartOpen(false);
    setReceipt(sale);
  };

  const cartPanel = (
    <CartPanel
      cart={cart}
      totals={totals}
      discount={discount}
      setDiscount={setDiscount}
      method={method}
      setMethod={setMethod}
      tendered={tendered}
      setTendered={setTendered}
      customer={customer}
      setCustomer={setCustomer}
      changeQty={changeQty}
      onClear={clearSale}
      onCharge={handleCharge}
      onClose={() => setCartOpen(false)}
    />
  );

  return (
    <>
      <SectionTabs group="POS" />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* PRODUCTS */}
        <div className="min-w-0 space-y-4 pb-24 lg:pb-0">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold text-fg sm:text-3xl">Register</h1>
            <p className="text-sm text-fg-subtle">
              Tap a product to add it to the sale.
            </p>
          </div>

          <div className="relative">
            <Search
              size={18}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-subtle"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product or SKU"
              className="h-11 w-full rounded-xl border border-border bg-surface pl-10 pr-4 text-sm text-fg outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  category === c
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-surface text-fg-muted hover:bg-surface-hover"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-fg-subtle">
              No products found.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {filtered.map((p) => {
                const inCart = qtyInCart(p.id);
                const out = p.stock <= 0;
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={out}
                    onClick={() => addToCart(p)}
                    className={`relative flex flex-col rounded-2xl border bg-surface p-3 text-left shadow-sm transition ${
                      inCart
                        ? "border-primary ring-1 ring-primary"
                        : "border-border hover:border-fg-subtle hover:shadow-md"
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    {inCart > 0 && (
                      <span className="absolute right-2 top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">
                        {inCart}
                      </span>
                    )}
                    <div className="mb-3 flex h-16 items-center justify-center rounded-xl bg-surface-hover text-3xl">
                      {p.emoji}
                    </div>
                    <p className="line-clamp-2 text-sm font-medium text-fg">{p.name}</p>
                    <div className="mt-auto flex items-end justify-between pt-2">
                      <span className="text-sm font-bold text-fg">{peso(p.price)}</span>
                      <span
                        className={`text-[11px] font-medium ${
                          out
                            ? "text-danger"
                            : p.stock <= LOW_STOCK
                              ? "text-amber-500"
                              : "text-fg-subtle"
                        }`}
                      >
                        {out ? "Out" : `${p.stock} left`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* CART -- side panel on desktop */}
        <div className="hidden lg:block">
          <div className="sticky top-4 h-[calc(100vh-2rem)]">{cartPanel}</div>
        </div>
      </div>

      {/* Phones / tablets: bottom bar + full cart sheet */}
      {!cartOpen && (
        <div className="fixed inset-x-4 bottom-20 z-40 lg:hidden">
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="flex w-full items-center justify-between rounded-2xl bg-primary px-5 py-3.5 text-primary-foreground shadow-xl"
          >
            <span className="flex items-center gap-2 text-sm font-semibold">
              <ShoppingCart size={18} />
              {totals.items} item{totals.items !== 1 ? "s" : ""}
            </span>
            <span className="text-base font-bold">{peso(totals.total)}</span>
          </button>
        </div>
      )}
      {cartOpen && (
        <div className="fixed inset-0 z-80 bg-black/50 lg:hidden" onClick={() => setCartOpen(false)}>
          <div
            className="absolute inset-x-0 bottom-0 top-12 rounded-t-3xl bg-surface"
            onClick={(e) => e.stopPropagation()}
          >
            {cartPanel}
          </div>
        </div>
      )}

      <ReceiptModal sale={receipt} justPaid onClose={() => setReceipt(null)} />
    </>
  );
}

function CartPanel({
  cart,
  totals,
  discount,
  setDiscount,
  method,
  setMethod,
  tendered,
  setTendered,
  customer,
  setCustomer,
  changeQty,
  onClear,
  onCharge,
  onClose,
}) {
  const change = Math.max((Number(tendered) || 0) - totals.total, 0);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-surface shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <p className="text-base font-semibold text-fg">Current Sale</p>
          <p className="text-xs text-fg-subtle">
            {totals.items} item{totals.items !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {cart.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-danger hover:bg-surface-hover"
            >
              <Trash2 size={14} /> Clear
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-fg-muted hover:bg-surface-hover lg:hidden"
            aria-label="Close cart"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Lines */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {cart.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-10 text-fg-subtle">
            <ShoppingCart size={36} strokeWidth={1.5} />
            <p className="text-sm">No items yet</p>
          </div>
        ) : (
          cart.map((line) => (
            <div
              key={line.id}
              className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-surface-hover"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-fg">{line.name}</p>
                <p className="text-xs text-fg-subtle">{peso(line.price)} each</p>
              </div>
              <div className="flex items-center rounded-lg border border-border">
                <button
                  type="button"
                  onClick={() => changeQty(line.id, -1)}
                  className="p-1.5 text-fg-muted hover:text-fg"
                  aria-label="Less"
                >
                  <Minus size={14} />
                </button>
                <span className="w-7 text-center text-sm font-semibold text-fg">{line.qty}</span>
                <button
                  type="button"
                  onClick={() => changeQty(line.id, 1)}
                  className="p-1.5 text-fg-muted hover:text-fg"
                  aria-label="More"
                >
                  <Plus size={14} />
                </button>
              </div>
              <p className="w-20 text-right text-sm font-semibold text-fg">
                {peso(line.price * line.qty)}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Payment */}
      <div className="space-y-3 border-t border-border px-5 py-4">
        <div className="space-y-1 text-sm">
          <div className="flex justify-between text-fg-muted">
            <span>Subtotal</span>
            <span>{peso(totals.gross)}</span>
          </div>
          <div className="flex items-center justify-between text-fg-muted">
            <span>Discount</span>
            <input
              type="number"
              min="0"
              inputMode="decimal"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              placeholder="0.00"
              className="h-8 w-24 rounded-lg border border-border bg-surface px-2 text-right text-sm text-fg outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="flex justify-between text-xs text-fg-subtle">
            <span>VAT included (12%)</span>
            <span>{peso(totals.vat)}</span>
          </div>
          <div className="flex justify-between pt-1 text-xl font-bold text-fg">
            <span>Total</span>
            <span>{peso(totals.total)}</span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {PAYMENT_METHODS.map((m) => {
            const MethodIcon = METHOD_ICONS[m.key];
            const active = method === m.key;
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => setMethod(m.key)}
                className={`flex flex-col items-center gap-1 rounded-xl border px-1 py-2 text-[11px] font-medium transition ${
                  active
                    ? "border-primary bg-primary/10 text-fg"
                    : "border-border text-fg-muted hover:bg-surface-hover"
                }`}
              >
                <MethodIcon size={18} />
                {m.label}
              </button>
            );
          })}
        </div>

        {method === "cash" && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                inputMode="decimal"
                value={tendered}
                onChange={(e) => setTendered(e.target.value)}
                placeholder="Cash received"
                className="h-10 min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 text-sm text-fg outline-none focus:ring-2 focus:ring-primary/30"
              />
              <div className="text-right">
                <p className="text-[11px] text-fg-subtle">Change</p>
                <p className="text-sm font-bold text-fg">{peso(change)}</p>
              </div>
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setTendered(String(totals.total))}
                className="flex-1 rounded-lg border border-border py-1.5 text-xs font-medium text-fg-muted hover:bg-surface-hover"
              >
                Exact
              </button>
              {QUICK_CASH.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => setTendered(String(amount))}
                  className="flex-1 rounded-lg border border-border py-1.5 text-xs font-medium text-fg-muted hover:bg-surface-hover"
                >
                  {amount}
                </button>
              ))}
            </div>
          </div>
        )}

        {(method === "salary" || method === "card" || method === "gcash") && (
          <input
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
            placeholder={method === "salary" ? "Employee name (required)" : "Customer name (optional)"}
            className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-fg outline-none focus:ring-2 focus:ring-primary/30"
          />
        )}

        <button
          type="button"
          disabled={!cart.length}
          onClick={onCharge}
          className="h-12 w-full rounded-2xl bg-primary text-base font-bold text-primary-foreground shadow-sm transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          Charge {peso(totals.total)}
        </button>
      </div>
    </div>
  );
}
