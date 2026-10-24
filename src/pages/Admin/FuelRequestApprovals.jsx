import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  getFuelForMyApproval,
  rejectFuelRequest,
} from "../../api/fuelRequests";
import ApprovalProgress from "../../components/approvals/ApprovalProgress";
import ApprovedBy from "../../components/approvals/ApprovedBy";
import { promptDialog } from "../../components/ui/dialog/dialogService";
import SearchInput from "../../components/ui/searchInput/SearchInput";
import { usePageCanEdit } from "../../hooks/usePageCanEdit";
import { matchesSearch } from "../../utils/search";
import { FuelRequestModal } from "./FuelRequests";

// Approvals -> Fuel Request: Org Chart heads with "Fuel Request" ticked
// approve a driver's request before the coordinator issues the fuel code
// (app/api/fuel_requests.py). Superadmin sees every one still waiting.
export default function FuelRequestApprovals() {
  const canEditPage = usePageCanEdit();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState(null);
  const [search, setSearch] = useState("");
  const [zoomUrl, setZoomUrl] = useState(null);
  // Approve opens the request: approve, then issue the fuel code there.
  const [openId, setOpenId] = useState(null);

  const load = useCallback(() => {
    return getFuelForMyApproval()
      .then(setRequests)
      .catch((error) =>
        toast.error(error.response?.data?.detail || "Failed to load fuel requests."),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleReject = async (id) => {
    const reason = await promptDialog("Reason for rejecting this fuel request:");
    if (reason === null) return;
    if (!reason.trim()) {
      toast.error("A reason is required.");
      return;
    }
    try {
      setActioningId(id);
      await rejectFuelRequest(id, reason.trim());
      toast.success("Fuel request rejected.");
      load();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to reject.");
    } finally {
      setActioningId(null);
    }
  };

  const filtered = requests.filter((r) =>
    matchesSearch(search, r.driver_name, r.plate_number, r.city),
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-fg">Fuel Requests</h1>
          <p className="text-sm text-fg-subtle">
            Approve before the coordinator issues the fuel code.
          </p>
        </div>
        <SearchInput value={search} onChange={setSearch} placeholder="Search driver, plate, city..." />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-surface-hover text-fg-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Driver</th>
              <th className="px-4 py-3 font-medium">Plate No.</th>
              <th className="px-4 py-3 font-medium">City</th>
              <th className="px-4 py-3 font-medium">Odometer</th>
              <th className="px-4 py-3 font-medium">Requested</th>
              <th className="px-4 py-3 font-medium">Approval</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-fg-muted">
                  Loading...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-fg-muted">
                  No fuel requests waiting for your approval.
                </td>
              </tr>
            ) : (
              filtered.map((req) => (
                <tr key={req.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-fg">{req.driver_name || "—"}</td>
                  <td className="px-4 py-3 text-fg-muted">{req.plate_number}</td>
                  <td className="px-4 py-3 text-fg-muted">{req.city}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {req.odo_photo_url && (
                        <button
                          type="button"
                          onClick={() => setZoomUrl(req.odo_photo_url)}
                          title="View odometer photo"
                        >
                          <img
                            src={req.odo_photo_url}
                            alt="Odometer"
                            className="h-10 w-10 rounded-lg border border-border object-cover"
                          />
                        </button>
                      )}
                      <span className="text-fg-muted">
                        {req.odometer_reading != null
                          ? `${Number(req.odometer_reading).toLocaleString()} km`
                          : "—"}
                      </span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-fg-muted">{req.created_at}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-warning/15 px-3 py-1 text-xs font-semibold text-warning">
                      Awaiting approval
                    </span>
                    <ApprovalProgress steps={req.approval_steps} className="mt-2" />
                    <ApprovedBy log={req.approval_log} className="mt-1" />
                    {req.can_act === false && (
                      <p className="mt-1 text-[11px] text-fg-muted">
                        You&apos;re marked {req.viewer_away || "away"} today -- you
                        can&apos;t approve or reject it today.
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {canEditPage && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setOpenId(req.id)}
                          disabled={actioningId === req.id || req.can_act === false}
                          className="rounded-lg bg-success px-3 py-1 text-xs font-semibold text-success-foreground disabled:opacity-50"
                        >
                          Approve &amp; Issue
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReject(req.id)}
                          disabled={actioningId === req.id || req.can_act === false}
                          className="rounded-lg bg-danger px-3 py-1 text-xs font-semibold text-danger-foreground disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {openId && (
        <FuelRequestModal
          requestId={openId}
          onClose={() => setOpenId(null)}
          onChanged={load}
        />
      )}

      {zoomUrl && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setZoomUrl(null)}
        >
          <img src={zoomUrl} alt="Odometer" className="max-h-[85vh] max-w-[90vw] rounded-xl" />
        </div>
      )}
    </div>
  );
}
