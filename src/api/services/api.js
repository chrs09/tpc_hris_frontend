import axios from "axios";
import { API_URL } from "../config";

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
