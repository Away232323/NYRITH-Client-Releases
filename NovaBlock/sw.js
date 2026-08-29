const CACHE='nova-block-pwa-v1';
const SHELL=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./apple-touch-icon.png','./offline.html'];

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
  if(url.hostname.endsWith('chatgpt.site'))return;
  event.respondWith((async()=>{
    try{
      const fresh=await fetch(req);
      if(url.origin===location.origin){
        const cache=await caches.open(CACHE);
        cache.put(req,fresh.clone());
      }
      return fresh;
    }catch(e){
      const cached=await caches.match(req);
      return cached||caches.match('./offline.html');
    }
  })());
});
