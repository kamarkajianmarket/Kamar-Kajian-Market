// Kamar Signal — service worker v2
// Hanya cache APP SHELL (HTML/CSS/JS/ikon). JANGAN pernah cache data signal —
// semua request ke Supabase/API selalu diambil fresh dari network, tidak lewat sini.
  var SHELL_CACHE = 'kamar-signal-shell-v35';
var SHELL_FILES = [
  '/signal/',
  '/signal/index.html',
    '/signal/assets/css/kamar-signal.css?v=30',
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
  // FIX 2026-08-23 (nuklir): signal/sw.js SEKARANG TIDAK PERNAH intercept fetch APAPUN.
  // Setelah beberapa fix bertingkat (navigate-bypass, timeout wrapper) TETAP gagal di
  // device iOS asli (bahkan setelah clear semua data situs + fresh install), padahal
  // homepage (dikontrol SW root yang beda) normal -- kesimpulan: SW /signal/ inilah
  // satu-satunya perbedaan arsitektur signifikan antara halaman yang jalan vs macet.
  // /signal/ memuat lebih banyak script (supabase-js CDN, kamar-config, kamar-supabase,
  // kamar-signal-app) yang SEMUA dicegat SW ini sekaligus -- kemungkinan WebKit iOS
  // tidak sanggup proses banyak fetch yang dicegat SW secara bersamaan tanpa macet/lambat
  // parah, walau masing-masing sudah dikasih timeout 8 detik individual.
  // SW ini TETAP terdaftar (supaya syarat PWA installable tetap terpenuhi), tapi TIDAK
  // PERNAH lagi ikut campur di request apapun -- browser native yang urus semuanya,
  // sama seperti halaman lain yang sudah terbukti normal.
  return;
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
