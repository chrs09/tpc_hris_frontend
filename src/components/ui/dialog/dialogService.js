// Minimalist SweetAlert-style replacement for native alert()/confirm()/prompt().
// A single <DialogHost /> (mounted once in App.jsx) subscribes to this module-level
// emitter and renders whichever dialog is currently requested, so any file can just
// call these functions and `await` the result exactly like the native globals did.

let listener = null;

const request = (config) => {
  return new Promise((resolve) => {
    if (!listener) {
      // Host not mounted yet (shouldn't happen in practice) -- resolve with a
      // safe default rather than hanging forever.
      resolve(config.type === "confirm" ? false : config.type === "prompt" ? null : undefined);
      return;
    }
    listener({ ...config, resolve });
  });
};

export const subscribeDialogHost = (fn) => {
  listener = fn;
  return () => {
    if (listener === fn) listener = null;
  };
};

export const alertDialog = (message, options = {}) =>
  request({ type: "alert", message, ...options });

export const confirmDialog = (message, options = {}) =>
  request({ type: "confirm", message, ...options });

export const promptDialog = (message, defaultValue = "", options = {}) =>
  request({ type: "prompt", message, defaultValue, ...options });
