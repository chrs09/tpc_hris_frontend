import axios from "axios";
import { API_URL } from "../config";
import { isImpersonating } from "../../utils/impersonation";

const api = axios.create({
  baseURL: API_URL,
});

// ✅ Attach token automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

/*
 * Global "network is busy" signal.
 *
 * Every request made through this shared axios instance bumps a counter
 * and fires a window event with the new count. <GlobalLoadingBar/> (mounted
 * once in App.jsx) listens for this and shows a top progress bar whenever
 * count > 0 - so any page making a request the user is waiting on gets a
 * loading indicator for free, without each page having to wire up its own.
 * This does not replace a page's own local loading state (e.g. a button's
 * "Saving..." label) - it's a page-wide "something is happening" cue.
 */
let activeRequestCount = 0;

const notifyLoadingChange = () => {
  window.dispatchEvent(
    new CustomEvent("api-loading-change", {
      detail: { count: activeRequestCount },
    }),
  );
};

api.interceptors.request.use((config) => {
  activeRequestCount += 1;
  notifyLoadingChange();

  return config;
});

const settleRequest = () => {
  activeRequestCount = Math.max(activeRequestCount - 1, 0);
  notifyLoadingChange();
};

// While a superadmin is "viewing as" another user, that session is
// strictly read-only: live data loads normally (GET requests pass
// through untouched), but any request that would change something is
// blocked here before it leaves the browser. The rejected error mimics
// the shape backend error responses already have (`err.response.data.detail`)
// so every existing `catch` block's toast shows this message for free,
// with no per-page changes needed.
const READ_ONLY_METHODS = new Set(["get", "head", "options"]);

api.interceptors.request.use((config) => {
  const method = (config.method || "get").toLowerCase();
  if (isImpersonating() && !READ_ONLY_METHODS.has(method)) {
    const blockedError = new Error("Viewing in read-only mode.");
    blockedError.response = {
      status: 403,
      data: {
        detail:
          "You're viewing this account in read-only mode. Return to your own account to make changes.",
      },
    };
    return Promise.reject(blockedError);
  }
  return config;
});

// ✅ Global response interceptor
api.interceptors.response.use(
  (response) => {
    settleRequest();
    return response;
  },
  (error) => {
    settleRequest();

    if (error.response?.status === 401) {
      window.dispatchEvent(new Event("session-expired"));
    }

    return Promise.reject(error);
  },
);

export default api;
