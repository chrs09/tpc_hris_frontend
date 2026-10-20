import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { AlertTriangle, PackagePlus, Pencil, Search, X } from "lucide-react";
import SectionTabs from "../../components/ui/sectionTabs/SectionTabs";
import { CATEGORIES, LOW_STOCK, loadProducts, peso, saveProducts } from "./posData";

const EMPTY = { sku: "", name: "", category: "Beverages", price: "", stock: "", emoji: "📦" };

export default function PosProducts() {
  const [products, setProducts] = useState(loadProducts);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [lowOnly, setLowOnly] = useState(false);
  const [editing, setEditing] = useState(null); // product draft or null

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter(
      (p) =>
        (category === "All" || p.category === category) &&
        (!lowOnly || p.stock <= LOW_STOCK) &&
        (!q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)),
    );
  }, [products, search, category, lowOnly]);

  const lowCount = products.filter((p) => p.stock <= LOW_STOCK).length;
  const stockValue = products.reduce((sum, p) => sum + p.price * Math.max(p.stock, 0), 0);

  const persist = (next) => {
    setProducts(next);
    saveProducts(next);
  };

  const handleSave = () => {
    const price = Number(editing.price);
    const stock = Number(editing.stock);
    if (!editing.name.trim() || !editing.sku.trim()) {
      toast.error("Name and SKU are required.");
      return;
    }
    if (!(price >= 0) || !Number.isInteger(stock) || stock < 0) {
      toast.error("Enter a valid price and stock.");
      return;
    }
    if (products.some((p) => p.sku === editing.sku.trim() && p.id !== editing.id)) {
      toast.error("That SKU is already used.");
      return;
    }
    const clean = { ...editing, sku: editing.sku.trim(), name: editing.name.trim(), price, stock };
    if (editing.id) {
      persist(products.map((p) => (p.id === editing.id ? clean : p)));
      toast.success("Product updated.");
    } else {
      const id = products.reduce((max, p) => Math.max(max, p.id), 0) + 1;
      persist([...products, { ...clean, id }]);
      toast.success("Product added.");
    }
    setEditing(null);
  };

  return (
    <>
      <SectionTabs group="POS" />

      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-fg sm:text-3xl">Products</h1>
            <p className="text-sm text-fg-subtle">Catalog, prices and stock on hand.</p>
          </div>
          <button
            type="button"
            onClick={() => setEditing({ ...EMPTY })}
            className="flex h-11 w-fit items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover"
          >
            <PackagePlus size={18} /> Add Product
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat label="Products" value={products.length} />
          <Stat label="Stock value" value={peso(stockValue)} />
          <button
            type="button"
            onClick={() => setLowOnly((v) => !v)}
            className={`rounded-2xl border p-4 text-left shadow-sm transition ${
              lowOnly ? "border-amber-500 bg-amber-500/10" : "border-border bg-surface hover:bg-surface-hover"
            }`}
          >
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-500">
              <AlertTriangle size={14} /> Low / out of stock
            </span>
            <p className="mt-2 text-2xl font-bold text-fg">{lowCount}</p>
            <p className="text-xs text-fg-subtle">{lowOnly ? "Showing only these" : "Tap to filter"}</p>
          </button>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search
              size={18}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-subtle"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or SKU"
              className="h-11 w-full rounded-xl border border-border bg-surface pl-10 pr-4 text-sm text-fg outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-11 rounded-xl border border-border bg-surface px-3 text-sm text-fg outline-none"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c === "All" ? "All categories" : c}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-surface-hover text-fg-muted">
              <tr className="text-xs uppercase tracking-wide">
                <th className="px-5 py-3 text-left font-medium">Product</th>
                <th className="px-5 py-3 text-left font-medium">SKU</th>
                <th className="px-5 py-3 text-left font-medium">Category</th>
                <th className="px-5 py-3 text-right font-medium">Price</th>
                <th className="px-5 py-3 text-right font-medium">Stock</th>
                <th className="px-5 py-3 text-right font-medium" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-10 text-center text-fg-subtle">
                    No products found.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="border-t border-border transition hover:bg-surface-hover">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-hover text-lg">
                          {p.emoji}
                        </span>
                        <span className="font-medium text-fg">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-fg-muted">{p.sku}</td>
                    <td className="px-5 py-3 text-fg-muted">{p.category}</td>
                    <td className="px-5 py-3 text-right font-medium text-fg">{peso(p.price)}</td>
                    <td className="px-5 py-3 text-right">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          p.stock <= 0
                            ? "bg-red-500/15 text-red-500"
                            : p.stock <= LOW_STOCK
                              ? "bg-amber-500/15 text-amber-500"
                              : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {p.stock <= 0 ? "Out" : p.stock}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setEditing({ ...p })}
                        className="rounded-lg p-2 text-fg-muted hover:bg-surface-active hover:text-fg"
                        aria-label={`Edit ${p.name}`}
                      >
                        <Pencil size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <div
          className="fixed inset-0 z-90 flex items-end justify-center bg-black/60 sm:items-center sm:p-4"
          onClick={() => setEditing(null)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl border border-border bg-surface p-5 shadow-xl sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-fg">
                {editing.id ? "Edit Product" : "Add Product"}
              </h3>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-lg p-1.5 text-fg-muted hover:bg-surface-hover"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-[72px_1fr] gap-3">
              <Input label="Icon" value={editing.emoji} onChange={(v) => setEditing({ ...editing, emoji: v.slice(-2) })} center />
              <Input label="Name" value={editing.name} onChange={(v) => setEditing({ ...editing, name: v })} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Input label="SKU" value={editing.sku} onChange={(v) => setEditing({ ...editing, sku: v.toUpperCase() })} />
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-fg-muted">Category</span>
                <select
                  value={editing.category}
                  onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                  className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-fg outline-none"
                >
                  {CATEGORIES.filter((c) => c !== "All").map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <Input label="Price (₱, VAT incl.)" type="number" value={editing.price} onChange={(v) => setEditing({ ...editing, price: v })} />
              <Input label="Stock" type="number" value={editing.stock} onChange={(v) => setEditing({ ...editing, stock: v })} />
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-fg hover:bg-surface-hover"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <span className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">{label}</span>
      <p className="mt-2 text-2xl font-bold text-fg">{value}</p>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", center = false }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-fg-muted">{label}</span>
      <input
        type={type}
        min={type === "number" ? "0" : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-fg outline-none focus:ring-2 focus:ring-primary/30 ${
          center ? "text-center text-lg" : ""
        }`}
      />
    </label>
  );
}
