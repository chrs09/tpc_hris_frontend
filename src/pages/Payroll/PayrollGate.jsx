import { useSearchParams } from "react-router-dom";
import PayRunsPage from "./PayRunsPage";
import PayrollList from "./PayrollList";

// /dashboard/payroll: the Pay Runs list, or one pay run when opened
// (?payroll=<group>&cutoff=<start>_<end>). Keyed so switching runs starts
// the payroll page fresh.
export default function PayrollGate() {
  const [params] = useSearchParams();
  const payroll = params.get("payroll");
  const cutoff = params.get("cutoff");
  if (payroll && cutoff) {
    return <PayrollList key={`${payroll}|${cutoff}`} />;
  }
  return <PayRunsPage />;
}
