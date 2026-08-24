/* Kamar Signal — boot/login (file kecil, v1)
   Tujuan: file INI HANYA menangani cek koneksi Supabase, cek sesi, tampilkan
   form login (kalau belum login), dan proses login. Begitu sesi valid
   (baru login ATAU sudah pernah login sebelumnya), file ini memuat
   kamar-signal-main.js (file besar: dashboard, daftar signal, rekap, dll)
   lalu berhenti campur tangan sepenuhnya.

   Alasan dipisah dari kamar-signal-app.js (sekarang kamar-signal-main.js):
   investigasi 2026-08-23/24 membuktikan lewat bisection bertahap
   (signal-diag.html, signal-diag2.html, signal-diag3.html) bahwa sebagian
   iPhone/iPad mengalami freeze CPU total (BUKAN network hang, BUKAN parse
   error -- terbukti fetch teks file itu sendiri sukses dan new Function()
   berhasil PARSE, macetnya baru terjadi saat file itu benar-benar
   DIEKSEKUSI) persis ketika kamar-signal-app.js dijalankan. Akar pasti
   belum ketemu meski sudah diperiksa mendalam (bukan while/setInterval,
   bukan regex ReDoS yang jelas, bukan realtime karena belum approved pun
   sudah macet). File kecil ini membuat alur login tetap bisa jalan tanpa
   perlu mengeksekusi ~2000 baris kode dashboard sekaligus di awal --
   sambil kemungkinan tetap ada risiko macet yang sama saat file besar
   dimuat setelah login, karena baris pastinya belum terkonfirmasi. */
(function(){
  'use strict';

  var el = document.getElementById('ksigRoot');
  var __ksigT0 = Date.now();
  var __ksigLogEl = null;
  function dbg(msg){
    try{
      __ksigLogEl = __ksigLogEl || document.getElementById('__ksigDebugLog');
      if(!__ksigLogEl){
        __ksigLogEl = document.createElement('div');
        __ksigLogEl.id = '__ksigDebugLog';
        __ksigLogEl.style.cssText = 'position:fixed;left:0;right:0;bottom:0;max-height:45vh;overflow:auto;background:rgba(0,0,0,.92);color:#0f0;font:10px/1.4 monospace;padding:8px;z-index:2147483647;pointer-events:none;white-space:pre-wrap;word-break:break-all;';
        (document.body||document.documentElement).appendChild(__ksigLogEl);
      }
      var line = document.createElement('div');
      line.textContent = '[boot ' + (Date.now()-__ksigT0) + 'ms] ' + msg;
      __ksigLogEl.appendChild(line); __ksigLogEl.scrollTop = __ksigLogEl.scrollHeight;
    }catch(e){}
  }
  dbg('script kamar-signal-boot.js mulai jalan');

  var __settled = false;
  var state = { client: null, user: null };

  function esc(s){
    return String(s==null?'':s).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  function renderBoot(msg){
    el.innerHTML = '<div class="ksig-boot"><div class="ksig-boot-mark">Kamar Signal</div><div class="ksig-boot-sub">'+esc(msg)+'</div></div>';
  }
  function renderBootError(msg){
    __settled = true;
    el.innerHTML = '<div class="ksig-boot"><div class="ksig-boot-mark">Kamar Signal</div><div class="ksig-error"><p>'+esc(msg)+'</p><button class="ksig-btn primary" onclick="location.reload()">Coba Lagi</button></div></div>';
  }

  function loadMainApp(){
    __settled = true;
    dbg('sesi valid, memuat kamar-signal-main.js (file besar)');
    var s = document.createElement('script');
    s.src = '/signal/assets/js/kamar-signal-main.js?v=1';
    s.onerror = function(){
      dbg('GAGAL memuat kamar-signal-main.js');
      renderBootError('Gagal memuat Kamar Signal. Coba Muat Ulang.');
    };
    document.body.appendChild(s);
  }

  function renderLogin(){
    __settled = true;
    el.innerHTML =
      '<div class="ksig-main">'+
      '<div class="ksig-center-card">'+
        '<h1>Kamar Signal</h1>'+
        '<p>Masuk dengan akun member Kamar Kajian Market Anda untuk melihat kajian signal.</p>'+
        '<form id="ksigLoginForm">'+
          '<div class="ksig-field"><label>Email</label><input type="email" id="ksigEmail" autocomplete="username" required/></div>'+
          '<div class="ksig-field"><label>Password</label><input type="password" id="ksigPassword" autocomplete="current-password" required/></div>'+
          '<div class="ksig-status-line" id="ksigLoginStatus"></div>'+
          '<button type="submit" class="ksig-btn primary block" id="ksigLoginBtn">Masuk</button>'+
        '</form>'+
      '</div>'+
      '</div>';
    var form = document.getElementById('ksigLoginForm');
    form.addEventListener('submit', function(e){
      e.preventDefault();
      var email = document.getElementById('ksigEmail').value.trim();
      var pass = document.getElementById('ksigPassword').value;
      var statusEl = document.getElementById('ksigLoginStatus');
      var btn = document.getElementById('ksigLoginBtn');
      statusEl.className = 'ksig-status-line'; statusEl.textContent = 'Memeriksa akun…';
      btn.disabled = true;
      state.client.auth.signInWithPassword({ email:email, password:pass }).then(function(res){
        if(res.error){
          btn.disabled = false;
          statusEl.className = 'ksig-status-line err'; statusEl.textContent = res.error.message || 'Login gagal.';
          return;
        }
        dbg('login berhasil');
        renderBoot('Login berhasil, membuka Kamar Signal…');
        loadMainApp();
      }).catch(function(err){
        btn.disabled = false;
        statusEl.className = 'ksig-status-line err'; statusEl.textContent = (err && err.message) || 'Login gagal.';
      });
    });
  }

  function boot(){
    renderBoot('Menghubungkan ke Kamar Signal…');
    dbg('boot(): akan panggil KamarSupabase.ready()');
    var readyPromise = (window.KamarSupabase && window.KamarSupabase.ready) ? window.KamarSupabase.ready() : Promise.resolve(null);
    var timeoutPromise = new Promise(function(resolve, reject){ setTimeout(function(){ reject(new Error('TIMEOUT')); }, 9000); });
    Promise.race([readyPromise, timeoutPromise])
      .then(function(client){
        dbg('KamarSupabase.ready() SELESAI, client ada: ' + (!!client));
        state.client = client || (window.KamarSupabase && window.KamarSupabase.getClient && window.KamarSupabase.getClient());
        if(!state.client){ renderBootError('Koneksi database belum siap. Muat ulang halaman.'); return null; }
        var sessionTimeoutPromise = new Promise(function(resolve, reject){ setTimeout(function(){ reject(new Error('SESSION_TIMEOUT')); }, 9000); });
        return Promise.race([state.client.auth.getSession(), sessionTimeoutPromise]);
      })
      .then(function(res){
        if(!res) return;
        var session = res && res.data && res.data.session;
        dbg('cek sesi selesai, ada session: ' + (!!session));
        if(!session || !session.user){
          renderLogin();
          return;
        }
        state.user = session.user;
        renderBoot('Sesi ditemukan, membuka Kamar Signal…');
        loadMainApp();
      })
      .catch(function(err){
        dbg('boot chain GAGAL/catch: ' + (err && (err.message||String(err))));
        if(err && err.message === 'TIMEOUT'){
          renderBootError('Koneksi ke server lambat atau tersangkut. Coba Muat Ulang. Jika masih gagal terus, hapus aplikasi Kamar Signal dari Home Screen lalu instal ulang dari awal.');
        } else if(err && err.message === 'SESSION_TIMEOUT'){
          renderBootError('Sesi login tersangkut saat memuat. Coba Muat Ulang halaman. Jika masih macet, tutup total browser (bukan cuma tab) lalu buka lagi.');
        } else {
          renderBootError('Gagal memuat Kamar Signal: ' + (err && (err.message||String(err))));
        }
      });
  }

  window.addEventListener('error', function(ev){
    if(__settled) return;
    try{ renderBootError('Error JS: ' + (ev && ev.message || 'unknown')); }catch(e){}
  });
  window.addEventListener('unhandledrejection', function(ev){
    if(__settled) return;
    try{
      var reason = ev && ev.reason;
      var msg = (reason && reason.message) ? reason.message : String(reason);
      renderBootError('Promise gagal tanpa tertangani: ' + msg);
    }catch(e){}
  });
  setTimeout(function(){
    if(__settled) return;
    try{ renderBootError('Macet lebih dari 15 detik tanpa respons (watchdog darurat). Coba Muat Ulang.'); }catch(e){}
  }, 15000);

  dbg('memanggil boot() sekarang');
  boot();
})();
