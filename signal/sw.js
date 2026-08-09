// Kamar Signal — service worker v1
// Hanya cache APP SHELL (HTML/CSS/JS/ikon). JANGAN pernah cache data signal —
// semua request ke Supabase/API selalu diambil fresh dari network, tidak lewat sini.
var SHELL_CACHE = 'kamar-signal-shell-v1';
var SHELL_FILES = [
  '/signal/',
  '/signal/index.html',
  '/signal/assets/css/kamar-signal.css',
  '/signal/assets/js/kamar-signal-app.js',
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

  // Hanya app-shell (file statis di bawah /signal/) yang boleh cache-first.
  if(url.pathname.indexOf('/signal/') === 0){
    event.respondWith(
      caches.match(req).then(function(cached){
        var network = fetch(req).then(function(res){
          if(res && res.ok){
            var copy = res.clone();
            caches.open(SHELL_CACHE).then(function(cache){ cache.put(req, copy); });
          }
          return res;
        }).catch(function(){ return cached; });
        return cached || network;
      })
    );
  }
});
