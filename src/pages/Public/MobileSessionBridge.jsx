import React, { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

// Lets the mobile app hand off an already-logged-in session to a page
// opened in the device's browser (via expo-web-browser), instead of
// making the driver log in again -- e.g. tytan_mobile's Cash Advance
// screen opens `${WEB_URL}/mobile-session?...&next=/dashboard/cash-advance`
// with its own current tokens. This mirrors the same localStorage keys
// src/utils/impersonation.js swaps for "View As", just sourced from the
// URL instead of an API response.
//
// A hard reload (not client-side navigation) is used on purpose -- App's
// isAuthenticated state is only read once at mount, so a plain
// navigate() here would land on the target route still treated as
// logged out.
const SESSION_KEYS = [
  "access_token",
  "refresh_token",
  "role",
  "user_id",
  "username",
  "expires_at",
  "refresh_expires_at",
];

const MobileSessionBridge = () => {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("access_token");

    if (!token) {
      window.location.replace("/login");
      return;
    }

    // Every key is either set from the URL or explicitly cleared -- never
    // left as whatever this browser profile happened to have before, since
    // a stale refresh_token from an earlier, different web login on this
    // same device/browser must not carry over into this handed-off session.
    SESSION_KEYS.forEach((key) => {
      const value = searchParams.get(key);
      if (value) {
        localStorage.setItem(key, value);
      } else {
        localStorage.removeItem(key);
      }
    });

    localStorage.setItem("must_change_password", "false");

    const next = searchParams.get("next") || "/dashboard";
    window.location.replace(next);
  }, [searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-fg-subtle">
      Signing you in...
    </div>
  );
};

export default MobileSessionBridge;
