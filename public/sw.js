self.addEventListener("install", () => {
  console.log("Service Worker Installed");
  self.skipWaiting();
});

self.addEventListener("activate", () => {
  console.log("Service Worker Activated");
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Only handle requests from your own domain
  if (url.origin === location.origin) {
    event.respondWith(fetch(event.request));
  }
});