// Superadmin "View As" support: swaps localStorage over to an
// impersonated user's session, stashing the superadmin's own session
// under an "impersonator_" prefix so it can be restored exactly as it
// was. No backend refresh-token auto-refresh currently reads these
// values elsewhere, so a plain key swap is safe. Writes are blocked
// centrally in api/services/api.js for as long as this session is active,
// so the impersonated view is live but strictly read-only.

const IMPERSONATOR_PREFIX = "impersonator_";

const SESSION_KEYS = [
  "access_token",
  "refresh_token",
  "role",
  "user_id",
  "username",
  "expires_at",
  "refresh_expires_at",
  "must_change_password",
];

export const isImpersonating = () =>
  Boolean(localStorage.getItem(`${IMPERSONATOR_PREFIX}access_token`));

export const getImpersonatorUsername = () =>
  localStorage.getItem(`${IMPERSONATOR_PREFIX}username`);

// Called right after POST /users/{id}/impersonate succeeds.
export const startImpersonation = (data) => {
  SESSION_KEYS.forEach((key) => {
    const current = localStorage.getItem(key);
    if (current !== null) {
      localStorage.setItem(`${IMPERSONATOR_PREFIX}${key}`, current);
    }
  });

  localStorage.setItem("access_token", data.access_token || "");
  localStorage.removeItem("refresh_token"); // impersonation sessions don't auto-refresh
  localStorage.setItem("role", data.role || "");
  localStorage.setItem("user_id", data.user_id || "");
  localStorage.setItem("username", data.username || "");
  localStorage.setItem("expires_at", data.expires_at || "");
  localStorage.removeItem("refresh_expires_at");
  localStorage.setItem("must_change_password", "false");
};

// Restores the superadmin's own session that was stashed above.
export const stopImpersonation = () => {
  SESSION_KEYS.forEach((key) => {
    const stashedKey = `${IMPERSONATOR_PREFIX}${key}`;
    const stashed = localStorage.getItem(stashedKey);
    if (stashed !== null) {
      localStorage.setItem(key, stashed);
    } else {
      localStorage.removeItem(key);
    }
    localStorage.removeItem(stashedKey);
  });
};
