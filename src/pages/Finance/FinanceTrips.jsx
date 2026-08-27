// src/pages/Finance/FinanceTrips.jsx
import React, { useEffect, useState } from "react";

import {
  getFinanceTrips,
  getFinanceTripSummary,
} from "../../api/financeTrips/index";

import FinanceReviewCard from "../../components/financeTrips/FinanceReviewCard";

const FinanceTrips = () => {
  const [trips, setTrips] = useState([]);
  const [summary, setSummary] = useState({});
  const [activeTab, setActiveTab] = useState("finance_review");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadTrips = async (status) => {
    try {
      setError("");

      const [tripsResponse, summaryResponse] = await Promise.all([
        getFinanceTrips(status),
        getFinanceTripSummary(),
      ]);

      setTrips(tripsResponse.data);
      setSummary(summaryResponse.data);
    } catch (err) {
      console.error("Failed to load Finance trips:", err);

      setTrips([]);

      setError(
        err.response?.data?.detail || "Failed to load Finance trip data.",
      );
    }
  };

  useEffect(() => {
    const loadPage = async () => {
      setLoading(true);

      await loadTrips(activeTab);

      setLoading(false);
    };

    loadPage();
  }, [activeTab]);

  const handleTripApproved = async () => {
    await loadTrips(activeTab);

    setSuccessMessage("Trip approved — synced to attendance and payroll.");

    setTimeout(() => {
      setSuccessMessage("");
    }, 3000);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-gray-500">
        Loading trip data...
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-8 bg-gray-50 px-4 py-6 sm:px-6 lg:px-10">
      {successMessage && (
        <div className="rounded-xl border border-green-300 bg-green-100 px-4 py-3 text-green-800 shadow-sm">
          {successMessage}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-red-800 shadow-sm">
          {error}
        </div>
      )}

      <div>
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
          Finance Trip Review
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Verify Office-reviewed trips before they reflect on attendance and
          payroll.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs text-gray-500">For Finance Review</p>

          <p className="mt-1 text-2xl font-bold text-gray-900">
            {summary.finance_review_count ?? "—"}
          </p>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs text-gray-500">Approved</p>

          <p className="mt-1 text-2xl font-bold text-gray-900">
            {summary.approved_count ?? "—"}
          </p>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs text-gray-500">Total Trips</p>

          <p className="mt-1 text-2xl font-bold text-gray-900">
            {summary.total_count ?? "—"}
          </p>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs text-gray-500">Synced to Payroll</p>

          <p className="mt-1 text-2xl font-bold text-gray-900">
            {summary.synced_to_payroll_count ?? "—"}
          </p>
        </div>
      </div>

      <div>
        <div className="mb-4 flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("finance_review")}
            className={`rounded-lg px-4 py-2 ${
              activeTab === "finance_review"
                ? "bg-yellow-400 text-black"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            For Finance Review
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("approved")}
            className={`rounded-lg px-4 py-2 ${
              activeTab === "approved"
                ? "bg-yellow-400 text-black"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            Approved
          </button>
        </div>

        <FinanceReviewCard
          trips={trips}
          refreshTrips={handleTripApproved}
          mode={activeTab}
        />
      </div>
    </div>
  );
};

export default FinanceTrips;
