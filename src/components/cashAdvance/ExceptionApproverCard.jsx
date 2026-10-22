import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import SearchSelect from "../SearchSelect";
import { getAssignableUsers } from "../../api/users";
import {
  getExceptionApprover,
  setExceptionApprover,
} from "../../api/cashAdvanceSettings";

// Cash Advance Settings: who approves exceptions -- a request's last
// approver can ask to allow more than the policy (amount above the limit
// / longer repayment); it goes to this person. Blank = a superadmin.
export default function ExceptionApproverCard({ canEdit }) {
  const [users, setUsers] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getAssignableUsers()
      .then((list) => setUsers((list || []).filter((u) => u.is_active)))
      .catch(() => setUsers([]));
    getExceptionApprover()
      .then((data) => setSelectedId(data?.user_id ?? null))
      .catch(() => {});
  }, []);

  const label = (u) => (u ? `${u.employee_name || u.username} (${u.role})` : "");

  const save = async (userId) => {
    try {
      setSaving(true);
      const data = await setExceptionApprover(userId);
      setSelectedId(data?.user_id ?? null);
      toast.success(
        data?.name ? `${data.name} now approves exceptions.` : "Exceptions go to a superadmin.",
      );
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-3xl border border-border bg-surface p-5 shadow-sm">
      <h3 className="text-lg font-bold text-fg">Exception Approver</h3>
      <p className="mt-1 text-sm text-fg-subtle">
        For special cases, a request&apos;s last approver can ask to allow more than the
        policy above (e.g. ₱8,000 when the limit is ₱5,000, or a longer repayment) with a
        reason. That exception goes to this person. Leave blank for a superadmin.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="w-full max-w-sm">
          <SearchSelect
            value={users.find((u) => u.id === selectedId) || null}
            options={users}
            onChange={(u) => canEdit && save(u?.id ?? null)}
            getOptionLabel={label}
            placeholder="A superadmin (default)"
          />
        </div>
        {canEdit && selectedId && (
          <button
            type="button"
            disabled={saving}
            onClick={() => save(null)}
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-fg-muted hover:bg-surface-hover disabled:opacity-50"
          >
            Use a superadmin
          </button>
        )}
        {saving && <span className="text-xs text-fg-subtle">Saving...</span>}
      </div>
    </div>
  );
}
