const CACHE='nova-block-pwa-v5';
const SHELL=['./','./index.html','./manifest.webmanifest','./app-icon.svg','./icon-192.png','./icon-512.png','./apple-touch-icon.png','./nova-studios.svg','./nova-block-splash.svg','./game.css?v=4','./game.js?v=4','./offline.html'];

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
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==location.origin)return;
  event.respondWith((async()=>{
    try{
      const fresh=await fetch(req,{cache:'no-store'});
      const cache=await caches.open(CACHE);
      cache.put(req,fresh.clone());
      return fresh;
    }catch(e){
      return (await caches.match(req)) || (await caches.match('./offline.html'));
    }
  })());
});
