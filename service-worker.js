// Kamar Kajian Market - service worker minimal (PWA installability, Fase 5)
// Sengaja TIDAK dibuat offline-first / cache-first: situs ini sering di-update
// (admin panel, harga, konten), jadi strategi di sini NETWORK-FIRST -- selalu
// coba ambil versi terbaru dari server dulu, cache cuma dipakai sebagai fallback
// kalau device sedang offline. Tujuannya cuma memenuhi syarat "installable PWA"
// (browser butuh service worker aktif + manifest dengan icons), bukan bikin
// pengalaman offline penuh.

var CACHE_NAME = 'kamar-shell-v2';

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
  var req = event.request;
  // FIX 2026-08-23: SW root ini sebelumnya intercept SEMUA request GET tanpa batas waktu.
  // Di WebKit/iOS, fetch() yang dipanggil DARI DALAM fetch handler service worker kadang
  // hang selamanya (tidak pernah resolve/reject), terutama utk request navigasi (buka halaman).
  // Kalau event.respondWith() tidak pernah selesai, browser akhirnya nampilkan error native
  // "Tidak Dapat Membuka Halaman" -- ini kejadian sebelum JS halaman sempat jalan sama sekali.
  // Sudah pernah diperbaiki di signal/sw.js dengan pola yang sama; SW root ini terlewat.
  if(req.mode === 'navigate') return; // biarkan browser handle navigasi native, jangan diintercept
  event.respondWith((function(){
    var timer;
    var timeoutPromise = new Promise(function(resolve){ timer = setTimeout(function(){ resolve(null); }, 8000); });
    return Promise.race([
      fetch(req).then(function(response){ clearTimeout(timer); return response; }),
      timeoutPromise
    ]).then(function(response){
      if(response && response.ok){
        var copy = response.clone();
        caches.open(CACHE_NAME).then(function(cache){ cache.put(req, copy); }).catch(function(){});
        return response;
      }
      return caches.match(req).then(function(cached){ return cached || fetch(req); });
    }).catch(function(){
      return caches.match(req).then(function(cached){ return cached || fetch(req); });
    });
  })());
});

