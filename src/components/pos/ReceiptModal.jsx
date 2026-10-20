import { CheckCircle2, Printer, X } from "lucide-react";
import { methodLabel, peso } from "../../pages/POS/posData";

// Receipt for one sale -- shown after checkout and from Sales history.
export default function ReceiptModal({ sale, onClose, justPaid = false }) {
  if (!sale) return null;

  return (
    <div
      className="fixed inset-0 z-90 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <p className="text-sm font-semibold text-fg">Receipt #{sale.no}</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-fg-muted hover:bg-surface-hover"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 font-mono text-[13px] text-fg">
          {justPaid && (
            <div className="mb-4 flex flex-col items-center gap-1 font-sans">
              <CheckCircle2 size={40} className="text-emerald-500" />
              <p className="text-base font-semibold">Payment complete</p>
              {sale.method === "cash" && (
                <p className="text-sm text-fg-muted">
                  Change: <span className="font-semibold text-fg">{peso(sale.change)}</span>
                </p>
              )}
            </div>
          )}

          <div className="text-center">
            <p className="font-bold tracking-wide">TYTAN PRIME</p>
            <p className="text-fg-muted">Point of Sale</p>
            <p className="mt-1 text-fg-subtle">{new Date(sale.at).toLocaleString()}</p>
            <p className="text-fg-subtle">Cashier: {sale.cashier}</p>
            {sale.customer && <p className="text-fg-subtle">Customer: {sale.customer}</p>}
          </div>

          <div className="my-3 border-t border-dashed border-border" />

          <div className="space-y-1.5">
            {sale.lines.map((line) => (
              <div key={line.id}>
                <p className="truncate">{line.name}</p>
                <div className="flex justify-between text-fg-muted">
                  <span>
                    {line.qty} × {peso(line.price)}
                  </span>
                  <span className="text-fg">{peso(line.qty * line.price)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="my-3 border-t border-dashed border-border" />

          <Row label={`Subtotal (${sale.items} item${sale.items !== 1 ? "s" : ""})`} value={peso(sale.gross)} />
          {sale.discount > 0 && <Row label="Discount" value={`-${peso(sale.discount)}`} />}
          <Row label="VATable sales" value={peso(sale.vatable)} muted />
          <Row label="VAT (12%)" value={peso(sale.vat)} muted />
          <div className="mt-1 flex justify-between text-base font-bold">
            <span>TOTAL</span>
            <span>{peso(sale.total)}</span>
          </div>

          <div className="my-3 border-t border-dashed border-border" />

          <Row label="Paid via" value={methodLabel(sale.method)} />
          {sale.method === "cash" && (
            <>
              <Row label="Cash" value={peso(sale.tendered)} />
              <Row label="Change" value={peso(sale.change)} />
            </>
          )}

          <p className="mt-4 text-center text-fg-subtle">Thank you!</p>
        </div>

        <div className="flex gap-2 border-t border-border p-3">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-sm font-medium text-fg hover:bg-surface-hover"
          >
            <Printer size={16} /> Print
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
          >
            {justPaid ? "New Sale" : "Done"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, muted = false }) {
  return (
    <div className={`flex justify-between ${muted ? "text-fg-subtle" : ""}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
