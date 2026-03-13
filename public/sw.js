// self.addEventListener("install", () => {
//   console.log("Service Worker Installed");
//   self.skipWaiting();
// });

// self.addEventListener("activate", () => {
//   console.log("Service Worker Activated");
// });

// self.addEventListener("fetch", (event) => {
//   const url = new URL(event.request.url);

//   // Ignore external domains like S3
//   if (url.origin !== self.location.origin) {
//     return;
//   }

//   event.respondWith(fetch(event.request));
// });