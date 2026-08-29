const CACHE='nova-block-pwa-v4';
const SHELL=['./','./index.html','./game.css?v=3','./game.js?v=3','./manifest.webmanifest','./app-icon.svg','./icon-192.png','./icon-512.png','./apple-touch-icon.png','./nova-studios.svg','./nova-block-splash.svg'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)))});
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const k of await caches.keys())if(k!==CACHE)await caches.delete(k);await self.clients.claim()})()));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith((async()=>{const cache=await caches.open(CACHE);try{const fresh=await fetch(e.request);if(new URL(e.request.url).origin===location.origin)cache.put(e.request,fresh.clone());return fresh}catch{return await cache.match(e.request)||await cache.match('./index.html')}})())});
