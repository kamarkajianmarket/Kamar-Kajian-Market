// Kamar Kajian Market - service worker minimal (PWA installability, Fase 5)
// Sengaja TIDAK dibuat offline-first / cache-first: situs ini sering di-update
// (admin panel, harga, konten), jadi strategi di sini NETWORK-FIRST -- selalu
// coba ambil versi terbaru dari server dulu, cache cuma dipakai sebagai fallback
// kalau device sedang offline. Tujuannya cuma memenuhi syarat "installable PWA"
// (browser butuh service worker aktif + manifest dengan icons), bukan bikin
// pengalaman offline penuh.

var CACHE_NAME = 'kamar-shell-v1';

self.addEventListener('install', function(event){
  self.skipWaiting();
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE_NAME; }).map(function(k){ return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(event){
  if(event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).then(function(response){
      var copy = response.clone();
      caches.open(CACHE_NAME).then(function(cache){ cache.put(event.request, copy); }).catch(function(){});
      return response;
    }).catch(function(){
      return caches.match(event.request);
    })
  );
});

