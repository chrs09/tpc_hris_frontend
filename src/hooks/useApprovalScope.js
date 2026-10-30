import { useMemo, useState } from "react";

// Is this request's turn with the logged-in user? Trips say so themselves
// (for_me, app/services/approval_chain.py trips_for_me); other requests by
// whose turn it is on their Org Chart chain. No chain = nobody's assigned
// (not set up on the Org Chart), so it counts for whoever can act on it.
export const isForMe = (item) => {
  if (item.for_me !== undefined) return item.for_me;
  if (!item.approval_steps?.length) return true;
  return Number(item.current_approver_id) === Number(localStorage.getItem("user_id"));
};

// "For me" / "All" on an approval list -- opens on what's waiting on this
// user; a superadmin (or anyone who sees more) can switch to everything.
// `enabled` false = show the whole list (e.g. a list of finished requests).
export default function useApprovalScope(items = [], enabled = true) {
  const [scope, setScope] = useState("me");
  const forMe = useMemo(() => items.filter(isForMe), [items]);
  const applies = enabled && forMe.length !== items.length;
  return {
    scoped: applies && scope === "me" ? forMe : items,
    scopeProps: { applies, scope, onChange: setScope, forMeCount: forMe.length, allCount: items.length },
  };
}
