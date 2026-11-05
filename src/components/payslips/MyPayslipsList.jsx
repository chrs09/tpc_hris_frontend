import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import toast from "react-hot-toast";
import { getMyPayslip, getMyPayslips } from "../../api/payroll/payrollRuns";
import PayslipModal from "../payroll/PayslipModal";

const peso = (value) =>
  `₱${Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const shortDate = (iso) =>
  iso
    ? new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "";

// The logged-in employee's payslips that Payroll released (Payroll ->
// Release Payslip / Release selected, after the payroll is locked),
// newest first, each with a View button. Renders nothing until at least
// one is released -- no payslip, no section. `wrap(content)` puts the
// list in the dashboard's card / section.
export default function MyPayslipsList({ wrap = (content) => content }) {
  const [payslips, setPayslips] = useState([]);
  const [opening, setOpening] = useState(null);
  const [open, setOpen] = useState(null);

  useEffect(() => {
    getMyPayslips()
      .then(setPayslips)
      .catch(() => setPayslips([]));
  }, []);

  const view = async (payslip) => {
    try {
      setOpening(payslip.id);
      const data = await getMyPayslip(payslip.id);
      setOpen(data.snapshot);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Could not open the payslip.");
    } finally {
      setOpening(null);
    }
  };

  if (!payslips.length) return null;

  return (
    <>
      {wrap(
        <div className="space-y-2">
          {payslips.map((payslip) => (
            <div
              key={payslip.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface-hover p-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <FileText size={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-fg">
                    {shortDate(payslip.period_start)} – {shortDate(payslip.period_end)},{" "}
                    {payslip.period_end.slice(0, 4)}
                  </p>
                  <p className="truncate text-xs text-fg-muted">
                    {payslip.payout_date ? `Payout ${payslip.payout_date} · ` : ""}
                    Net {peso(payslip.net_pay)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => view(payslip)}
                disabled={opening === payslip.id}
                className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
              >
                {opening === payslip.id ? "Opening..." : "View Payslip"}
              </button>
            </div>
          ))}
        </div>,
      )}

      <PayslipModal
        isOpen={Boolean(open)}
        payrolls={open ? [open.row] : []}
        activePeriod={open?.period}
        onClose={() => setOpen(null)}
      />
    </>
  );
}
