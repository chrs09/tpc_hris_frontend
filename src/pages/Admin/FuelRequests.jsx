import React, { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { X } from "lucide-react";
import SectionTabs from "../../components/ui/sectionTabs/SectionTabs";
import { promptDialog } from "../../components/ui/dialog/dialogService";
import usePagination from "../../hooks/usePagination";
import Pagination from "../../components/ui/pagination/Pagination";
import {
  completeFuelRequest,
  declineFuelRequest,
  getFuelRequest,
  getFuelRequests,
  issueFuelCode,
  returnFuelReceipt,
} from "../../api/fuelRequests";

const getErrorMessage = (error) =>
  error.response?.data?.detail || error.message || "Something went wrong.";

const inputStyles =
  "w-full rounded-xl border border-border bg-background p-3 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30";

const FUEL_STATUS = {
  pending: ["Waiting for Fuel Code", "bg-warning/15 text-warning"],
  issued: ["Fuel Code Issued", "bg-primary/15 text-primary"],
  returned: ["Receipt Sent Back", "bg-danger/15 text-danger"],
  receipt_submitted: ["Receipt Submitted", "bg-warning/15 text-warning"],
  completed: ["Completed", "bg-success/15 text-success"],
  declined: ["Declined", "bg-danger/15 text-danger"],
  cancelled: ["Cancelled", "bg-surface-active text-fg-muted"],
};

const FILTERS = [
  { key: "needs_action", label: "Needs Action" },
  { key: "open", label: "In Progress" },
  { key: "completed", label: "Completed" },
  { key: "declined", label: "Declined" },
  { key: "", label: "All" },
];

const StatusPill = ({ status }) => {
  const [label, classes] = FUEL_STATUS[status] || [
    status,
    "bg-surface-active text-fg-muted",
  ];
  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${classes}`}
    >
      {label}
    </span>
  );
};

// Coordinator admin's side of driver fuel requests: issue a fuel code +
// liters for a new request, then confirm (or send back) the receipt the
// driver uploads after fueling.
export default function FuelRequests() {
  const [filter, setFilter] = useState("needs_action");
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const load = useCallback(async () => {
    try {
      setRequests(await getFuelRequests(filter));
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  // ?view=<id> from the alert bell opens that request.
  useEffect(() => {
    const fromLink = Number(searchParams.get("view"));
    if (fromLink) {
      setOpenId(fromLink);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { page, setPage, totalPages, paginatedItems } = usePagination(
    requests,
    15,
  );

  const afterChange = async () => {
    await load();
    window.dispatchEvent(new Event("fuel-requests-changed"));
  };

  return (
    <div className="space-y-5">
      <SectionTabs group="Fleet Management" />

      <div>
        <h1 className="text-lg font-semibold text-fg sm:text-xl">
          Fuel Requests
        </h1>
        <p className="mt-1 text-sm text-fg-subtle">
          Drivers request fuel from the mobile app with an odometer photo,
          plate number and city. Issue a fuel code and liters, then confirm
          the receipt they send after fueling.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key || "all"}
            type="button"
            onClick={() => {
              setLoading(true);
              setFilter(f.key);
            }}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              filter === f.key
                ? "bg-primary text-primary-foreground"
                : "bg-surface-active text-fg-muted hover:text-fg"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-180 text-sm text-fg">
          <thead className="bg-surface-hover text-fg-muted">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Driver</th>
              <th className="px-4 py-3 text-left font-medium">Plate No.</th>
              <th className="px-4 py-3 text-left font-medium">City</th>
              <th className="px-4 py-3 text-left font-medium">Requested</th>
              <th className="px-4 py-3 text-left font-medium">Fuel Code</th>
              <th className="px-4 py-3 text-left font-medium">Liters</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" className="py-8 text-center text-fg-subtle">
                  Loading...
                </td>
              </tr>
            ) : paginatedItems.length === 0 ? (
              <tr>
                <td colSpan="8" className="py-8 text-center text-fg-subtle">
                  No fuel requests here.
                </td>
              </tr>
            ) : (
              paginatedItems.map((req) => (
                <tr
                  key={req.id}
                  className="border-t border-border hover:bg-surface-hover"
                >
                  <td className="px-4 py-3 font-medium">
                    {req.driver_name || "-"}
                  </td>
                  <td className="px-4 py-3">{req.plate_number}</td>
                  <td className="px-4 py-3 text-fg-muted">{req.city}</td>
                  <td className="px-4 py-3 text-fg-muted">{req.created_at}</td>
                  <td className="px-4 py-3">{req.fuel_code || "-"}</td>
                  <td className="px-4 py-3">
                    {req.liters != null ? `${req.liters} L` : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={req.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setOpenId(req.id)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                        ["pending", "receipt_submitted"].includes(req.status)
                          ? "bg-primary text-primary-foreground hover:bg-primary-hover"
                          : "border border-border text-fg hover:bg-surface-hover"
                      }`}
                    >
                      {req.status === "pending"
                        ? "Issue Code"
                        : req.status === "receipt_submitted"
                          ? "Check Receipt"
                          : "View"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      {openId && (
        <FuelRequestModal
          requestId={openId}
          onClose={() => setOpenId(null)}
          onChanged={afterChange}
        />
      )}
    </div>
  );
}

function FuelRequestModal({ requestId, onClose, onChanged }) {
  const [req, setReq] = useState(null);
  const [fuelCode, setFuelCode] = useState("");
  const [liters, setLiters] = useState("");
  const [busy, setBusy] = useState(false);
  const [zoomUrl, setZoomUrl] = useState(null);

  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getFuelRequest(requestId)
      .then((data) => {
        if (!cancelled) setReq(data);
      })
      .catch((error) => {
        if (cancelled) return;
        setLoadError(getErrorMessage(error));
        toast.error(getErrorMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, [requestId]);

  const run = async (action, successMessage) => {
    try {
      setBusy(true);
      const updated = await action();
      toast.success(successMessage);
      if (updated?.id) setReq(updated);
      await onChanged();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const handleIssue = () => {
    const value = Number(liters);
    if (!fuelCode.trim()) {
      toast.error("Enter the fuel code.");
      return;
    }
    if (!value || value <= 0) {
      toast.error("Enter the liters.");
      return;
    }
    run(
      () => issueFuelCode(req.id, fuelCode.trim(), value),
      "Fuel code sent to the driver.",
    );
  };

  const handleDecline = async () => {
    const reason = await promptDialog(
      "Decline this fuel request? The driver will see your reason. Reason (required):",
    );
    if (reason === null) return;
    if (!reason.trim()) {
      toast.error("A reason is required.");
      return;
    }
    run(() => declineFuelRequest(req.id, reason.trim()), "Request declined.");
  };

  const handleReturn = async () => {
    const reason = await promptDialog(
      "Send the receipt back? The driver will upload a new one. Reason (required):",
    );
    if (reason === null) return;
    if (!reason.trim()) {
      toast.error("A reason is required.");
      return;
    }
    run(() => returnFuelReceipt(req.id, reason.trim()), "Receipt sent back.");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-t-2xl border border-border bg-surface text-fg sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
              Fuel Request
            </p>
            <h2 className="text-lg font-bold">
              {req ? req.driver_name || "-" : "Loading..."}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {req && <StatusPill status={req.status} />}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-lg p-1.5 text-fg-muted hover:bg-surface-hover hover:text-fg"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {!req ? (
          <p className="py-10 text-center text-sm text-fg-subtle">
            {loadError || "Loading..."}
          </p>
        ) : (
          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[180px_1fr]">
              <PhotoThumb
                url={req.odo_photo_url}
                label="Odometer"
                onOpen={setZoomUrl}
              />
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <Info label="Plate number" value={req.plate_number} />
                <Info label="City" value={req.city} />
                <Info label="Driver" value={req.driver_name} />
                <Info label="Requested" value={req.created_at} />
              </dl>
            </div>

            {req.status === "pending" ? (
              <section className="space-y-3 rounded-xl border border-border p-4">
                <h3 className="text-sm font-semibold">Issue fuel code</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="sm:col-span-1">
                    <label className="mb-1 block text-xs font-medium text-fg-subtle">
                      Plate number
                    </label>
                    <input
                      value={req.plate_number}
                      readOnly
                      className={`${inputStyles} cursor-not-allowed opacity-70`}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-fg-subtle">
                      Fuel code
                    </label>
                    <input
                      value={fuelCode}
                      onChange={(e) => setFuelCode(e.target.value)}
                      className={inputStyles}
                      placeholder="e.g. FC-7781"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-fg-subtle">
                      Volume (liters)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={liters}
                      onChange={(e) => setLiters(e.target.value)}
                      className={inputStyles}
                      placeholder="e.g. 45"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleDecline}
                    className="rounded-xl border border-danger/30 px-4 py-2.5 text-sm font-medium text-danger hover:bg-danger/10 disabled:opacity-50"
                  >
                    Decline
                  </button>
                  <button
                    type="button"
                    disabled={busy || !fuelCode.trim() || !liters}
                    onClick={handleIssue}
                    className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
                  >
                    {busy ? "Sending..." : "Send to Driver"}
                  </button>
                </div>
              </section>
            ) : (
              req.fuel_code && (
                <section className="grid grid-cols-2 gap-3 rounded-xl bg-surface-hover p-4 text-sm">
                  <Info label="Fuel code" value={req.fuel_code} />
                  <Info
                    label="Liters"
                    value={req.liters != null ? `${req.liters} L` : null}
                  />
                  <Info
                    label="Issued"
                    value={
                      req.issued_by ? `${req.issued_by} · ${req.issued_at}` : null
                    }
                  />
                </section>
              )
            )}

            {req.receipt_photo_url && (
              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Receipt</h3>
                <div className="flex items-start gap-4">
                  <PhotoThumb
                    url={req.receipt_photo_url}
                    label="Receipt"
                    onOpen={setZoomUrl}
                  />
                  <p className="text-xs text-fg-subtle">
                    Sent {req.receipt_submitted_at}
                  </p>
                </div>
                {req.status === "receipt_submitted" && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={handleReturn}
                      className="rounded-xl border border-danger/30 px-4 py-2.5 text-sm font-medium text-danger hover:bg-danger/10 disabled:opacity-50"
                    >
                      Send Back
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        run(
                          () => completeFuelRequest(req.id),
                          "Fuel request completed.",
                        )
                      }
                      className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
                    >
                      Confirm Receipt (Complete)
                    </button>
                  </div>
                )}
              </section>
            )}

            {req.note && (
              <p
                className={`rounded-xl border px-4 py-3 text-sm ${
                  req.status === "declined" || req.status === "returned"
                    ? "border-danger/30 bg-danger/10"
                    : "border-border"
                }`}
              >
                <span className="font-semibold">
                  {req.status === "declined" ? "Declined: " : "Sent back: "}
                </span>
                {req.note}
              </p>
            )}

            {req.completed_by && (
              <p className="text-xs text-fg-subtle">
                {req.status === "declined" ? "Declined" : "Completed"} by{" "}
                {req.completed_by} · {req.completed_at}
              </p>
            )}
          </div>
        )}
      </div>

      {zoomUrl && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 p-4"
          onMouseDown={() => setZoomUrl(null)}
        >
          <img
            src={zoomUrl}
            alt=""
            className="max-h-full max-w-full rounded-lg object-contain"
          />
        </div>
      )}
    </div>
  );
}

const Info = ({ label, value }) => (
  <div className="min-w-0">
    <dt className="text-xs text-fg-subtle">{label}</dt>
    <dd className="mt-0.5 break-words font-medium">{value || "-"}</dd>
  </div>
);

const PhotoThumb = ({ url, label, onOpen }) => (
  <button
    type="button"
    onClick={() => onOpen(url)}
    title={`View ${label} photo`}
    className="block"
  >
    <img
      src={url}
      alt={label}
      className="h-36 w-full rounded-xl border border-border object-cover hover:opacity-90 sm:w-44"
    />
    <span className="mt-1 block text-left text-xs text-fg-subtle">
      {label} photo
    </span>
  </button>
);
