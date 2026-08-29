const CACHE='nova-block-pwa-v6';
const SHELL=['./','./index.html','./manifest.webmanifest','./app-icon.svg','./icon-192.png','./icon-512.png','./apple-touch-icon.png','./nova-studios.svg','./nova-block-splash.svg','./game.css?v=5','./game.js?v=5','./offline.html'];

self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)));
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',event=>{
  const req=event.request;if(req.method!=='GET')return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    try{const fresh=await fetch(req);if(new URL(req.url).origin===location.origin)cache.put(req,fresh.clone());return fresh}
    catch{return await cache.match(req)||await cache.match('./index.html')}
  })());
});
