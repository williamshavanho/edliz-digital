const CACHE = 'edliz-shell-v12';
const shell = ['/', '/manifest.json', '/icon-192.png', '/icon-512.png'];

function appAsset(raw) {
  const url = new URL(raw, self.location.origin);
  return url.origin === self.location.origin &&
    /\.(?:css|m?js|woff2?)(?:$)/i.test(url.pathname) && url.pathname !== '/sw.js';
}

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(shell)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(key => key.startsWith('edliz-shell-') && key !== CACHE).map(key => caches.delete(key)))
  ).then(() => self.clients.claim()));
});

self.addEventListener('message', event => {
  if (event.data?.type !== 'cache-shell' || !event.ports[0]) return;
  const assets = Array.isArray(event.data.assetUrls) ? event.data.assetUrls.filter(appAsset) : [];
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll([...new Set([...shell, ...assets])]))
    .then(() => event.ports[0].postMessage('ready'), () => event.ports[0].postMessage('error')));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  const navigation = request.mode === 'navigate' && new URL(request.url).pathname === '/';
  if (!navigation && !appAsset(request.url)) return;
  const fetchAndCache = async () => {
    const cache = await caches.open(CACHE);
    try {
      const response = await fetch(request);
      if (response.ok && !response.redirected) await cache.put(navigation ? '/' : request, response.clone());
      return response;
    } catch {
      return await cache.match(navigation ? '/' : request) || Response.error();
    }
  };
  event.respondWith(fetchAndCache());
});
