// Kamar Signal — service worker v2
// Hanya cache APP SHELL (HTML/CSS/JS/ikon). JANGAN pernah cache data signal —
// semua request ke Supabase/API selalu diambil fresh dari network, tidak lewat sini.
  var SHELL_CACHE = 'kamar-signal-shell-v26';
var SHELL_FILES = [
  '/signal/',
  '/signal/index.html',
    '/signal/assets/css/kamar-signal.css?v=21',
    '/signal/assets/js/kamar-signal-app.js?v=26',
  '/signal/manifest.webmanifest'
];

self.addEventListener('install', function(event){
  self.skipWaiting();
  event.waitUntil(
    caches.open(SHELL_CACHE).then(function(cache){
      return cache.addAll(SHELL_FILES).catch(function(){});
    })
  );
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== SHELL_CACHE; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(event){
  var req = event.request;
  if(req.method !== 'GET') return;

  var url = new URL(req.url);

  // Jangan pernah campur tangan request ke Supabase, endpoint API, atau domain lain.
  if(url.origin !== self.location.origin) return;
  if(url.pathname.indexOf('/api/') === 0) return;

  // FIX 2026-08-23: request navigasi (load dokumen HTML utama, termasuk /signal/ dan
  // /signal/index.html) TIDAK PERNAH dicegat SW lagi -- dibiarkan lewat langsung ke
  // jaringan native browser tanpa event.respondWith() sama sekali. Alasan: ada kelas bug
  // WebKit/iOS di mana fetch() yang dipanggil DARI DALAM service worker bisa macet tanpa
  // pernah resolve/reject khusus utk request navigasi -- akibatnya event.respondWith()
  // tidak pernah selesai, browser akhirnya nyerah dan tampilkan error native "Safari
  // Tidak Dapat Membuka Halaman", SEBELUM sempat kamar-signal-app.js jalan sama sekali
  // (makanya watchdog di dalam JS aplikasi pun tidak pernah sempat muncul -- errornya
  // terjadi di layer network/SW, bukan di layer JS aplikasi). Membiarkan browser native
  // yang urus request dokumen adalah best-practice PWA yang direkomendasikan persis utk
  // menghindari kelas bug ini.
  if(req.mode === 'navigate') return;

  // Sisanya (asset statis JS/CSS/ikon di bawah /signal/) tetap network-first, TAPI
  // sekarang dibungkus timeout 8 detik supaya fetch() yang macet tidak pernah bikin
  // respondWith() nyangkut selamanya, dan fallback akhir tidak pernah resolve ke
  // undefined (yang sebelumnya bisa terjadi kalau caches.match() tidak ketemu apa-apa --
  // respondWith(undefined) dianggap error jaringan oleh browser).
  if(url.pathname.indexOf('/signal/') === 0){
    event.respondWith((function(){
      var timer;
      var timeoutPromise = new Promise(function(resolve){ timer = setTimeout(function(){ resolve(null); }, 8000); });
      return Promise.race([
        fetch(req).then(function(res){ clearTimeout(timer); return res; }),
        timeoutPromise
      ]).then(function(res){
        if(res && res.ok){
          var copy = res.clone();
          event.waitUntil(caches.open(SHELL_CACHE).then(function(cache){ return cache.put(req, copy); }));
          return res;
        }
        return caches.match(req).then(function(cached){ return cached || fetch(req); });
      }).catch(function(){
        return caches.match(req).then(function(cached){ return cached || fetch(req); });
      });
    })());
  }
});

// --- Notifikasi (additive, tidak mengubah cache app-shell di atas) ---
self.addEventListener('push', function(event){
  var data = {};
  try { data = event.data ? event.data.json() : {}; } catch(_e) {}
  var title = data.title || 'Kamar Signal';
  var options = {
    body: data.body || '',
    icon: '/signal/assets/icons/kamar-signal-icon-192-v3.png',
    badge: '/signal/assets/icons/kamar-signal-icon-192-v3.png',
    data: { url: data.url || '/signal/' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event){
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url) || '/signal/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(list){
      for (var i = 0; i < list.length; i++) {
        var c = list[i];
        if ('focus' in c) { c.navigate(url); return c.focus(); }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
