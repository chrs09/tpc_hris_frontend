import React, { useEffect, useState } from "react";
import { CarFront, CheckCircle2, LogIn, LogOut, Wallet } from "lucide-react";
import { getWallet, getWalletCutoffs } from "../../api/driver/trips";
import SearchSelect from "../SearchSelect";

// The driver's Trip Wallet -- same view as the mobile app's "My Wallet"
// (tytan_mobile/src/app/driver/wallet.tsx): earnings for the picked
// payroll period, completed trips, and each trip's earning (shipment,
// time in / out, trip, amount).
export default function WalletCard() {
  const [cutoffs, setCutoffs] = useState([]);
  const [selectedCutoff, setSelectedCutoff] = useState("");
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCutoffs = async () => {
      try {
        const data = await getWalletCutoffs();
        setCutoffs(data);
        if (data.length) setSelectedCutoff(data[0].value);
        else setLoading(false);
      } catch (error) {
        console.error("Failed to load wallet cutoffs:", error);
        setLoading(false);
      }
    };
    loadCutoffs();
  }, []);

  useEffect(() => {
    if (!selectedCutoff) return;

    const loadWallet = async () => {
      try {
        setLoading(true);
        const data = await getWallet(selectedCutoff);
        setWallet(data);
      } catch (error) {
        console.error("Failed to load wallet:", error);
      } finally {
        setLoading(false);
      }
    };
    loadWallet();
  }, [selectedCutoff]);

  const isCurrent = cutoffs.length > 0 && String(cutoffs[0].value) === String(selectedCutoff);
  const transactions = wallet?.transactions || [];
  const peso = (value) =>
    `₱${Number(value || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-surface p-5 text-fg shadow-sm">
      {/* Wallet card */}
      <div className="rounded-2xl bg-primary p-5 text-primary-foreground">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Trip Wallet</p>
            <p className="text-xs opacity-80">Available Earnings</p>
          </div>
          <Wallet size={22} className="opacity-80" />
        </div>
        <p className="mt-3 text-3xl font-bold tabular-nums">
          {loading ? "..." : peso(wallet?.earnings)}
        </p>

        <div className="mt-4">
          <p className="mb-1 text-xs opacity-80">Payroll Period</p>
          {cutoffs.length > 0 ? (
            <div className="text-fg">
              <SearchSelect
                value={cutoffs.find((c) => String(c.value) === String(selectedCutoff)) || null}
                options={cutoffs}
                onChange={(option) => option && setSelectedCutoff(option.value)}
                placeholder="Select payroll period"
              />
            </div>
          ) : (
            <p className="text-sm font-semibold">No payroll periods yet</p>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-primary-foreground/20 pt-3 text-sm">
          <div>
            <p className="text-xs opacity-80">Completed Trips</p>
            <p className="font-bold tabular-nums">{wallet?.trips ?? 0}</p>
          </div>
          <div>
            <p className="text-xs opacity-80">Status</p>
            <p className="font-bold">{isCurrent ? "Current" : "Previous period"}</p>
          </div>
        </div>
      </div>

      {!loading && (wallet?.expected_trips ?? 0) > 0 && (
        <div className="rounded-xl bg-surface-hover p-3">
          <p className="text-xs text-fg-muted">
            Expected payment for this period ({wallet.expected_trips} trip
            {wallet.expected_trips === 1 ? "" : "s"} still in review)
          </p>
          <p className="text-lg font-bold text-warning tabular-nums">
            {peso(wallet.expected_earnings)}
          </p>
        </div>
      )}

      {/* Recent earnings */}
      <div>
        <h3 className="mb-2 text-sm font-bold text-fg">Recent Earnings</h3>
        {!loading && transactions.length === 0 && (
          <p className="rounded-xl bg-surface-hover p-4 text-center text-xs text-fg-muted">
            {wallet?.expected_trips
              ? "Trips are still pending finance review, so nothing is confirmed yet."
              : "No trips for this payroll period yet."}
          </p>
        )}
        <div className="space-y-2">
          {transactions.map((t) => (
            <div
              key={t.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-border bg-background p-3"
            >
              <div className="flex min-w-0 gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <CarFront size={20} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-fg">{t.shipment}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-fg-muted">
                    <LogIn size={12} className="text-fg-subtle" />
                    {t.start_time}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-fg-muted">
                    <LogOut size={12} className="text-fg-subtle" />
                    {t.end_time}
                  </p>
                  {t.trip && (
                    <span className="mt-1.5 inline-block rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                      {t.trip}
                    </span>
                  )}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-bold text-success tabular-nums">+ {peso(t.amount)}</p>
                <p className="mt-1.5 flex items-center justify-end gap-1 text-[11px] font-semibold text-success">
                  <CheckCircle2 size={12} />
                  Completed
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
