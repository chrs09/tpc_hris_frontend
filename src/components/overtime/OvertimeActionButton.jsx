import React, { useEffect, useState } from "react";
import { getOvertimeEligibility } from "../../api/overtimeRequests";
import FileOvertimeModal from "./FileOvertimeModal";
import FinishOvertimeModal from "./FinishOvertimeModal";

// Employee dashboard overtime action. Overtime is filed (no clock in/out):
// "File Overtime" for today or yesterday. An overtime still open from the
// old clock-in flow gets "Enter Time Out" so it can be finished.
export default function OvertimeActionButton({ onChanged }) {
  const [openRequest, setOpenRequest] = useState(null);
  const [suggestedTimeOut, setSuggestedTimeOut] = useState(null);
  const [showFileModal, setShowFileModal] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);

  const loadOpenRequest = () =>
    getOvertimeEligibility()
      .then((data) => {
        setOpenRequest(data.state === "ongoing" ? data.request : null);
        setSuggestedTimeOut(data.suggested_time_out || null);
      })
      .catch((error) => {
        console.error("Failed to check for open overtime:", error);
      });

  useEffect(() => {
    getOvertimeEligibility()
      .then((data) => {
        setOpenRequest(data.state === "ongoing" ? data.request : null);
        setSuggestedTimeOut(data.suggested_time_out || null);
      })
      .catch((error) => {
        console.error("Failed to check for open overtime:", error);
      });
  }, []);

  const refreshAll = async () => {
    await loadOpenRequest();
    onChanged?.();
  };

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {openRequest && (
        <button
          onClick={() => setShowFinishModal(true)}
          className="rounded-lg bg-warning px-4 py-2 text-xs font-semibold text-warning-foreground"
          title={`Overtime from ${openRequest.ot_date} was never clocked out`}
        >
          Enter Time Out
        </button>
      )}
      <button
        onClick={() => setShowFileModal(true)}
        className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
      >
        File Overtime
      </button>

      {showFileModal && (
        <FileOvertimeModal
          onClose={() => setShowFileModal(false)}
          onFiled={refreshAll}
        />
      )}
      {showFinishModal && openRequest && (
        <FinishOvertimeModal
          request={openRequest}
          suggestedTimeOut={suggestedTimeOut}
          onClose={() => setShowFinishModal(false)}
          onDone={refreshAll}
        />
      )}
    </div>
  );
}
