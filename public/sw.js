// Minimal service worker — enables PWA installability (Android/Chrome require one).
// Network-first passthrough; no offline caching to avoid stale realtime data.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
