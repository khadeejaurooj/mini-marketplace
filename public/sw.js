// Minimal service worker: needed so Android/Chrome treats the site as an
// installable app. It does not cache anything (always uses the live
// network), so buyers never see stale prices or orders.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
