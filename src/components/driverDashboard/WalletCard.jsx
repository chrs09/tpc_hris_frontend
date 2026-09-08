import React, { useEffect, useState } from "react";
import { getWallet, getWalletCutoffs } from "../../api/driver/trips";

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
      } catch (error) {
        console.error("Failed to load wallet cutoffs:", error);
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

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 text-fg shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm text-fg-muted">Wallet Balance</p>

        {cutoffs.length > 0 && (
          <select
            value={selectedCutoff}
            onChange={(e) => setSelectedCutoff(e.target.value)}
            className="rounded-lg border border-border bg-surface-hover px-2 py-1 text-xs text-fg"
          >
            {cutoffs.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        )}
      </div>

      <p className="mt-2 text-3xl font-bold">
        {loading ? "..." : `₱${(wallet?.earnings ?? 0).toLocaleString()}`}
      </p>
      <p className="mt-1 text-xs text-fg-muted">
        {wallet?.trips ?? 0} confirmed trip{wallet?.trips === 1 ? "" : "s"} this
        cutoff
      </p>

      {!loading && (wallet?.expected_trips ?? 0) > 0 && (
        <div className="mt-3 rounded-xl bg-surface-hover p-3">
          <p className="text-xs text-fg-muted">
            Expected payment for this period ({wallet.expected_trips} trip
            {wallet.expected_trips === 1 ? "" : "s"})
          </p>
          <p className="text-lg font-bold text-warning">
            ₱{(wallet.expected_earnings ?? 0).toLocaleString()}
          </p>
        </div>
      )}

      <div className="mt-4 space-y-2">
        {!loading && (!wallet?.transactions || wallet.transactions.length === 0) && (
          <p className="rounded-xl bg-surface-hover p-3 text-center text-xs text-fg-muted">
            {wallet?.expected_trips
              ? "Trips are still pending finance review, so nothing is confirmed yet."
              : "No trips for this cutoff yet."}
          </p>
        )}

        {wallet?.transactions?.map((t) => (
          <div
            key={t.id}
            className="flex items-center justify-between rounded-xl bg-surface-hover p-3"
          >
            <div>
              <p className="text-sm font-medium text-fg">{t.shipment}</p>
              <p className="text-xs text-fg-subtle">
                {t.trip} • {t.start_time} - {t.end_time}
              </p>
            </div>
            <p className="text-sm font-semibold text-success">
              +₱{t.amount.toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
