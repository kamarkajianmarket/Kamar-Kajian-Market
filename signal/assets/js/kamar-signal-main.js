/* ==========================================================================
Kamar Signal — app logic v2 (professional UI/UX redesign)
Prinsip (jangan dilanggar, lihat master prompt user):
- EA adalah source of truth untuk isi/angka signal. App ini HANYA presentasi.
- Auth = Supabase Auth asli (auth.uid()), bukan boolean localStorage.
  RLS di database yang benar-benar menahan akses (member_can_access('kamar_study')).
  localStorage di sini hanya dipakai untuk state UX non-sensitif (unread cache lokal opsional).
- Semua waktu ditampilkan dalam WIB (timezone EA), bukan timezone browser.
- Tidak ada polling agresif. Update berbasis event (Supabase Realtime) + refetch bertarget.
- Rekap Signal WAJIB mengikuti struktur existing: PERIODE -> TIMEFRAME -> HASIL REKAP.
  Timeframe TIDAK di-hardcode — hanya menampilkan apa yang benar-benar ada di data.
========================================================================== */
(function(){
  'use strict';

  var ROOT_PATH = '/signal/';
  var el = document.getElementById('ksigRoot');
  var __ksigT0 = Date.now();
  var __ksigLogEl = null;
  function dbg(msg){
    try{
      __ksigLogEl = __ksigLogEl || document.getElementById('__ksigDebugLog'); if(!__ksigLogEl){
        __ksigLogEl = document.createElement('div');
        __ksigLogEl.id = '__ksigDebugLog';
        __ksigLogEl.style.cssText = 'display:none;position:fixed;left:0;right:0;bottom:0;max-height:45vh;overflow:auto;background:rgba(0,0,0,.92);color:#0f0;font:10px/1.4 monospace;padding:8px;z-index:2147483647;pointer-events:none;white-space:pre-wrap;word-break:break-all;';
        (document.body||document.documentElement).appendChild(__ksigLogEl);
      }
      var line = document.createElement('div');
      line.textContent = '[app ' + (Date.now()-__ksigT0) + 'ms] ' + msg;
      __ksigLogEl.appendChild(line); __ksigLogEl.scrollTop = __ksigLogEl.scrollHeight;
    }catch(e){}
  }
  dbg('script kamar-signal-app.js mulai jalan');
  // DIAGNOSTIK 2026-08-23: PerformanceObserver longtask -- deteksi PERSIS tugas mana
  // yang macetin main thread lama (>150ms), biar ketahuan sumber CPU-pinning tanpa
  // nebak-nebak lagi. Dibatasi max 40 entry + ringkasan tiap 5 detik biar diagnostik
  // ini sendiri TIDAK nambah beban (dicurigai debug logging lama bisa jadi beban).
  try{
    var __ksigLtCount = 0, __ksigLtTotalMs = 0, __ksigLtLogged = 0;
    if(typeof PerformanceObserver !== 'undefined'){
      var __ksigLtObs = new PerformanceObserver(function(list){
        list.getEntries().forEach(function(entry){
          __ksigLtCount++; __ksigLtTotalMs += entry.duration;
          if(__ksigLtLogged < 40 && entry.duration > 150){
            __ksigLtLogged++;
            dbg('LONGTASK #' + __ksigLtCount + ': ' + Math.round(entry.duration) + 'ms, name=' + entry.name + ', start=' + Math.round(entry.startTime) + 'ms');
          }
        });
      });
      __ksigLtObs.observe({ type: 'longtask', buffered: true });
      setInterval(function(){
        if(__ksigLtCount > 0){ dbg('RINGKASAN longtask: ' + __ksigLtCount + ' tugas, total ' + Math.round(__ksigLtTotalMs) + 'ms sejak awal'); }
      }, 5000);
    } else {
      dbg('PerformanceObserver/longtask TIDAK didukung browser ini');
    }
  }catch(__ksigLtErr){ dbg('setup longtask observer GAGAL: ' + (__ksigLtErr && __ksigLtErr.message)); }

  var dashboardEntered = false;
  var _kamarNumSnap = {};
  function fmtCountNum(v, digits){
    digits = digits || 0;
    if(digits > 0){ var s = Math.abs(v).toFixed(digits).replace('.', ','); return (v < 0 ? '-' : '') + s; }
    return String(Math.round(v));
  }
  function applyCountAnimations(container){
    if(!container || !container.querySelectorAll) return;
    var nodes = container.querySelectorAll('[data-cnum]');
    for(var i=0; i<nodes.length; i++){
      (function(node){
        var key = node.getAttribute('data-cnum');
        var val = parseFloat(node.getAttribute('data-cval'));
        var digits = parseInt(node.getAttribute('data-cdigits') || '0', 10);
        var prev = _kamarNumSnap[key];
        _kamarNumSnap[key] = val;
        if(!state._rtRender || prev === undefined || isNaN(prev) || isNaN(val) || prev === val){
          node.textContent = fmtCountNum(val, digits);
          return;
        }
        var start = prev, end = val, t0 = null, dur = 650;
        function step(ts){
          if(!t0) t0 = ts;
          var p = Math.min(1, (ts - t0) / dur);
          var eased = 1 - Math.pow(1 - p, 3);
          node.textContent = fmtCountNum(start + (end - start) * eased, digits);
          if(p < 1) requestAnimationFrame(step); else node.textContent = fmtCountNum(end, digits);
        }
        requestAnimationFrame(step);
      })(nodes[i]);
    }
  }

  var state = {
    client: null,
    user: null,
    profile: null,
    access: null,
    approved: false,
    route: { view: 'dashboard' },
    navCount: 0,
    counts: { fresh:0, aktif:0, profit:0, loss:0 },
    unreadCounts: { fresh:0, aktif:0, profit:0, loss:0 },
    badgeJustChanged: { fresh:false, aktif:false, profit:false, loss:false },
    lastUpdate: null,
    readsMap: {}, // id_zona -> ISO timestamp member last opened detail signal itu
    readsLoaded: false,
    realtimeStatus: 'off', // off | connecting | on | warn
    list: { status:'fresh', loadedForStatus:null, loaded:false, items:[], page:0, pageSize:20, hasMore:true, loading:false, search:'', sort:'terbaru', filters:{ symbol:'', timeframe:'', dir:'', period:'', unread:false }, unreadTotal:0 },
    recap: { type:'DAILY', rows:[], loaded:false, loading:false, selectedPeriod:null, periods:[], periodsLoaded:false, periodsLoading:false, pickerOpen:false, customPreset:null, customFrom:'', customTo:'', customRangeLabel:'', calOpen:false, calViewYear:null, calViewMonth:null, calStart:null, calEnd:null },
    activity: { items:[], loaded:false, loading:false },
    detail: { id_zona:null, signal:null, events:[], loading:false }
  };

  /* ---------------- instal aplikasi (PWA) ---------------- */
  var installPromptEvent = null;
  function isStandaloneMode(){
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
  }
    function ksigBackNavHtml(){
    if (isStandaloneMode()) return '';
    return '<div class="ksig-backnav">' +
        '<a class="ksig-btn ksig-backnav-btn" href="/dashboard.html">' +
          '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>' +
          '<span>Dashboard Member</span>' +
        '</a>' +
        '<a class="ksig-btn ksig-backnav-btn" href="/index.html">' +
          '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5L12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/></svg>' +
          '<span>Beranda Website</span>' +
        '</a>' +
      '</div>';
  }

function isIOSDevice(){
    return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  }
  function installAvailable(){
    return !isStandaloneMode();
  }
  var ANDROID_EMOJI = '\uD83E\uDD16';
  var APPLE_EMOJI = '\uD83C\uDF4E';
  function platformKind(){ return isIOSDevice() ? 'ios' : 'android'; }
  function installStepsHtml(kind){
    if(kind==='ios'){
      return '<ol class="ksig-promo-steps">'+
        '<li><span class="ksig-promo-num">1</span>Buka Kamar Signal di <strong>Safari</strong> (bukan Chrome).</li>'+
        '<li><span class="ksig-promo-num">2</span>Tap ikon <strong>Share</strong> (kotak dengan panah ke atas) di bagian bawah layar.</li>'+
        '<li><span class="ksig-promo-num">3</span>Pilih <strong>"Add to Home Screen"</strong> (Tambah ke Layar Utama).</li>'+
        '<li><span class="ksig-promo-num">4</span>Tap <strong>"Add"</strong> di pojok kanan atas.</li>'+
      '</ol>';
    }
    return '<ol class="ksig-promo-steps">'+
      '<li><span class="ksig-promo-num">1</span>Tap tombol <strong>Instal Sekarang</strong> di bawah ini.</li>'+
      '<li><span class="ksig-promo-num">2</span>Jika tidak muncul otomatis, tap menu titik tiga di pojok kanan atas browser.</li>'+
      '<li><span class="ksig-promo-num">3</span>Pilih <strong>"Instal aplikasi"</strong> atau <strong>"Tambahkan ke layar Utama"</strong>.</li>'+
    '</ol>';
  }

  window.addEventListener('beforeinstallprompt', function(e){
    e.preventDefault();
    installPromptEvent = e;
    if(state.client) renderApp();
  });
  window.addEventListener('appinstalled', function(){
    installPromptEvent = null;
    if(state.client) renderApp();
  });
  function bindInstallBtn(){
    var b = document.getElementById('ksigInstallBtn');
    if(b) b.addEventListener('click', openInstallSheet);
    var l = document.getElementById('ksigLoginInstall');
    if(l) l.addEventListener('click', openInstallSheet);
  }
  function openInstallSheet(forceKind){
    var wrap = document.createElement('div');
    wrap.className = 'ksig-sheet-backdrop';
    var kind = forceKind || platformKind();
    function bodyFor(k){
      var showGo = (k==='android' && !!installPromptEvent);
      return '<div class="ksig-promo">'+
          '<div class="ksig-promo-tabs">'+
            '<button type="button" class="ksig-promo-tab'+(k==='android'?' active':'')+'" data-kind="android">'+ANDROID_EMOJI+' Android</button>'+
            '<button type="button" class="ksig-promo-tab'+(k==='ios'?' active':'')+'" data-kind="ios">'+APPLE_EMOJI+' iPhone/iPad</button>'+
          '</div>'+
          '<div class="ksig-promo-badge '+k+'">'+(k==='ios'?APPLE_EMOJI:ANDROID_EMOJI)+'</div>'+
          '<div class="ksig-sheet-title">Instal Kamar Signal ('+(k==='ios'?'iPhone/iPad':'Android')+')</div>'+
          '<div class="ksig-promo-desc">Akses lebih cepat, tampilan layar penuh, dan notifikasi langsung ke HP Anda seperti aplikasi biasa.</div>'+
          installStepsHtml(k)+
        '</div>'+
        '<div class="ksig-sheet-actions">'+
          '<button class="ksig-btn'+(showGo?'':' primary block')+'" id="ksigInstallCancel">'+(showGo?'Nanti Saja':'Mengerti')+'</button>'+
          (showGo?'<button class="ksig-btn primary" id="ksigInstallGo">Instal Sekarang</button>':'')+
        '</div>';
    }
    wrap.innerHTML = '<div class="ksig-sheet"><div class="ksig-sheet-handle"></div><div id="ksigInstallSheetBody">'+bodyFor(kind)+'</div></div>';
    document.body.appendChild(wrap);
    function bindActions(){
      var cancelBtn = document.getElementById('ksigInstallCancel');
      if(cancelBtn) cancelBtn.addEventListener('click', function(){ if(wrap.parentNode) document.body.removeChild(wrap); });
      var goBtn = document.getElementById('ksigInstallGo');
      if(goBtn) goBtn.addEventListener('click', function(){
        if(wrap.parentNode) document.body.removeChild(wrap);
        if(!installPromptEvent) return;
        installPromptEvent.prompt();
        installPromptEvent.userChoice.then(function(){ installPromptEvent = null; renderApp(); });
      });
      var tabs = wrap.querySelectorAll('.ksig-promo-tab');
      tabs.forEach(function(t){
        t.addEventListener('click', function(){
          kind = t.getAttribute('data-kind');
          var holder = document.getElementById('ksigInstallSheetBody');
          if(holder){ holder.innerHTML = bodyFor(kind); bindActions(); }
        });
      });
    }
    wrap.addEventListener('click', function(e){ if(e.target===wrap && wrap.parentNode) document.body.removeChild(wrap); });
    bindActions();
  }

  /* ---------------- notifikasi (push, additive) ---------------- */
  var VAPID_PUBLIC_KEY = 'BDLdP5GTvWHEKDY_BEnHl0Q8J5KT1aBNsLT1E5-lDbGvoHhL1a1mVUszB3ww9pHzmpJn7NelEslGO6ljGDB05CQ';
  var notifState = { subscribed: false, checked: false };

  function urlBase64ToUint8Array(base64String){
    var padding = '='.repeat((4 - base64String.length % 4) % 4);
    var base64 = (base64String + padding).replace(/-/g,'+').replace(/_/g,'/');
    var raw = atob(base64);
    var out = new Uint8Array(raw.length);
    for (var i=0;i<raw.length;i++) out[i] = raw.charCodeAt(i);
    return out;
  }

  function checkNotifStatus(){
    if(!('serviceWorker' in navigator) || !('PushManager' in window)) return Promise.resolve(false);
    return navigator.serviceWorker.ready.then(function(reg){
      return reg.pushManager.getSubscription();
    }).then(function(sub){
      notifState.subscribed = !!sub;
      notifState.checked = true;
      return notifState.subscribed;
    }).catch(function(){ notifState.checked = true; return false; });
  }

  function subscribeNotif(){
    if(!state.profile) return Promise.reject(new Error('belum login'));
    return Notification.requestPermission().then(function(perm){
      if(perm !== 'granted') throw new Error('izin ditolak');
      return navigator.serviceWorker.ready;
    }).then(function(reg){
      return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) });
    }).then(function(sub){
      var j = sub.toJSON();
      return state.client.from('push_subscriptions').upsert({
        profile_id: state.profile.id,
        endpoint: j.endpoint,
        p256dh: j.keys.p256dh,
        auth_key: j.keys.auth,
        device_label: navigator.userAgent.slice(0,120),
        last_seen_at: new Date().toISOString()
      }, { onConflict: 'endpoint' }).then(function(){
        return state.client.from('notification_prefs').upsert({
          profile_id: state.profile.id,
          push_enabled: true,
          updated_at: new Date().toISOString()
        }, { onConflict: 'profile_id' });
      });
    }).then(function(){
      notifState.subscribed = true;
      renderApp();
    });
  }

  function unsubscribeNotif(){
    return navigator.serviceWorker.ready.then(function(reg){
      return reg.pushManager.getSubscription();
    }).then(function(sub){
      if(!sub) return;
      var endpoint = sub.endpoint;
      return sub.unsubscribe().then(function(){
        return state.client.from('push_subscriptions').delete().eq('endpoint', endpoint);
      });
    }).then(function(){
      if(state.profile){
        return state.client.from('notification_prefs').upsert({
          profile_id: state.profile.id,
          push_enabled: false,
          updated_at: new Date().toISOString()
        }, { onConflict: 'profile_id' });
      }
    }).then(function(){
      notifState.subscribed = false;
      renderApp();
    });
  }

  // v2: kalau VAPID key server pernah dirotasi (mis. karena private key lama
  // hilang, lihat riwayat 2026-08-14), device yang SUDAH punya subscription
  // lama tetap kelihatan "Aktif" di layar (getSubscription() cuma cek ada/
  // tidak ada di browser, tidak tahu key-nya masih cocok dengan server atau
  // tidak) padahal push ke device itu diam-diam gagal terus. Fungsi ini
  // dipanggil otomatis tiap kali member sukses login/masuk approved, tanpa
  // perlu member sadar atau buka Pengaturan sama sekali - kalau ada
  // subscription lokal, dicoba disegarkan ke VAPID_PUBLIC_KEY yang berlaku
  // sekarang; kalau ditolak browser karena key beda dari yang lama, lepas dulu
  // baru pasang ulang, lalu simpan subscription barunya ke server.
  function ensureFreshPushSubscription(){
    if(!state.profile) return Promise.resolve();
    if(!('serviceWorker' in navigator) || !('PushManager' in window)) return Promise.resolve();
    if(Notification.permission !== 'granted') return Promise.resolve();
    return navigator.serviceWorker.ready.then(function(reg){
      return reg.pushManager.getSubscription().then(function(sub){
        if(!sub) return null; // member belum pernah aktifkan di device ini, tidak ada yang perlu disegarkan
        return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) })
          .catch(function(){
            return sub.unsubscribe().then(function(){
              return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) });
            });
          });
      });
    }).then(function(freshSub){
      if(!freshSub) return;
      var j = freshSub.toJSON();
      return state.client.from('push_subscriptions').upsert({
        profile_id: state.profile.id,
        endpoint: j.endpoint,
        p256dh: j.keys.p256dh,
        auth_key: j.keys.auth,
        device_label: navigator.userAgent.slice(0,120),
        last_seen_at: new Date().toISOString()
      }, { onConflict: 'endpoint' });
    }).catch(function(){});
  }

  function notifBtnHtml(){
    if(!('serviceWorker' in navigator) || !('PushManager' in window)) return '';
    var on = notifState.subscribed;
    return '<button type="button" class="ksig-install-btn'+(on?' on':'')+'" id="ksigNotifBtn" title="'+(on?"Notifikasi aktif":"Aktifkan Notifikasi")+'">'+(on?"\uD83D\uDD14":"\uD83D\uDD15")+'</button>';
  }

  function bindNotifBtn(){
    var b = document.getElementById('ksigNotifBtn');
    if(b) b.addEventListener('click', openNotifSheet);
    if(!notifState.checked){ checkNotifStatus().then(function(){ renderApp(); }); }
  }

  function openNotifSheet(){
    var wrap = document.createElement('div');
    wrap.className = 'ksig-sheet-backdrop';
    var body;
    if(notifState.subscribed){
      body = '<div class="ksig-sheet-title">Notifikasi Aktif</div>'+
        '<p style="color:var(--km-muted);font-size:13.5px;line-height:1.6;margin:0 0 16px">HP Anda akan mendapat pemberitahuan saat ada Signal FRESH (baru). Perubahan status lain (aktif, TP, cut loss) tidak akan berbunyi, cukup tampil sebagai tanda "Baru" di daftar. Matikan notifikasi?</p>'+
        '<div class="ksig-sheet-actions"><button class="ksig-btn" id="ksigNotifCancel">Batal</button><button class="ksig-btn primary" id="ksigNotifOff">Matikan Notifikasi</button></div>';
    } else {
      var ios = isIOSDevice();
      var standalone = isStandaloneMode();
      if(ios && !standalone){
        body = '<div class="ksig-promo">'+
            '<div class="ksig-promo-badge ios">'+APPLE_EMOJI+'</div>'+
            '<div class="ksig-sheet-title">Aktifkan Notifikasi (iPhone/iPad)</div>'+
            '<div class="ksig-promo-desc">Di iPhone/iPad, notifikasi push hanya bisa aktif setelah Kamar Signal dipasang sebagai aplikasi di Layar Utama.</div>'+
            '<ol class="ksig-promo-steps">'+
              '<li><span class="ksig-promo-num">1</span>Tap <strong>Instal Aplikasi</strong> di bawah ini, ikuti langkahnya.</li>'+
              '<li><span class="ksig-promo-num">2</span>Buka Kamar Signal dari ikon di Layar Utama (bukan dari Safari).</li>'+
              '<li><span class="ksig-promo-num">3</span>Tap ikon lonceng lagi, lalu tap Aktifkan dan izinkan saat diminta.</li>'+
            '</ol>'+
          '</div>'+
          '<div class="ksig-sheet-actions"><button class="ksig-btn" id="ksigNotifCancel">Nanti Saja</button><button class="ksig-btn primary" id="ksigNotifInstallGo">Instal Aplikasi</button></div>';
      } else {
        body = '<div class="ksig-promo">'+
            '<div class="ksig-promo-badge '+(ios?'ios':'android')+'">'+(ios?APPLE_EMOJI:ANDROID_EMOJI)+'</div>'+
            '<div class="ksig-sheet-title">Aktifkan Notifikasi</div>'+
            '<div class="ksig-promo-desc">Dapatkan pemberitahuan langsung di HP Anda saat ada signal baru, signal aktif, dan hasil akhir (profit/loss). Bisa dimatikan kapan saja.</div>'+
            '<ol class="ksig-promo-steps">'+
              '<li><span class="ksig-promo-num">1</span>Tap <strong>Aktifkan</strong> di bawah ini.</li>'+
              '<li><span class="ksig-promo-num">2</span>'+(ios?'Sistem akan minta izin, tap ':'Browser akan minta izin, tap ')+'<strong>Izinkan / Allow</strong>.</li>'+
              '<li><span class="ksig-promo-num">3</span>Selesai, notifikasi aktif otomatis.</li>'+
            '</ol>'+
          '</div>'+
          '<div class="ksig-sheet-actions"><button class="ksig-btn" id="ksigNotifCancel">Nanti Saja</button><button class="ksig-btn primary" id="ksigNotifOn">Aktifkan</button></div>';
      }
    }
    wrap.innerHTML = '<div class="ksig-sheet"><div class="ksig-sheet-handle"></div>'+body+'</div>';
    document.body.appendChild(wrap);
    wrap.addEventListener('click', function(e){ if(e.target===wrap) document.body.removeChild(wrap); });
    var cancelBtn = document.getElementById('ksigNotifCancel');
    if(cancelBtn) cancelBtn.addEventListener('click', function(){ document.body.removeChild(wrap); });
    var onBtn = document.getElementById('ksigNotifOn');
    if(onBtn) onBtn.addEventListener('click', function(){
      document.body.removeChild(wrap);
      subscribeNotif().catch(function(){});
    });
    var offBtn = document.getElementById('ksigNotifOff');
    if(offBtn) offBtn.addEventListener('click', function(){
      document.body.removeChild(wrap);
      unsubscribeNotif().catch(function(){});
    });
    var installGoBtn = document.getElementById('ksigNotifInstallGo');
    if(installGoBtn) installGoBtn.addEventListener('click', function(){
      document.body.removeChild(wrap);
      openInstallSheet('ios');
    });
  }

/* ---------------- helpers ---------------- */
  /* ---------------- telegram connect (additive) ---------------- */
var TELEGRAM_BOT_USERNAME = 'kamarsignalbot';
function genTelegramToken(){
  if(window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID().replace(/-/g,'');
  return 'tg' + Date.now().toString(36) + Math.random().toString(36).slice(2,10);
}
function settingsBtnHtml(){
  if(!state.profile) return '';
  return '<button type="button" class="ksig-install-btn" id="ksigSettingsBtn" title="Pengaturan Notifikasi">\u2699\uFE0F</button>';
}
function bindSettingsBtn(){
  var b = document.getElementById('ksigSettingsBtn');
  if(b) b.addEventListener('click', function(){
    if(!state.profile) return;
    state.client.from('notification_prefs').select('telegram_enabled').eq('profile_id', state.profile.id).maybeSingle().then(function(res){
      state.notifPrefs = (res && res.data) ? res.data : {};
      openSettingsSheet();
    });
  });
}
function setTelegramEnabled(enabled){
  if(!state.profile) return Promise.resolve();
  state.notifPrefs = state.notifPrefs || {};
  state.notifPrefs.telegram_enabled = enabled;
  return state.client.from('notification_prefs').upsert({
    profile_id: state.profile.id,
    telegram_enabled: enabled,
    updated_at: new Date().toISOString()
  }, { onConflict: 'profile_id' });
}
function openSettingsSheet(){
  if(!state.profile) return;
  var wrap = document.createElement('div');
  wrap.className = 'ksig-sheet-backdrop';
  var pushOn = notifState.subscribed;
  var pushSupported = ('serviceWorker' in navigator) && ('PushManager' in window);
  var iosNeedsInstall = isIOSDevice() && !isStandaloneMode();
  var tgConnected = !!state.profile.telegram_chat_id;
  var tgOn = (state.notifPrefs && state.notifPrefs.telegram_enabled === false) ? false : true;
  var chimeActiveOn = getChimePrefs().active === true;
  var chimeResultOn = getChimePrefs().result === true;
  var TG_ICON = '<svg width="20" height="20" viewBox="0 0 24 24" style="vertical-align:-5px;margin-right:6px" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#29A9EB"/><path d="M17.5 7.5L6.8 11.6c-.7.3-.7.9-.1 1.1l2.7.9 1 3.3c.1.4.3.5.6.5.3 0 .4-.1.6-.3l1.5-1.5 2.8 2.1c.5.4 1 .2 1.1-.4l2-9.1c.2-.7-.2-1-1-.7z" fill="#fff"/></svg>';

  var pushBlock;
  if(!pushSupported){
    pushBlock = iosNeedsInstall
      ? '<p style="color:var(--km-muted);font-size:13px;line-height:1.6;margin:4px 0 0">Instal Kamar Signal ke Home Screen dulu supaya bisa aktifkan notifikasi push di iPhone/iPad.</p><button type="button" class="ksig-btn" id="ksigSettingsInstallGo" style="margin-top:8px;width:100%">Cara Instal</button>'
      : '<p style="color:var(--km-muted);font-size:13px;line-height:1.6;margin:4px 0 0">Tidak didukung di perangkat/browser ini.</p>';
  } else {
    pushBlock = '<div class="ksig-chip-row" data-settings-row="push">'+
      '<div class="ksig-chip-opt'+(pushOn?' active':'')+'" data-val="on">Aktif</div>'+
      '<div class="ksig-chip-opt'+(!pushOn?' active':'')+'" data-val="off">Nonaktif</div>'+
    '</div>';
  }

  var tgBlock;
  if(!tgConnected){
    tgBlock = '<div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:12px 14px;display:flex;gap:10px;align-items:flex-start">'+
      '<span style="font-size:18px;line-height:1">\uD83D\uDD12</span>'+
      '<span style="color:var(--km-muted);font-size:12.5px;line-height:1.6">Koneksi Telegram baru sedang dikunci sementara untuk peningkatan keamanan. Akan dibuka kembali setelah sistem proteksi anti-bocor signal selesai dipasang.</span>'+
    '</div>';
  } else {
    tgBlock = '<div class="ksig-chip-row" data-settings-row="telegram">'+
        '<div class="ksig-chip-opt'+(tgOn?' active':'')+'" data-val="on">Aktif</div>'+
        '<div class="ksig-chip-opt'+(!tgOn?' active':'')+'" data-val="off">Nonaktif</div>'+
      '</div>'+
      '<button type="button" id="ksigSettingsTgDisconnect" style="margin-top:8px;font-size:12.5px;color:var(--km-muted);background:none;border:none;text-decoration:underline;cursor:pointer;padding:0">Putuskan koneksi Telegram</button>';
  }

  wrap.innerHTML =
    '<div class="ksig-sheet">'+
      '<div class="ksig-sheet-handle"></div>'+
      '<div class="ksig-sheet-title">Pengaturan Notifikasi</div>'+
      '<div class="ksig-sheet-group"><div class="ksig-sheet-group-label">\uD83D\uDD14 Notifikasi Push</div>'+pushBlock+'</div>'+
      '<div class="ksig-sheet-group"><div class="ksig-sheet-group-label" style="display:flex;align-items:center">'+TG_ICON+'Notifikasi Telegram</div>'+tgBlock+'</div>'+
      '<div class="ksig-sheet-group"><div class="ksig-sheet-group-label">🔔 Bunyi Signal Aktif</div>'+
        '<div class="ksig-chip-row" data-settings-row="chime-active">'+
          '<div class="ksig-chip-opt'+(chimeActiveOn?' active':'')+'" data-val="on">Aktif</div>'+
          '<div class="ksig-chip-opt'+(!chimeActiveOn?' active':'')+'" data-val="off">Nonaktif</div>'+
        '</div></div>'+
      '<div class="ksig-sheet-group"><div class="ksig-sheet-group-label">🔔 Bunyi Signal Profit/Loss</div>'+
        '<div class="ksig-chip-row" data-settings-row="chime-result">'+
          '<div class="ksig-chip-opt'+(chimeResultOn?' active':'')+'" data-val="on">Aktif</div>'+
          '<div class="ksig-chip-opt'+(!chimeResultOn?' active':'')+'" data-val="off">Nonaktif</div>'+
        '</div></div>'+
      '<p style="color:var(--km-muted);font-size:12.5px;line-height:1.6;margin:14px 0 0">Notifikasi (bunyi/pesan) selalu aktif untuk Signal FRESH (baru). Untuk Signal Aktif & Profit/Loss, bunyi baru berbunyi jika diaktifkan di atas — perubahan status tetap tampil sebagai tanda "Baru" di daftar walau bunyi dimatikan.</p>'+
      '<div class="ksig-sheet-actions"><button class="ksig-btn primary" id="ksigSettingsClose" style="width:100%">Selesai</button></div>'+
    '</div>';
  document.body.appendChild(wrap);
  wrap.addEventListener('click', function(e){ if(e.target===wrap) wrap.remove(); });
  document.getElementById('ksigSettingsClose').addEventListener('click', function(){ wrap.remove(); });

  var installGoBtn = document.getElementById('ksigSettingsInstallGo');
  if(installGoBtn) installGoBtn.addEventListener('click', function(){ wrap.remove(); openInstallSheet('ios'); });

  var pushRow = wrap.querySelector('[data-settings-row="push"]');
  if(pushRow) pushRow.addEventListener('click', function(e){
    var opt = e.target.closest('.ksig-chip-opt'); if(!opt) return;
    var val = opt.getAttribute('data-val');
    if(val==='on' && !pushOn){ wrap.remove(); subscribeNotif().then(function(){ renderApp(); }).catch(function(err){ alert('Gagal mengaktifkan notifikasi: '+(err && err.message ? err.message : err)); }); }
    else if(val==='off' && pushOn){ wrap.remove(); unsubscribeNotif().then(function(){ renderApp(); }); }
  });

  var tgConnectBtn = document.getElementById('ksigSettingsTgConnect');
  if(tgConnectBtn) tgConnectBtn.addEventListener('click', function(){
    wrap.remove();
    var win = window.open('', '_blank');
    connectTelegram(win).catch(function(){ if(win && !win.closed) win.close(); });
  });

  var tgDisconnectBtn = document.getElementById('ksigSettingsTgDisconnect');
  if(tgDisconnectBtn) tgDisconnectBtn.addEventListener('click', function(){
    wrap.remove();
    disconnectTelegram().catch(function(){});
  });

  var tgRow = wrap.querySelector('[data-settings-row="telegram"]');
  if(tgRow) tgRow.addEventListener('click', function(e){
    var opt = e.target.closest('.ksig-chip-opt'); if(!opt) return;
    var val = opt.getAttribute('data-val');
    var want = (val==='on');
    if(want===tgOn) return;
    setTelegramEnabled(want).then(function(){ wrap.remove(); openSettingsSheet(); });
  });

  var chimeActiveRow = wrap.querySelector('[data-settings-row="chime-active"]');
  if(chimeActiveRow) chimeActiveRow.addEventListener('click', function(e){
    var opt = e.target.closest('.ksig-chip-opt'); if(!opt) return;
    var val = opt.getAttribute('data-val');
    var want = (val === 'on');
    if(want === chimeActiveOn) return;
    setChimePrefLocal('active', want);
    wrap.remove(); openSettingsSheet();
  });

  var chimeResultRow = wrap.querySelector('[data-settings-row="chime-result"]');
  if(chimeResultRow) chimeResultRow.addEventListener('click', function(e){
    var opt = e.target.closest('.ksig-chip-opt'); if(!opt) return;
    var val = opt.getAttribute('data-val');
    var want = (val === 'on');
    if(want === chimeResultOn) return;
    setChimePrefLocal('result', want);
    wrap.remove(); openSettingsSheet();
  });
}
function telegramBtnHtml(){
  if(!state.profile) return '';
  var on = !!state.profile.telegram_chat_id;
  return '<button type="button" class="ksig-install-btn'+(on?' on':'')+'" id="ksigTelegramBtn" title="'+(on?"Telegram terhubung":"Hubungkan Telegram")+'">\u2708\uFE0F</button>';
}
function bindTelegramBtn(){
  var b = document.getElementById('ksigTelegramBtn');
  if(b) b.addEventListener('click', openTelegramSheet);
}
function connectTelegram(preOpenedWin){
  if(!state.profile) return Promise.reject(new Error('belum login'));
  var token = genTelegramToken();
  return state.client.from('telegram_connect_tokens').insert({
    token: token,
    profile_id: state.profile.id
  }).then(function(res){
    if(res.error) throw res.error;
    var url = 'https://t.me/'+TELEGRAM_BOT_USERNAME+'?start='+token;
    if(preOpenedWin && !preOpenedWin.closed){ preOpenedWin.location = url; }
    else { window.open(url, '_blank'); }
  });
}
function disconnectTelegram(){
  if(!state.profile) return Promise.reject(new Error('belum login'));
  return state.client.from('member_profiles').update({
    telegram_chat_id: null,
    telegram_connected_at: null
  }).eq('id', state.profile.id).then(function(res){
    if(res.error) throw res.error;
    state.profile.telegram_chat_id = null;
    renderApp();
  });
}
function openTelegramSheet(){
  var wrap = document.createElement('div');
  wrap.className = 'ksig-sheet-backdrop';
  var connected = !!(state.profile && state.profile.telegram_chat_id);
  var body;
  if(connected){
    body = '<div class="ksig-sheet-title">Telegram Terhubung</div>'+
      '<p style="color:var(--km-muted);font-size:13.5px;line-height:1.6;margin:0 0 16px">Kamu akan menerima notifikasi signal baru langsung lewat chat Telegram. Putuskan koneksi ini?</p>'+
      '<div class="ksig-sheet-actions"><button class="ksig-btn" id="ksigTgCancel">Batal</button><button class="ksig-btn primary" id="ksigTgOff">Lepaskan Telegram</button></div>';
  } else {
    body = '<div class="ksig-promo">'+
      '<div class="ksig-promo-badge android">\u2708\uFE0F</div>'+
      '<div class="ksig-sheet-title">Hubungkan Telegram</div>'+
      '<div class="ksig-promo-desc">Dapatkan notifikasi signal baru langsung ke Telegram kamu, selain lewat notifikasi HP. Prosesnya cuma 2 tap.</div>'+
      '<ol class="ksig-promo-steps">'+
      '<li><span class="ksig-promo-num">1</span>Tap <strong>Hubungkan</strong> di bawah ini, Telegram akan terbuka otomatis.</li>'+
      '<li><span class="ksig-promo-num">2</span>Tap tombol <strong>Start</strong> di chat bot yang muncul.</li>'+
      '<li><span class="ksig-promo-num">3</span>Selesai, bot akan konfirmasi kalau sudah terhubung.</li>'+
      '</ol>'+
      '</div>'+
      '<div class="ksig-sheet-actions"><button class="ksig-btn" id="ksigTgCancel">Nanti Saja</button><button class="ksig-btn primary" id="ksigTgOn">Hubungkan</button></div>';
  }
  wrap.innerHTML = '<div class="ksig-sheet"><div class="ksig-sheet-handle"></div>'+body+'</div>';
  document.body.appendChild(wrap);
  wrap.addEventListener('click', function(e){ if(e.target===wrap) document.body.removeChild(wrap); });
  var cancelBtn = document.getElementById('ksigTgCancel');
  if(cancelBtn) cancelBtn.addEventListener('click', function(){ document.body.removeChild(wrap); });
  var onBtn = document.getElementById('ksigTgOn');
  if(onBtn) onBtn.addEventListener('click', function(){
    document.body.removeChild(wrap);
    var win = window.open('', '_blank');
    connectTelegram(win).catch(function(){ if(win && !win.closed) win.close(); });
  });
  var offBtn = document.getElementById('ksigTgOff');
  if(offBtn) offBtn.addEventListener('click', function(){
    document.body.removeChild(wrap);
    disconnectTelegram().catch(function(){});
  });
}

function esc(s){
    return String(s==null?'':s).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
  function fmtWIB(iso, opts){
    if(!iso) return '-';
    try{
      var d = new Date(iso);
      var o = Object.assign({ timeZone:'Asia/Jakarta', day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }, opts||{});
      return new Intl.DateTimeFormat('id-ID', o).format(d) + ' WIB';
    }catch(e){ return iso; }
  }
  function fmtTimeShort(iso){
    if(!iso) return '--:--';
    try{ return new Intl.DateTimeFormat('id-ID',{ timeZone:'Asia/Jakarta', hour:'2-digit', minute:'2-digit' }).format(new Date(iso)); }
    catch(e){ return '--:--'; }
  }
  function fmtNum(n, d){
    if(n===null||n===undefined) return '-';
    var f = Number(n);
    if(!isFinite(f)) return '-';
    return f.toLocaleString('id-ID', { maximumFractionDigits:(d==null?2:d), minimumFractionDigits:0 });
  }
  function pipsOf(s){
    // Angka pip yang ditampilkan ke member. Catatan penting: EA TIDAK PERNAH mengirim
    // result_pips/result_point (selalu kosong/0) -- untuk event HIT_INVALIDASI, EA menaruh
    // besaran cut-loss (nilai absolut/positif) di running_pips, bukan result_pips. Jadi:
    // - Pure cut loss (INVALID, belum sempat TP): pakai running_point (nilai saat event
    //   invalidasi itu terjadi), tampilkan NEGATIF karena ini kerugian.
    // - Selain itu (FRESH/ACTIVE/atau sempat TP sebelum invalid): pakai rekor tertinggi
    //   yang pernah dicapai (max_running_point) supaya update live mengikuti tiap TP Hit.
    if(s.status==='INVALID' && (s.farthest_tp_level||0)===0){ var lossMag=s.running_point!=null?Number(s.running_point):(s.max_running_point!=null?Number(s.max_running_point):null); return lossMag!=null?-Math.abs(lossMag)*10:null; }
    if(s.max_running_point!=null) return Number(s.max_running_point)*10;
    return s.running_point!=null ? Number(s.running_point)*10 : null;
  }
  function hasilAkhirInfo(s){
    var farthest = s.farthest_tp_level || 0;
    var pips = pipsOf(s);
    var pipsText = pips!=null ? (pips>=0?'+':'')+fmtNum(pips,1)+' Pips' : '';
    if(s.status==='INVALID' && farthest===0){
      return { text: 'Kena Cut Loss' + (pipsText?' ('+pipsText+')':''), cls:'neg' };
    }
    if(farthest>0){
      return { text: 'TP'+farthest+' tercapai' + (pipsText?' ('+pipsText+')':''), cls:'pos' };
    }
    if(s.status==='FRESH'){
      return { text: 'Belum ada, signal belum aktif', cls:'' };
    }
    return { text: 'Belum ada, signal masih berjalan', cls:'' };
  }
  function wibNowBoundaries(){
    // Hitung batas WIB (UTC+7) hari ini / minggu ini (Senin-Minggu) / bulan ini,
    // dikonversi balik ke UTC ISO untuk query created_at.
    var now = new Date();
    var wib = new Date(now.getTime() + 7*3600*1000);
    var y=wib.getUTCFullYear(), m=wib.getUTCMonth(), d=wib.getUTCDate();
    var todayStartWib = Date.UTC(y,m,d,0,0,0);
    var dow = wib.getUTCDay(); // 0=Sun
    var diffToMon = (dow===0?6:dow-1);
    var weekStartWib = todayStartWib - diffToMon*86400000;
    var monthStartWib = Date.UTC(y,m,1,0,0,0);
    function toUtcIso(wibMillis){ return new Date(wibMillis - 7*3600*1000).toISOString(); }
    return {
      today: toUtcIso(todayStartWib),
      week: toUtcIso(weekStartWib),
      month: toUtcIso(monthStartWib)
    };
  }
  function debounce(fn, ms){
    var t;
    return function(){
      var args = arguments, ctx = this;
      clearTimeout(t);
      t = setTimeout(function(){ fn.apply(ctx, args); }, ms);
    };
  }
  function navigate(path, replace){
    if(state.route.view === 'list') state.list.scrollY = window.scrollY;
    if(replace) history.replaceState({}, '', path);
    else { history.pushState({}, '', path); state.navCount = (state.navCount||0) + 1; }
    
    
    routeFromLocation();
    renderApp();
  }
  document.addEventListener('click', function(e){
    var a = e.target.closest && e.target.closest('[data-ksig-nav]');
    if(!a) return;
    e.preventDefault();
    navigate(a.getAttribute('data-ksig-nav'));
  });
  document.addEventListener('keydown', function(e){
    if(e.key !== 'Enter' && e.key !== ' ') return;
    var a = e.target.closest && e.target.closest('[data-ksig-nav]');
    if(!a) return;
    e.preventDefault();
    navigate(a.getAttribute('data-ksig-nav'));
  });
  document.addEventListener('click', function(e){
  var b = e.target.closest && e.target.closest('[data-ksig-back]');
  if(!b) return;
  e.preventDefault();
  if(state.navCount > 0){ state.navCount--; history.back(); }
  else { navigate(b.getAttribute('data-ksig-back'), true); }
});
document.addEventListener('keydown', function(e){
  if(e.key !== 'Enter' && e.key !== ' ') return;
  var b = e.target.closest && e.target.closest('[data-ksig-back]');
  if(!b) return;
  e.preventDefault();
  if(state.navCount > 0){ state.navCount--; history.back(); }
  else { navigate(b.getAttribute('data-ksig-back'), true); }
});
window.addEventListener('popstate', function(){ routeFromLocation(); renderApp(); });

  function routeFromLocation(){
    var p = location.pathname;
    if(p.indexOf(ROOT_PATH) !== 0){ state.route = { view:'dashboard' }; return; }
    var rest = p.slice(ROOT_PATH.length).replace(new RegExp('/+$'),'');
    if(!rest){ state.route = { view:'dashboard' }; return; }
    var parts = rest.split('/');
    if(parts[0]==='list' && parts[1]){ state.route = { view:'list', status:parts[1] }; state.list.status = parts[1]; return; }
    if(parts[0]==='recap'){ state.route = { view:'recap' }; return; }
    if(parts[0]==='id' && parts[1]){ state.route = { view:'detail', id_zona:decodeURIComponent(parts[1]) }; return; }
    state.route = { view:'dashboard' };
  }

  /* ---------------- boot / auth gate ---------------- */
  function boot(){
    routeFromLocation();
    renderBoot('Menghubungkan ke Kamar Signal…');
    dbg('boot() mulai, renderBoot ditampilkan, akan panggil KamarSupabase.ready()');
    var readyPromise = (window.KamarSupabase && window.KamarSupabase.ready ? window.KamarSupabase.ready() : Promise.resolve(null));
    var timeoutPromise = new Promise(function(resolve, reject){ setTimeout(function(){ reject(new Error('TIMEOUT')); }, 9000); });
    Promise.race([readyPromise, timeoutPromise])
      .then(function(client){
        dbg('KamarSupabase.ready() SELESAI, client ada: ' + (!!client));
        state.client = client || (window.KamarSupabase && window.KamarSupabase.getClient && window.KamarSupabase.getClient());
        if(!state.client){ renderBootError('Koneksi database belum siap. Muat ulang halaman.'); return; }
        // FIX 2026-08-16: checkSession() (lewat state.client.auth.getSession()) pernah
        // ditemukan bisa nyangkut TANPA PERNAH resolve/reject di sebagian browser berbasis
        // WebKit/iOS (termasuk Chrome di iPhone, mesinnya tetap Safari/WebKit) -- dugaan
        // kuat terkait Web Locks API internal Supabase-js yang tidak konsisten di WebKit.
        // Sebelum fix ini, kalau itu terjadi, layar macet SELAMANYA di "Menghubungkan ke
        // Kamar Signal..." karena langkah ini belum punya batas waktu (beda dari langkah
        // connect Supabase di atas yang sudah punya timeoutPromise 9 detik). Sekarang
        // dibungkus timeout yang sama supaya SELALU berakhir dengan pesan + tombol Muat
        // Ulang, tidak pernah diam macet tanpa penjelasan.
        var sessionTimeoutPromise = new Promise(function(resolve, reject){ setTimeout(function(){ reject(new Error('SESSION_TIMEOUT')); }, 9000); });
        return Promise.race([checkSession(), sessionTimeoutPromise]);
      })
      .catch(function(err){
        dbg('boot chain GAGAL/catch: ' + (err && (err.message||String(err))));
        if(err && err.message === 'TIMEOUT'){
          renderBootError('Koneksi ke server lambat atau tersangkut. Coba Muat Ulang. Jika masih gagal terus, hapus aplikasi Kamar Signal dari Home Screen lalu instal ulang dari awal.');
        } else if(err && err.message === 'SESSION_TIMEOUT'){
          renderBootError('Sesi login tersangkut saat memuat. Coba Muat Ulang halaman. Jika masih macet, tutup total browser (bukan cuma tab) lalu buka lagi.');
        } else {
          renderBootError('Gagal memuat Kamar Signal: ' + (err && err.message || err));
        }
      });
  }

  function checkSession(){
    dbg('checkSession: memanggil auth.getSession()');
    return state.client.auth.getSession().then(function(res){
      var session = res && res.data && res.data.session;
      dbg('checkSession: getSession() SELESAI, ada session: ' + (!!session));
      if(!session || !session.user){
        state.user = null; state.approved = false;
        renderApp();
        return;
      }
      state.user = session.user;
      state.accessToken = session.access_token;
      return loadProfileAndAccess();
    });
  }

  function fetchMemberAccessWithRetry(profileId, attemptsLeft){
    var attemptNum = 4 - attemptsLeft;
    dbg('member_access: raw fetch percobaan ke-' + attemptNum + ' dari 3 (bypass supabase-js .from())');
    var url = state.client.supabaseUrl + '/rest/v1/member_access?select=access_kamar_study,locked_by_expired,expires_kamar_study,activation_source&profile_id=eq.' + encodeURIComponent(profileId);
    var ac = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var to = ac ? setTimeout(function(){ dbg('member_access: percobaan ke-' + attemptNum + ' 5 detik lewat, ABORT'); ac.abort(); }, 5000) : null;
    return fetch(url, {
      method: 'GET',
      headers: { 'apikey': state.client.supabaseKey, 'Authorization': 'Bearer ' + (state.accessToken || state.client.supabaseKey) },
      signal: ac ? ac.signal : undefined
    }).then(function(res2){
      if(to) clearTimeout(to);
      dbg('member_access: percobaan ke-' + attemptNum + ' response DITERIMA, status=' + res2.status);
      if(!res2.ok) return res2.text().then(function(t){ throw new Error('HTTP ' + res2.status + ': ' + t); });
      return res2.json();
    }).then(function(arr){
      dbg('member_access: percobaan ke-' + attemptNum + ' .json() SELESAI, jumlah baris: ' + (Array.isArray(arr) ? arr.length : 'bukan-array'));
      return { data: (Array.isArray(arr) && arr.length) ? arr[0] : null, error: null };
    }).catch(function(err){
      if(to) clearTimeout(to);
      dbg('member_access: percobaan ke-' + attemptNum + ' GAGAL: ' + (err && (err.message||String(err))));
      if(attemptsLeft > 1){
        dbg('member_access: coba lagi (percobaan berikutnya)...');
        return fetchMemberAccessWithRetry(profileId, attemptsLeft - 1);
      }
      var e2 = new Error('QUERY_TIMEOUT:member_access (3x percobaan gagal semua)');
      throw e2;
    });
  }

  function loadProfileAndAccess(){
    dbg('loadProfileAndAccess: LEWAT API SERVER /api/kamar-signal-access (bukan langsung ke Supabase dari HP) -- eksperimen krn query langsung dari HP ke Supabase terbukti macet total intermiten, coba lewatkan server Vercel dulu');
    var url = '/api/kamar-signal-access?user_id=' + encodeURIComponent(state.user.id);
    var ac = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var to = ac ? setTimeout(function(){ dbg('loadProfileAndAccess: API server 8 detik lewat, ABORT'); ac.abort(); }, 8000) : null;
    return fetch(url, {
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + (state.accessToken || '') },
      signal: ac ? ac.signal : undefined
    }).then(function(res){
      if(to) clearTimeout(to);
      dbg('loadProfileAndAccess: API server response DITERIMA, status=' + res.status);
      if(!res.ok) return res.text().then(function(t){ throw new Error('HTTP ' + res.status + ': ' + t); });
      return res.json();
    }).then(function(arr){
      dbg('loadProfileAndAccess: API server .json() SELESAI, jumlah baris: ' + (Array.isArray(arr) ? arr.length : 'bukan-array'));
      var row = (Array.isArray(arr) && arr.length) ? arr[0] : null;
      state.profile = row ? { id: row.id, account_status: row.account_status, full_name: row.full_name, email: row.email, telegram_chat_id: row.telegram_chat_id } : null;
      if(!state.profile){ state.approved = false; renderApp(); return; }
      var accessRaw = row.member_access;
      state.access = Array.isArray(accessRaw) ? (accessRaw[0]||null) : (accessRaw || null);
      var accountOk = state.profile && state.profile.account_status === 'active';
      var accessOk = state.access && state.access.access_kamar_study === true && state.access.locked_by_expired !== true;
      state.approved = !!(accountOk && accessOk);
      dbg('loadProfileAndAccess: approved dihitung: ' + state.approved + ', akan panggil renderApp()');
      renderApp();
      dbg('renderApp() SELESAI dipanggil');
      if(state.approved){
        dbg('approved true, akan panggil startRealtime/loadReadsMap/ensureFreshPushSubscription');
        startRealtime();
        loadReadsMap();
        ensureFreshPushSubscription();
        dbg('startRealtime/loadReadsMap/ensureFreshPushSubscription SELESAI dipanggil (bagian sinkron)');
      }
    }).catch(function(err){
      if(to) clearTimeout(to);
      dbg('loadProfileAndAccess: GAGAL/catch: ' + (err && (err.message||String(err))));
      if(err && err.name === 'AbortError'){
        renderBootError('Server macet/lambat lebih dari 8 detik. Coba Muat Ulang.');
        return;
      }
      state.approved = false;
      renderApp();
    });
  }

  function doLogin(email, password, onDone){
    state.client.auth.signInWithPassword({ email:email, password:password }).then(function(res){
      if(res.error){ onDone(res.error.message || 'Login gagal.'); return; }
      state.user = res.data.user;
      onDone(null);
      renderBoot('Login berhasil, membuka Kamar Signal…');
      loadProfileAndAccess();
    }).catch(function(err){
      onDone(err && err.message || 'Login gagal.');
      renderBootError('Terjadi kesalahan setelah login: ' + (err && err.message || err));
    });
  }

  function doLogout(){
    stopRealtime();
    state.client.auth.signOut().then(function(){
      state.user = null; state.profile = null; state.access = null; state.approved = false;
      navigate(ROOT_PATH, true);
    });
  }

  /* ---------------- realtime ---------------- */
  var rtChannel = null;
  function startRealtime(){
    if(rtChannel) return;
    state.realtimeStatus = 'connecting';
    updateLiveDot();
    try{
      rtChannel = state.client.channel('kamar-signal-live')
        .on('postgres_changes', { event:'INSERT', schema:'public', table:'signal_events' }, function(payload){
          onLiveEvent(payload);
        })
        .subscribe(function(status){
          if(status === 'SUBSCRIBED') state.realtimeStatus = 'on';
          else if(status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') state.realtimeStatus = 'warn';
          else if(status === 'CLOSED') state.realtimeStatus = 'off';
          updateLiveDot();
        });
    }catch(e){ state.realtimeStatus = 'warn'; updateLiveDot(); }
  }
  function stopRealtime(){
    if(rtChannel){ try{ state.client.removeChannel(rtChannel); }catch(e){} rtChannel = null; }
    state.realtimeStatus = 'off';
  }
  // v2: _rtRender dulunya dimatikan pakai timer tetap 2.5 detik. Kalau koneksi
  // member lambat, refreshCounts/loadList/loadDetail/loadActivity kadang baru
  // selesai SETELAH 2.5 detik itu - akibatnya render ulang datang saat flag
  // sudah balik false, jadi angka/kartu update instan tanpa animasi fade atau
  // count-up/down sama sekali (dilaporkan member 2026-08-14). Fix: flag dimatikan
  // setelah semua request beneran selesai (Promise.all), bukan pakai jangka waktu
  // tebakan. Timer 8 detik cuma jaring pengaman kalau ada request yang nyangkut.
  var onLiveEventDebounced = debounce(function(){
    state._rtRender = true;
    clearTimeout(window.__kamarRtFlagTimer);
    window.__kamarRtFlagTimer = setTimeout(function(){ state._rtRender = false; }, 8000);
    var kamarRtTasks = [refreshCounts()];
    if(state.route.view === 'list') kamarRtTasks.push(loadList(true));
    if(state.route.view === 'detail') kamarRtTasks.push(loadDetail(state.route.id_zona));
    if(state.route.view === 'dashboard') kamarRtTasks.push(loadActivity());
    Promise.all(kamarRtTasks).catch(function(){}).then(function(){
      clearTimeout(window.__kamarRtFlagTimer);
      state._rtRender = false;
    });
  }, 600);
  function onLiveEvent(payload){
    state.lastUpdate = new Date().toISOString();
    onLiveEventDebounced();
  }
  window.addEventListener('online', function(){ if(state.approved) startRealtime(); });
  window.addEventListener('offline', function(){ state.realtimeStatus = 'off'; updateLiveDot(); });

  // Sebagian browser (terutama Safari/iOS dan PWA yang sudah lama dibiarkan
  // terbuka di background) memblokir Audio.play() otomatis kalau tidak ada
  // interaksi user baru-baru ini - notifikasi baru (NEW_ZONE / Signal Fresh)
  // sering datang saat member TIDAK sedang menyentuh layar, jadi play()
  // gagal diam-diam (di-catch, tidak ada error terlihat). Fix: begitu member
  // sentuh layar pertama kali, siapkan dan "buka kunci" elemen suara yang
  // sama persis dipakai chime (window.__kamarSigSnd) lewat play+pause cepat -
  // beberapa browser lalu mengizinkan play() berikutnya tanpa perlu sentuhan
  // baru lagi.
  function unlockKamarSigSnd(){
    try{
      if(!window.__kamarSigSnd){ window.__kamarSigSnd = new Audio('/assets/sounds/kamar-notif-A-chime.mp3'); window.__kamarSigSnd.volume = 0.5; }
      var snd = window.__kamarSigSnd;
      var p = snd.play();
      if(p && p.then) p.then(function(){ snd.pause(); snd.currentTime = 0; }).catch(function(){});
    }catch(e){}
  }
  document.addEventListener('pointerdown', unlockKamarSigSnd, { once:true, passive:true });
  document.addEventListener('touchstart', unlockKamarSigSnd, { once:true, passive:true });

  /* ---------------- data layer ---------------- */
  // Unread adalah PERSONAL STATE PER MEMBER (bukan status signal). Signal dianggap
  // "belum dibaca" kalau member belum pernah membuka detailnya, ATAU signal tersebut
  // mendapat perkembangan baru (signals.updated_at) setelah terakhir kali member
  // membuka detailnya (signal_member_reads.last_seen_at). Menghitung SIGNAL, bukan event.
  function isUnread(id_zona, updatedAt){
    if(!updatedAt) return false;
    var seen = state.readsMap[id_zona];
    if(!seen) return true;
    var seenMs = new Date(seen).getTime();
    var updMs = new Date(updatedAt).getTime();
    if(!isFinite(seenMs) || !isFinite(updMs)) return false;
    return seenMs < updMs;
  }

  function getChimePrefs(){
  try{ return JSON.parse(localStorage.getItem('kamarSigChimePrefs')||'{}'); }catch(e){ return {}; }
}
function setChimePrefLocal(key, val){
  var p = getChimePrefs();
  p[key] = val;
  try{ localStorage.setItem('kamarSigChimePrefs', JSON.stringify(p)); }catch(e){}
}

function refreshCounts(){
  if(!state.approved) return Promise.resolve();
  if(!state.__knownStatusIds){ state.__knownStatusIds = {fresh:null,aktif:null,profit:null,loss:null}; }
  var statuses = ['fresh','aktif','profit','loss','archive'];
  return Promise.all(statuses.map(function(s){
    var q = state.client.from('signals').select('id_zona,updated_at');
    q = (s === 'archive') ? q.eq('is_archived', true) : q.eq('display_status', s).eq('is_archived', false);
    return q;
  })).then(function(results){
    var prev = state.unreadCounts;
    var next = {};
    var changed = {};
    var newIdsByStatus = {};
    results.forEach(function(r,i){
      var st = statuses[i];
      var rows = (r && r.data) || [];
      state.counts[st] = rows.length;
      var u = state.readsLoaded ? rows.filter(function(row){ return isUnread(row.id_zona, row.updated_at); }).length : (prev[st]||0);
      next[st] = u;
      changed[st] = state.readsLoaded && u !== (prev[st]||0);
      if(st !== 'archive'){
        var curIds = rows.map(function(row){ return row.id_zona; });
        var knownSet = state.__knownStatusIds[st];
        newIdsByStatus[st] = knownSet ? curIds.filter(function(id){ return !knownSet.has(id); }) : [];
        state.__knownStatusIds[st] = new Set(curIds);
      }
    });
    state.unreadCounts = next;
    state.badgeJustChanged = changed;
    try{
      var chimePrefs = getChimePrefs();
      var hasNewFresh = newIdsByStatus.fresh && newIdsByStatus.fresh.length > 0;
      var hasNewAktif = (newIdsByStatus.aktif && newIdsByStatus.aktif.length > 0) && chimePrefs.active === true;
      var hasNewResult = ((newIdsByStatus.profit && newIdsByStatus.profit.length > 0) || (newIdsByStatus.loss && newIdsByStatus.loss.length > 0)) && chimePrefs.result === true;
      if(hasNewFresh || hasNewAktif || hasNewResult){
        if(!window.__kamarSigSnd){window.__kamarSigSnd=new Audio('/assets/sounds/kamar-notif-A-chime.mp3');window.__kamarSigSnd.volume=0.5;}
        window.__kamarSigSnd.currentTime=0;
        window.__kamarSigSnd.play().catch(function(){});
      }
    }catch(kSigSndErr){}
    state.lastUpdate = new Date().toISOString();
    if(state.route.view === 'dashboard') renderApp();
  }).catch(function(){});
}

  function loadReadsMap(){
    if(!state.profile) return Promise.resolve();
    return state.client.from('signal_member_reads').select('id_zona,last_seen_at').eq('profile_id', state.profile.id).then(function(res){
      if(res.error) return;
      var map = {};
      (res.data||[]).forEach(function(r){ map[r.id_zona] = r.last_seen_at; });
      state.readsMap = map;
      state.readsLoaded = true;
      refreshCounts();
      if(state.route.view === 'list' || state.route.view === 'dashboard') renderApp();
    }).catch(function(){});
  }
  function markRead(id_zona){
    if(!state.profile || !id_zona) return;
    var nowIso = new Date().toISOString();
    state.readsMap[id_zona] = nowIso;
    state.client.from('signal_member_reads').upsert({ profile_id: state.profile.id, id_zona: id_zona, last_seen_at: nowIso }, { onConflict:'profile_id,id_zona' }).then(function(){
      refreshCounts();
    }).catch(function(){});
  }
  function markAllRead(status){
    if(!state.profile) return Promise.resolve();
    return state.client.from('signals').select('id_zona,updated_at').eq('display_status', status).then(function(res){
      if(res.error) throw res.error;
      var nowIso = new Date().toISOString();
      var rows = (res.data||[]).filter(function(row){ return isUnread(row.id_zona, row.updated_at); });
      if(!rows.length) return;
      var upsertRows = rows.map(function(row){ return { profile_id: state.profile.id, id_zona: row.id_zona, last_seen_at: nowIso }; });
      return state.client.from('signal_member_reads').upsert(upsertRows, { onConflict:'profile_id,id_zona' }).then(function(){
        rows.forEach(function(row){ state.readsMap[row.id_zona] = nowIso; });
        return refreshCounts();
      });
    }).then(function(){
      renderApp();
    }).catch(function(){});
  }

  function loadList(reset){
    var L = state.list;
    if(reset){ L.page = 0; L.items = []; L.hasMore = true; }
    if(L.loading || (!L.hasMore && !reset)) return Promise.resolve();
    L.loading = true;
    renderApp();
    var unreadOnly = !!L.filters.unread;
    var from = L.page * L.pageSize;
    var to = from + L.pageSize - 1;
    var q = state.client.from('signals').select('id_zona,pair,timeframe,jenis_zona,area_low,area_high,tp1,invalidasi,skenario,status,display_status,farthest_tp_level,running_point,max_running_point,result_point,created_at,updated_at,is_archived,is_critical_zone');
    q = (L.status === 'archive') ? q.eq('is_archived', true) : q.eq('display_status', L.status).eq('is_archived', false);
    if(L.search){
      var s = L.search.replace(/[%,]/g,'');
      q = q.or('pair.ilike.%'+s+'%,id_zona.ilike.%'+s+'%,timeframe.ilike.%'+s+'%');
    }
    if(L.filters.symbol) q = q.eq('pair', L.filters.symbol);
    if(L.filters.timeframe) q = q.eq('timeframe', L.filters.timeframe);
    if(L.filters.dir) q = q.eq('skenario', L.filters.dir);
    if(L.filters.period){
      var b = wibNowBoundaries();
      var since = L.filters.period==='today' ? b.today : (L.filters.period==='week' ? b.week : b.month);
      q = q.gte('created_at', since);
    }
    if(L.sort==='terlama') q = q.order('created_at', { ascending:true });
    else if(L.sort==='pips') q = q.order('result_point', { ascending:false, nullsFirst:false }).order('max_running_point', { ascending:false, nullsFirst:false });
    else if(L.sort==='update') q = q.order('updated_at', { ascending:false });
    else q = q.order('created_at', { ascending:false });
    // Filter "Belum Dibaca" dihitung di sisi client dari signal_member_reads (bukan kolom
    // di tabel signals), jadi kalau filter ini aktif kita ambil seluruh baris status ini
    // (jumlahnya kecil per kategori) lalu saring di client, tanpa pagination server-side.
    if(unreadOnly) q = q.limit(200); else q = q.range(from, to);
    return q.then(function(res){
      if(res.error) throw res.error;
      var rows = res.data || [];
      if(unreadOnly) rows = rows.filter(function(r){ return isUnread(r.id_zona, r.updated_at); });
      L.items = (reset || unreadOnly) ? rows : L.items.concat(rows);
      L.hasMore = unreadOnly ? false : rows.length === L.pageSize;
      L.page += 1;
      L.loading = false;
      L.error = null;
      L.loaded = true;
      L.loadedForStatus = L.status;
      renderApp();
    }).catch(function(err){
      L.loading = false; L.error = 'Data belum dapat dimuat.';
      renderApp();
    });
  }

  function renderRecapCard(){
    var wrap = document.getElementById('ksigRecapCard');
    if(!wrap){ renderApp(); return; }
    var scrollY = window.scrollY;
    wrap.outerHTML = recapCardHtml();
    bindRecapTabs(); bindRecapCustomControls(); bindRecapCalendar();
    renderRecapBody();
    if(Math.abs(window.scrollY - scrollY) > 1) window.scrollTo(0, scrollY);
  }

  function loadRecap(type, periodEndWib){
var R = state.recap;
if(R.type !== type){ R.periods = []; R.periodsLoaded = false; R.periodsLoading = false; }
R.type = type; R.loading = true; R.error = null; R.pickerOpen = false;
renderRecapCard();
// Ambil rekap existing apa adanya. Struktur bisnis existing: satu periode bisa
// mempunyai lebih dari satu baris (per timeframe, dan per pair kalau ada).
// UI hanya mengelompokkan baris-baris ini untuk ditampilkan - tidak menghitung ulang,
// tidak menggabungkan angka, tidak membuat timeframe baru.
// periodEndWib opsional: kalau diisi, ambil periode spesifik itu (dari picker),
// kalau kosong pakai periode terbaru seperti semula.
var q = state.client.from('signal_recaps').select('*').eq('recap_type', type);
if(periodEndWib) q = q.eq('period_end_wib', periodEndWib);
return q.order('period_end_wib', { ascending:false }).order('timeframe', { ascending:true }).limit(periodEndWib ? 200 : 50)
.then(function(res){
if(res.error) throw res.error;
var rows = res.data || [];
if(!periodEndWib && rows.length){
var latestEnd = rows[0].period_end_wib;
rows = rows.filter(function(r){ return r.period_end_wib === latestEnd; });
}
R.rows = rows;
R.selectedPeriod = rows.length ? rows[0].period_end_wib : (periodEndWib || null);
R.loading = false;
R.loaded = true;
renderRecapCard();
if(!R.periodsLoaded && !R.periodsLoading) loadRecapPeriods(type);
}).catch(function(err){
R.loading = false; R.error = 'Data belum dapat dimuat.';
renderRecapCard();
});
}

function loadRecapPeriods(type){
var R = state.recap;
R.periodsLoading = true;
return state.client.from('signal_recaps').select('period_end_wib').eq('recap_type', type)
.order('period_end_wib', { ascending:false }).limit(500)
.then(function(res){
if(res.error) throw res.error;
var seen = {}; var list = [];
(res.data||[]).forEach(function(r){
var k = r.period_end_wib;
if(seen[k]) return; seen[k] = true;
list.push(k);
});
if(type === 'DAILY'){
// Rekap Harian sengaja dibatasi ke bulan berjalan (WIB) saja - tanggal bulan
// lalu otomatis tidak muncul lagi di picker begitu bulan berganti.
var monthStartMs = new Date(wibNowBoundaries().month).getTime();
list = list.filter(function(k){ return new Date(k).getTime() >= monthStartMs; });
}
R.periods = list.slice(0, type === 'DAILY' ? 31 : 24);
R.periodsLoaded = true;
R.periodsLoading = false;
if(state.recap.type === type) renderRecapCard();
}).catch(function(){ R.periodsLoading = false; });
}

  function loadActivity(){
    var A = state.activity;
    A.loading = true; A.error = null;
    return state.client.from('signal_events')
      .select('id,id_zona,event_type,event_title,event_description,tp_level,created_at,signals(pair,timeframe,skenario,display_status,jenis_zona,area_low,area_high,updated_at)')
      .order('created_at', { ascending:false })
      .limit(5)
      .then(function(res){
        if(res.error) throw res.error;
        A.items = res.data || [];
        A.loading = false;
        A.loaded = true;
        renderApp();
      }).catch(function(err){
        A.loading = false; A.error = 'Data belum dapat dimuat.';
        renderApp();
      });
  }

  function loadDetail(id_zona){
    var D = state.detail;
    D.id_zona = id_zona; D.loading = true; D.error = null; D.signal = null; D.events = [];
    renderApp();
    return state.client.from('signals').select('*').eq('id_zona', id_zona).maybeSingle()
      .then(function(res){
        if(res.error) throw res.error;
        D.signal = res.data || null;
        return state.client.from('signal_events').select('*').eq('id_zona', id_zona).order('created_at', { ascending:true });
      })
      .then(function(res){
        if(res && res.error) throw res.error;
        D.events = (res && res.data) || [];
        D.loading = false;
        renderApp();
        markRead(id_zona);
      })
      .catch(function(err){
        D.loading = false; D.error = 'Data belum dapat dimuat.';
        renderApp();
      });
  }

  /* ---------------- rendering: shared bits ---------------- */
  function updateLiveDot(){
    var dots = document.querySelectorAll('#ksigLive');
    dots.forEach(function(dot){
      dot.className = 'ksig-live ' + (state.realtimeStatus==='on'?'on':state.realtimeStatus==='connecting'?'warn':state.realtimeStatus==='warn'?'warn':'off');
      var lbl = dot.querySelector('.ksig-live-label');
      if(lbl) lbl.textContent = state.realtimeStatus==='on' ? 'LIVE' : state.realtimeStatus==='connecting' ? 'Menghubungkan…' : state.realtimeStatus==='warn' ? 'Reconnecting…' : 'Offline';
    });
    updateStickyHeaders();
  }

  /* ---------------- sticky header scroll state (selective glass) ---------------- */
  var stickyTicking = false;
  function updateStickyHeaders(){
    stickyTicking = false;
    var isScrolled = window.scrollY > 6;
    document.querySelectorAll('.ksig-header, .ksig-appbar').forEach(function(h){
      h.classList.toggle('scrolled', isScrolled);
    });
    if(state.route.view === 'list') state.list.scrollY = window.scrollY;
  }
  window.addEventListener('scroll', function(){
    if(stickyTicking) return;
    stickyTicking = true;
    window.requestAnimationFrame(updateStickyHeaders);
  }, { passive:true });

  /* ---------------- subtle cursor-aware highlight (desktop overview cards only) ---------------- */
  var pointerFineMedia = window.matchMedia ? window.matchMedia('(hover:hover) and (pointer:fine)') : null;
  function bindPointerLight(){
    if(!pointerFineMedia || !pointerFineMedia.matches) return;
    document.querySelectorAll('.ksig-pointer-light').forEach(function(card){
      card.addEventListener('mousemove', function(e){
        var r = card.getBoundingClientRect();
        card.style.setProperty('--ksig-px', ((e.clientX-r.left)/r.width*100).toFixed(1)+'%');
        card.style.setProperty('--ksig-py', ((e.clientY-r.top)/r.height*100).toFixed(1)+'%');
      });
    });
  }

  function renderBoot(msg){
    el.innerHTML = '<div class="ksig-boot"><div class="ksig-boot-mark">Kamar Signal</div><div class="ksig-boot-sub">'+esc(msg)+'</div></div>';
  }
  function renderBootError(msg){
    el.innerHTML = '<div class="ksig-boot"><div class="ksig-boot-mark">Kamar Signal</div><div class="ksig-error"><p>'+esc(msg)+'</p><button class="ksig-btn primary" onclick="location.reload()">Coba Lagi</button></div></div>';
  }

  function appBar(title, opts){
    opts = opts || {};
    var back = opts.back ? '<div class="ksig-appbar-back" data-ksig-back="'+esc(opts.back)+'" tabindex="0" role="link" aria-label="Kembali">‹</div>' : '';
    var live = '<div class="ksig-live off" id="ksigLive"><span class="ksig-live-dot"></span><span class="ksig-live-label">Offline</span></div>';
    var install = installAvailable() ? '<button type="button" class="ksig-install-btn" id="ksigInstallBtn" title="Instal Aplikasi">⇩</button>' : '';
    return '<div class="ksig-appbar"><div class="ksig-appbar-inner">'+back+'<div class="ksig-appbar-title">'+esc(title)+'</div>'+install+live+'</div></div>';
  }

  function sectionLabel(text, right){
    return '<div class="ksig-section-label-row"><div class="ksig-section-label">'+esc(text)+'</div>'+(right||'')+'</div>';
  }

  function renderApp(){
    if(!state.client) return;
    if(!state.user){ renderLogin(); return; }
    if(!state.approved){ renderDeny(); return; }
    if(state.route.view === 'list'){ renderList(); return; }
    if(state.route.view === 'recap'){ renderRecap(); return; }
    if(state.route.view === 'detail'){ renderDetail(); return; }
    renderDashboard();
  }

  function renderLogin(){
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
        (installAvailable() ? '<a class="ksig-login-install" id="ksigLoginInstall" tabindex="0">⇩ Instal Kamar Signal sebagai Aplikasi</a>' : '')+
      '</div>'+
      '</div>';
    bindInstallBtn(); bindNotifBtn(); bindTelegramBtn(); bindSettingsBtn();
    var form = document.getElementById('ksigLoginForm');
    form.addEventListener('submit', function(e){
      e.preventDefault();
      var email = document.getElementById('ksigEmail').value.trim();
      var pass = document.getElementById('ksigPassword').value;
      var statusEl = document.getElementById('ksigLoginStatus');
      var btn = document.getElementById('ksigLoginBtn');
      statusEl.className = 'ksig-status-line'; statusEl.textContent = 'Memeriksa akun…';
      btn.disabled = true;
      doLogin(email, pass, function(err){
        btn.disabled = false;
        if(err){ statusEl.className = 'ksig-status-line err'; statusEl.textContent = err; }
      });
    });
  }

  function renderDeny(){
    el.innerHTML =
      appBar('Kamar Signal') +
      '<div class="ksig-main">'+
      '<div class="ksig-center-card" style="margin-top:6vh;text-align:center;">'+
        '<div class="ksig-deny-icon">🔒</div>'+
        '<h1>Akses Belum Aktif</h1>'+
        '<p>Akun Anda belum memiliki akses ke fasilitas Kamar Signal, atau sedang menunggu aktivasi admin. Hubungi admin untuk mengaktifkan fasilitas ini.</p>'+
        '<a class="ksig-btn primary block" href="https://telegram.me/kajianmarketkamar" target="_blank" rel="noopener">Chat Admin</a>'+
        '<div style="height:8px"></div>'+
        '<a class="ksig-btn block" href="/dashboard.html">Kembali ke Dashboard</a>'+
      '</div></div>';
    updateLiveDot();
    bindInstallBtn(); bindNotifBtn(); bindTelegramBtn(); bindSettingsBtn();
  }

  /* ---------------- dashboard ---------------- */
  var OVERVIEW_META = {
    fresh:  { label:'Signal Fresh',  desc:'Signal terbaru' },
    aktif:  { label:'Signal Aktif',  desc:'Signal sedang aktif' },
    profit: { label:'Signal Profit', desc:'Total signal profit' },
    loss:   { label:'Signal Loss',   desc:'Total signal loss' },
    archive:{ label:'Arsip',        desc:'Riwayat signal terarsip' }
  };

  function signalStatusBannerHtml(){
    var a = state.access;
    if(!a || !a.access_kamar_study || !a.expires_kamar_study) return '';
    var dl = Math.ceil((new Date(a.expires_kamar_study).getTime() - Date.now())/86400000);
    if(dl > 7) return '';
    var cls = dl < 0 ? 'ksig-status-banner off' : (dl <= 3 ? 'ksig-status-banner warn-strong' : 'ksig-status-banner warn');
    var txt = dl < 0 ? 'Akses Kamar Signal sudah berakhir.' : (dl === 0 ? 'Akses berakhir hari ini.' : ('Sisa '+dl+' hari akses Kamar Signal.'));
    return '<a class="'+cls+'" href="/member-signal-activate-select.html">'+esc(txt)+' Perpanjang &rarr;</a>';
  }
  function dashboardHeader(animCls){
    var updatedTxt = state.lastUpdate ? 'Terakhir Diperbarui • '+fmtTimeShort(state.lastUpdate) : 'Memuat data…';
    var install = installAvailable() ? '<button type="button" class="ksig-install-btn" id="ksigInstallBtn" title="Instal Aplikasi">⇩</button>' : '';
    var notifBtn = notifBtnHtml();
  var telegramBtn = telegramBtnHtml();
  var settingsBtn = settingsBtnHtml();
    return ksigBackNavHtml() + '<div class="ksig-header'+animCls+'">'+
      '<div class="ksig-header-row">'+
        '<div class="ksig-header-titles">'+
          '<div class="ksig-header-title">Kamar Signal</div>'+
          '<div class="ksig-header-sub">Pantau signal dan perkembangannya</div>'+
          signalStatusBannerHtml()+
        '</div>'+
        '<div class="ksig-header-meta">'+
          '<div class="ksig-live off" id="ksigLive"><span class="ksig-live-dot"></span><span class="ksig-live-label">Offline</span></div>'+
          '<div class="ksig-header-updated">'+esc(updatedTxt)+'</div>'+
          settingsBtn+
          install+
        '</div>'+
      '</div>'+
    '</div>';
  }

  function panduanSectionHtml(animCls){
    function guideCard(icon,title,desc,opts){
      opts = opts || {};
      if(opts.sheetId){
        return '<div class="ksig-guide-card ksig-guide-card-active ksig-pointer-light" id="'+opts.sheetId+'" tabindex="0" role="button">'+
          '<div class="ksig-guide-icon" aria-hidden="true">'+icon+'</div>'+
          '<div class="ksig-guide-body">'+
            '<div class="ksig-guide-title">'+esc(title)+'</div>'+
            '<div class="ksig-guide-desc">'+esc(desc)+'</div>'+
          '</div>'+
          '<div class="ksig-guide-cta">Lihat Panduan \u2192</div>'+
        '</div>';
      }
      return '<div class="ksig-guide-card" aria-disabled="true">'+
        '<div class="ksig-guide-icon" aria-hidden="true">'+icon+'</div>'+
        '<div class="ksig-guide-body">'+
          '<div class="ksig-guide-title">'+esc(title)+'</div>'+
          '<div class="ksig-guide-desc">'+esc(desc)+'</div>'+
        '</div>'+
        '<div class="ksig-guide-cta">Segera Hadir</div>'+
      '</div>';
    }
    return '<div class="'+animCls.trim()+'">'+
      sectionLabel('PANDUAN KAMAR SIGNAL') +
      '<div class="ksig-guide-grid">'+
        guideCard('\u25C7','Aturan Kamar Signal','Ketentuan penggunaan dan panduan member Kamar Signal.') +
        guideCard('\u25C7','Informasi Teknis','Kumpulan panduan teknis: instalasi, notifikasi, Telegram, dan lainnya.', {sheetId:'ksigInfoTeknisCard'}) +
      '</div>'+
    '</div>';
  }
  function openInformasiTeknisSheet(){
    var wrap = document.createElement('div');
    wrap.className = 'ksig-sheet-backdrop';
    var PANDUAN_PDF_URL = 'https://www.kamarkajianmarket.com/panduan/kamar-signal.pdf';
    var TELEGRAM_GUIDE_PDF_URL = 'https://www.kamarkajianmarket.com/panduan/kamar-signal-alert-telegram.pdf';
    var WEBSITE_GUIDE_PDF_URL = 'https://www.kamarkajianmarket.com/panduan/kamar-signal-tampilan-website.pdf';
    function row(title,desc,href){
      if(href){
        return '<a class="ksig-info-row ksig-info-row-active" href="'+esc(href)+'" target="_blank" rel="noopener">'+
          '<div class="ksig-info-row-body"><div class="ksig-info-row-title">'+esc(title)+'</div><div class="ksig-info-row-desc">'+esc(desc)+'</div></div>'+
          '<div class="ksig-info-row-arrow" aria-hidden="true">\u2192</div>'+
        '</a>';
      }
      return '<div class="ksig-info-row" aria-disabled="true">'+
        '<div class="ksig-info-row-body"><div class="ksig-info-row-title">'+esc(title)+'</div><div class="ksig-info-row-desc">'+esc(desc)+'</div></div>'+
        '<div class="ksig-info-row-tag">Segera Hadir</div>'+
      '</div>';
    }
    wrap.innerHTML = '<div class="ksig-sheet">'+
      '<div class="ksig-sheet-handle"></div>'+
      '<div class="ksig-sheet-title">Informasi Teknis</div>'+
      '<div class="ksig-info-list">'+
        row('Instalasi Aplikasi & Notifikasi','Cara instal ke HP, aktifkan notifikasi push, dan hubungkan Telegram.', PANDUAN_PDF_URL) +
        row('Cara Membaca Signal (Telegram)','Panduan arti alert & format pesan Signal di grup Telegram.', TELEGRAM_GUIDE_PDF_URL) +
        row('Cara Membaca Signal (Website/PWA)','Panduan arti tampilan, badge status, dan card pada Kamar Signal Website/PWA.', WEBSITE_GUIDE_PDF_URL) +
      '</div>'+
      '<div class="ksig-sheet-actions"><button class="ksig-btn" id="ksigInfoTeknisClose" style="width:100%">Tutup</button></div>'+
    '</div>';
    document.body.appendChild(wrap);
    wrap.addEventListener('click', function(e){ if(e.target===wrap) wrap.remove(); });
    document.getElementById('ksigInfoTeknisClose').addEventListener('click', function(){ wrap.remove(); });
  }
  function bindInfoTeknisCard(){
    var card = document.getElementById('ksigInfoTeknisCard');
    if(card) card.addEventListener('click', openInformasiTeknisSheet);
  }

  function fmtAccessDate(iso){
    if(!iso) return '-';
    var d = new Date(iso);
    if(isNaN(d.getTime())) return '-';
    var bulan = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
    return String(d.getDate()).padStart(2,'0')+' '+bulan[d.getMonth()]+' '+d.getFullYear();
  }
  function accessCardHtml(){
    var A = state.access;
    if(!A) return '';
    var now = new Date();
    var exp = A.expires_kamar_study ? new Date(A.expires_kamar_study) : null;
    var daysLeft = exp ? Math.ceil((exp - now) / 86400000) : null;
    var locked = A.locked_by_expired === true;
    var status, statusCls, sub;
    if(locked){
      status = 'EXPIRED'; statusCls = 'expired';
      sub = 'Akses Kamar Signal telah berakhir'+(exp ? ' pada '+fmtAccessDate(A.expires_kamar_study) : '')+'.';
    } else if(daysLeft !== null && daysLeft <= 5){
      status = 'SEGERA BERAKHIR'; statusCls = 'warn';
      sub = daysLeft+' HARI TERSISA';
    } else {
      status = 'ACTIVE'; statusCls = 'active';
      sub = daysLeft !== null ? (daysLeft+' HARI TERSISA') : 'Akses aktif';
    }
    var sourceLabel = A.activation_source === 'ib_kamar' ? 'IB Kamar' : (A.activation_source === 'paid' ? 'Akses Berbayar' : (A.activation_source ? esc(A.activation_source) : ''));
    return '<div class="ksig-access-card ksig-pointer-light '+statusCls+'">'+
        '<div class="ksig-access-top-group">'+
          '<div class="ksig-access-top"><span class="ksig-access-label">KAMAR SIGNAL ACCESS</span><span class="ksig-access-status">'+
            '<span class="ksig-access-dot"></span>'+status+'</span></div>'+
          '<div class="ksig-access-days">'+esc(sub)+'</div>'+
          (exp ? '<div class="ksig-access-until">Aktif hingga '+fmtAccessDate(A.expires_kamar_study)+'</div>' : '')+
          (sourceLabel ? '<div class="ksig-access-source">'+sourceLabel+'</div>' : '')+
        '</div>'+
        '<div class="ksig-access-foot"><span class="ksig-access-foot-icon">\u25C7</span><span class="ksig-access-foot-text">Kamar Kajian Market</span></div>'+
      '</div>';
  }
  function installCardHtml(){
    if(isStandaloneMode()){
      return '<div class="ksig-install-card installed ksig-pointer-light">'+
          '<div class="ksig-install-icon">\u25C7</div>'+
          '<div class="ksig-install-body">'+
            '<div class="ksig-install-title">KAMAR SIGNAL APP</div>'+
            '<div class="ksig-install-desc">Kamar Signal sudah terpasang di perangkat ini.</div>'+
          '</div>'+
        '</div>';
    }
    return '<div class="ksig-install-card ksig-pointer-light">'+
        '<div class="ksig-install-icon">\u25C7</div>'+
        '<div class="ksig-install-body">'+
          '<div class="ksig-install-title">KAMAR SIGNAL APP</div>'+
          '<div class="ksig-install-desc">Install Kamar Signal di HP Anda untuk akses yang lebih cepat dan praktis.</div>'+
          '<div class="ksig-install-card-actions">'+
            '<button type="button" class="ksig-install-card-btn android" id="ksigDashInstallBtnAndroid">'+ANDROID_EMOJI+' Android</button>'+
            '<button type="button" class="ksig-install-card-btn ios" id="ksigDashInstallBtnIOS">'+APPLE_EMOJI+' iPhone/iPad</button>'+
          '</div>'+
        '</div>'+
      '</div>';
  }
  function renderDashboard(){
    var c = state.counts;
    var firstPaint = !dashboardEntered;
    function ac(n){ return (firstPaint || state._rtRender) ? ' ksig-fade ksig-stagger-'+n : ''; }
    el.innerHTML =
      dashboardHeader(ac(1)) +
      '<div class="ksig-main ksig-dashboard">'+
'<div class="ksig-top-row">'+
                accessCardHtml() +
        installCardHtml() +
        '</div>'+
        '<div class="'+('ksig-block'+ac(2)).trim()+'">'+
          sectionLabel('SIGNAL OVERVIEW') +
          '<div class="ksig-grid">'+
            card('fresh') + card('aktif') + card('profit') + card('loss') + card('archive') +
          '</div>'+
        '</div>'+
        '<div class="'+('ksig-block'+ac(3)).trim()+'">'+
          sectionLabel('REKAP SIGNAL') +
          recapCardHtml() +
        '</div>'+
        '<div class="'+('ksig-block'+ac(4)).trim()+'">'+
          sectionLabel('AKTIVITAS TERBARU', '<a class="ksig-section-action" data-ksig-nav="/signal/list/aktif" tabindex="0" role="link">Lihat Semua →</a>') +
          '<div class="ksig-activity-card" id="ksigActivityBody"></div>'+
        '</div>'+
        panduanSectionHtml('ksig-block'+ac(5)) +
        '<div class="ksig-minifooter">KAMAR KAJIAN MARKET • KAMAR SIGNAL</div>'+
      '</div>';
    dashboardEntered = true;
    applyCountAnimations(el);
    updateLiveDot();
    bindInstallBtn(); bindNotifBtn(); bindTelegramBtn(); bindSettingsBtn();
    (function(){ var da=document.getElementById('ksigDashInstallBtnAndroid'); if(da) da.addEventListener('click', function(){ openInstallSheet('android'); }); var di=document.getElementById('ksigDashInstallBtnIOS'); if(di) di.addEventListener('click', function(){ openInstallSheet('ios'); }); })();
    bindRecapTabs(); bindRecapCustomControls(); bindRecapCalendar();
    bindInfoTeknisCard();
    bindPointerLight();
    renderRecapBody();
    renderActivityBody();
    if(!state.lastUpdate) refreshCounts();
    if(!state.recap.loaded && !state.recap.loading) loadRecap(state.recap.type);
    if(!state.activity.loaded && !state.activity.loading) loadActivity();
    function card(status){
      var meta = OVERVIEW_META[status];
      var countHtml = state.lastUpdate!=null ? ('<span class="ksig-cnum" data-cnum="dash-'+status+'" data-cval="'+c[status]+'">'+c[status]+'</span>') : '<span class="ksig-skel-inline"></span>';
      var unread = state.readsLoaded ? (state.unreadCounts[status]||0) : 0;
      var badgeHtml = unread>0 ? '<span class="ksig-card-badge'+(state.badgeJustChanged[status]?' ksig-badge-pop':'')+'">'+(unread>99?'99+':unread)+'</span>' : '';
      return '<div class="ksig-card ksig-pointer-light '+status+'" data-ksig-nav="/signal/list/'+status+'" tabindex="0" role="link">'+
        '<div class="ksig-card-top"><span class="ksig-card-label">'+esc(meta.label)+'</span><span class="ksig-card-top-right">'+badgeHtml+'<span class="ksig-card-arrow" aria-hidden="true">↗</span></span></div>'+
        '<div class="ksig-card-count">'+countHtml+'</div>'+
        '<div class="ksig-card-desc">'+esc(meta.desc)+'</div>'+
      '</div>';
    }
  }

  /* ---------------- signal list ---------------- */
  var STATUS_LABEL = { fresh:'Signal Fresh', aktif:'Signal Aktif', profit:'Signal Profit', loss:'Signal Loss', archive:'Arsip Signal' };

  var TIMEFRAME_ORDER = ['M1','M5','M15','M30','H1','H4','Daily'];
  function groupedRowsHtml(items){
    var groups = {}; var order = [];
    items.forEach(function(s){
      var key = (s.timeframe && String(s.timeframe).trim()) ? String(s.timeframe).trim() : 'Lainnya';
      if(!groups[key]){ groups[key] = []; order.push(key); }
      groups[key].push(s);
    });
    var ordered = TIMEFRAME_ORDER.filter(function(k){ return groups[k]; });
    order.forEach(function(k){ if(ordered.indexOf(k)===-1) ordered.push(k); });
    return ordered.map(function(k){
      return '<div class="ksig-tf-section">' +
        '<div class="ksig-tf-header">'+esc(k)+'<span class="ksig-tf-count">'+groups[k].length+'</span></div>' +
        groups[k].map(rowHtml).join('') +
        '</div>';
    }).join('');
  }

  function renderList(){
    var L = state.list;
    var isStatusChange = L.status !== L.loadedForStatus && !L.loading;
    if(isStatusChange){
      L.items = []; L.page = 0; L.hasMore = true; L.loaded = false; L.error = null; L.scrollY = 0;
    }
    var isFirstLoad = !L.loaded && !L.loading && !L.error;
    var restoreScroll = !isFirstLoad && !isStatusChange && L.scrollY;
    var unreadN = state.readsLoaded ? (state.unreadCounts[L.status]||0) : 0;
    var unreadBarHtml = unreadN>0 ? (
      '<div class="ksig-unread-bar">'+
        '<span>'+unreadN+' Belum Dibaca</span>'+
        '<button type="button" class="ksig-mark-all-btn" id="ksigMarkAllRead">Tandai Semua Dibaca</button>'+
      '</div>'
    ) : '';
    el.innerHTML =
      appBar(STATUS_LABEL[L.status] || 'Signal', { back:'/signal/' }) +
      '<div class="ksig-main'+(state._rtRender?' ksig-fade':'')+'">'+
        '<div class="ksig-toolbar">'+
          '<div class="ksig-search"><span aria-hidden="true">🔎</span><input id="ksigSearchInput" placeholder="Cari symbol, ID zona…" value="'+esc(L.search)+'"/></div>'+
          '<div class="ksig-tool-btn'+(hasActiveFilter(L.filters)?' on':'')+'" id="ksigFilterBtn" tabindex="0" role="button" aria-label="Filter"><span class="ksig-tool-icon">⚙</span><span class="ksig-tool-label">Filter</span></div>'+
          '<div class="ksig-tool-btn" id="ksigSortBtn" tabindex="0" role="button" aria-label="Urutkan"><span class="ksig-tool-icon">↕</span><span class="ksig-tool-label">Urutkan</span></div>'+
        '</div>'+
        unreadBarHtml+
        '<div id="ksigListBody"></div>'+
      '</div>';
    updateLiveDot();
    bindInstallBtn(); bindNotifBtn(); bindTelegramBtn(); bindSettingsBtn();
    renderListBody();
    var search = document.getElementById('ksigSearchInput');
    search.addEventListener('input', debounce(function(){ L.search = search.value.trim(); loadList(true); }, 400));
    document.getElementById('ksigFilterBtn').addEventListener('click', openFilterSheet);
    document.getElementById('ksigSortBtn').addEventListener('click', openSortSheet);
    var markAllBtn = document.getElementById('ksigMarkAllRead');
    if(markAllBtn) markAllBtn.addEventListener('click', function(){
      markAllBtn.disabled = true;
      markAllRead(L.status).then(function(){
        if(L.filters.unread) loadList(true); else renderList();
      });
    });
    if(isFirstLoad) loadList(true);
    if(restoreScroll) window.requestAnimationFrame(function(){ window.scrollTo(0, L.scrollY); });
  }
  function hasActiveFilter(f){ return !!(f.symbol||f.timeframe||f.dir||f.period||f.unread); }

  function renderListBody(){
    var body = document.getElementById('ksigListBody');
    if(!body) return;
    var L = state.list;
    if(L.error){ body.innerHTML = '<div class="ksig-error"><p>'+esc(L.error)+'</p><button class="ksig-btn primary" id="ksigRetryList">Coba Lagi</button></div>'; document.getElementById('ksigRetryList').onclick=function(){ loadList(true); }; return; }
    if(L.loading && L.items.length===0){
      body.innerHTML = '<div class="ksig-skel">'+'<div class="ksig-skel-row"></div>'.repeat(5)+'</div>';
      return;
    }
    if(L.items.length===0){
      body.innerHTML = '<div class="ksig-empty"><div class="ksig-empty-title">Tidak ada '+esc((STATUS_LABEL[L.status]||'signal').toLowerCase())+' saat ini.</div>Cek kembali beberapa saat lagi.</div>';
      return;
    }
    var rowsHtml = (L.sort === 'timeframe') ? groupedRowsHtml(L.items) : L.items.map(rowHtml).join('');
    var html = '<div class="ksig-list ksig-fade">' + rowsHtml + '</div>';
    if(L.hasMore) html += '<div class="ksig-loadmore"><button class="ksig-btn block" id="ksigLoadMore">'+(L.loading?'Memuat…':'Muat Lebih Banyak')+'</button></div>';
    body.innerHTML = html;
    var lm = document.getElementById('ksigLoadMore');
    if(lm) lm.addEventListener('click', function(){ loadList(false); });
  }
  function ksigInfoChip(cls, text){ return '<span class="ksig-info-chip '+cls+'">'+esc(text)+'</span>'; }
function rowHtml(s){
    var unread = state.readsLoaded && isUnread(s.id_zona, s.updated_at);
    var dirBadge = s.skenario==='SELL' ? 'sell' : 'buy';
    var infoParts = [];
    if(s.jenis_zona) infoParts.push(ksigInfoChip('ksig-chip-zona', s.jenis_zona));
    if(s.area_low!=null && s.area_high!=null) infoParts.push(ksigInfoChip('ksig-chip-area','Area '+fmtNum(s.area_low)+' – '+fmtNum(s.area_high)));
    var tpVals = [s.tp1,s.tp2,s.tp3].filter(function(v){ return v!=null; }).map(function(v){ return fmtNum(v); });
if(tpVals.length) infoParts.push(ksigInfoChip('ksig-chip-tp','TP '+tpVals.join('/')));
    if(s.invalidasi!=null) infoParts.push(ksigInfoChip('ksig-chip-cl','CL '+fmtNum(s.invalidasi)));
    if(s.display_status!=='fresh'){
      var pips = pipsOf(s);
      if(pips!=null) infoParts.push(ksigInfoChip(pips>=0?'ksig-chip-tp':'ksig-chip-cl',(pips>=0?'+':'')+fmtNum(pips,1)+' Pips'));
    }
    var info = infoParts.join('');
    return '<div class="ksig-row ksig-pointer-light'+(unread?' ksig-row-unread':'')+'" data-ksig-nav="/signal/id/'+encodeURIComponent(s.id_zona)+'" tabindex="0" role="link">'+
      '<div class="ksig-row-main">'+
        '<div class="ksig-row-top"><span class="ksig-row-symbol">'+esc(s.pair)+'</span><span class="ksig-row-tf">'+esc(s.timeframe||'-')+'</span><span class="ksig-badge '+dirBadge+'">'+esc(s.skenario||'-')+'</span><span class="ksig-badge '+s.display_status+'">'+esc(STATUS_LABEL[s.display_status]||s.display_status)+'</span>'+(s.is_critical_zone?'<span class="ksig-badge critical">CRITICAL</span>':'')+(unread?'<span class="ksig-new-badge">NEW</span>':'')+'</div>'+
        (info ? '<div class="ksig-row-info">'+info+'</div>' : '')+
        '<div class="ksig-row-time">'+fmtWIB(s.created_at)+'</div>'+
      '</div>'+
      '<div class="ksig-row-chev" aria-hidden="true">›</div>'+
    '</div>';
  }

  function openFilterSheet(){
    var L = state.list;
    var wrap = document.createElement('div');
    wrap.className = 'ksig-sheet-backdrop';
    wrap.innerHTML =
      '<div class="ksig-sheet">'+
        '<div class="ksig-sheet-handle"></div>'+
        '<div class="ksig-sheet-title">Filter</div>'+
        '<div class="ksig-sheet-group"><div class="ksig-sheet-group-label">Status Baca</div><div class="ksig-chip-row" data-group="unread">'+
          chipOpt('unread','','Semua',L.filters.unread?'x':'') + chipOpt('unread','x','Belum Dibaca',L.filters.unread?'x':'') +
        '</div></div>'+
        '<div class="ksig-sheet-group"><div class="ksig-sheet-group-label">Arah</div><div class="ksig-chip-row" data-group="dir">'+
          chipOpt('dir','','Semua',L.filters.dir) + chipOpt('dir','BUY','Buy',L.filters.dir) + chipOpt('dir','SELL','Sell',L.filters.dir) +
        '</div></div>'+
        '<div class="ksig-sheet-group"><div class="ksig-sheet-group-label">Periode</div><div class="ksig-chip-row" data-group="period">'+
          chipOpt('period','','Semua',L.filters.period) + chipOpt('period','today','Hari Ini',L.filters.period) + chipOpt('period','week','Minggu Ini',L.filters.period) + chipOpt('period','month','Bulan Ini',L.filters.period) +
        '</div></div>'+
        '<div class="ksig-sheet-actions"><button class="ksig-btn" id="ksigFilterReset">Reset</button><button class="ksig-btn primary" id="ksigFilterApply">Terapkan</button></div>'+
      '</div>';
    document.body.appendChild(wrap);
    var pending = Object.assign({}, L.filters, { unread: L.filters.unread?'x':'' });
    wrap.querySelectorAll('.ksig-chip-opt').forEach(function(chip){
      chip.addEventListener('click', function(){
        var group = chip.closest('[data-group]').getAttribute('data-group');
        pending[group] = chip.getAttribute('data-val');
        wrap.querySelectorAll('[data-group="'+group+'"] .ksig-chip-opt').forEach(function(c){ c.classList.toggle('active', c===chip); });
      });
    });
    wrap.addEventListener('click', function(e){ if(e.target===wrap) document.body.removeChild(wrap); });
    document.getElementById('ksigFilterReset').addEventListener('click', function(){
      L.filters = { symbol:'', timeframe:'', dir:'', period:'', unread:false };
      document.body.removeChild(wrap);
      loadList(true); renderList();
    });
    document.getElementById('ksigFilterApply').addEventListener('click', function(){
      L.filters = Object.assign({}, pending, { unread: pending.unread==='x' });
      document.body.removeChild(wrap);
      loadList(true); renderList();
    });
  }
  function chipOpt(group,val,label,current){
    return '<div class="ksig-chip-opt'+(current===val?' active':'')+'" data-val="'+esc(val)+'">'+esc(label)+'</div>';
  }

  function openSortSheet(){
    var L = state.list;
    var options = [ ['terbaru','Terbaru'], ['terlama','Terlama'], ['update','Update Terbaru'], ['pips','Pips Terbesar'], ['timeframe','Berdasarkan Timeframe'] ];
    var wrap = document.createElement('div');
    wrap.className = 'ksig-sheet-backdrop';
    wrap.innerHTML = '<div class="ksig-sheet"><div class="ksig-sheet-handle"></div><div class="ksig-sheet-title">Urutkan</div><div class="ksig-chip-row">'+
      options.map(function(o){ return chipOpt('sort',o[0],o[1],L.sort); }).join('') + '</div></div>';
    document.body.appendChild(wrap);
    wrap.querySelectorAll('.ksig-chip-opt').forEach(function(chip){
      chip.addEventListener('click', function(){
        L.sort = chip.getAttribute('data-val');
        document.body.removeChild(wrap);
        loadList(true); renderList();
      });
    });
    wrap.addEventListener('click', function(e){ if(e.target===wrap) document.body.removeChild(wrap); });
  }

  /* ---------------- rekap signal ---------------- */
  function recapCardHtml(){
    var R = state.recap;
    return '<div class="ksig-recap-card" id="ksigRecapCard">'+
'<div class="ksig-recap-toprow">'+
      '<div class="ksig-tabs" role="tablist">'+
        tab('DAILY','Harian') + tab('WEEKLY','Mingguan') + tab('MONTHLY','Bulanan') + tab('CUSTOM','Custom') +
      '</div>'+
      '<button type="button" class="ksig-cal-btn" id="ksigRecapCalBtn" aria-label="Pilih rentang tanggal" title="Pilih rentang tanggal"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="5" width="18" height="16" rx="3" stroke="currentColor" stroke-width="2"/><path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>'+
'</div>'+
(R.type==='CUSTOM' ? recapCustomRangeHtml() : '') +
      '<div id="ksigRecapBody"></div>'+
(R.calOpen ? ksigCalPopupHtml() : '') +
    '</div>';
    function tab(type,label){
      return '<div class="ksig-tab'+(R.type===type?' active':'')+'" data-type="'+type+'" tabindex="0" role="tab" aria-selected="'+(R.type===type?'true':'false')+'">'+label+'</div>';
    }
  }
  var CAL_MONTHS_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
var CAL_DOW_ID = ['Sen','Sel','Rab','Kam','Jum','Sab','Min'];
function ksigCalEnsureView(){
var R = state.recap;
if(R.calViewYear==null || R.calViewMonth==null){
var t0 = wibTodayYmd();
R.calViewYear = t0.y; R.calViewMonth = t0.m;
}
}
function ksigDateLabel(dStr){
var p = dStr.split('-').map(Number);
return p[2]+' '+CAL_MONTHS_ID[p[1]-1]+' '+p[0];
}
function ksigCalPopupHtml(){
ksigCalEnsureView();
var R = state.recap;
var y = R.calViewYear, m = R.calViewMonth;
var firstDow = (new Date(Date.UTC(y,m,1)).getUTCDay()+6)%7;
var daysInMonth = new Date(Date.UTC(y,m+1,0)).getUTCDate();
var t0 = wibTodayYmd();
var todayStr = ymdStr(t0.y,t0.m,t0.d);
var cells = '';
for(var i=0;i<firstDow;i++) cells += '<div class="ksig-cal-cell empty"></div>';
for(var d=1; d<=daysInMonth; d++){
var dStr = ymdStr(y,m,d);
var isSel = (R.calStart===dStr) || (R.calEnd===dStr);
var inRange = !!(R.calStart && R.calEnd && dStr>R.calStart && dStr<R.calEnd);
var isFuture = dStr>todayStr;
var cls = 'ksig-cal-cell'+(isSel?' selected':'')+(inRange?' in-range':'')+(dStr===todayStr?' today':'')+(isFuture?' disabled':'');
cells += '<div class="'+cls+'" data-date="'+(isFuture?'':dStr)+'">'+d+'</div>';
}
var rangeTxt = R.calStart ? (ksigDateLabel(R.calStart) + (R.calEnd && R.calEnd!==R.calStart ? ' \u2013 '+ksigDateLabel(R.calEnd) : '')) : 'Pilih tanggal mulai';
return '<div class="ksig-cal-popup-backdrop" id="ksigCalBackdrop">'+
'<div class="ksig-cal-popup" id="ksigCalPopup">'+
'<div class="ksig-cal-head">'+
'<button type="button" class="ksig-cal-nav" id="ksigCalPrev" aria-label="Bulan sebelumnya">\u2039</button>'+
'<div class="ksig-cal-title"><span class="ksig-cal-month-part" id="ksigCalMonthPart" title="Gulir untuk ganti bulan">'+CAL_MONTHS_ID[m]+'</span> <span class="ksig-cal-year-part" id="ksigCalYearPart" title="Gulir untuk ganti tahun">'+y+'</span></div>'+
'<button type="button" class="ksig-cal-nav" id="ksigCalNext" aria-label="Bulan berikutnya">\u203a</button>'+
'</div>'+
'<div class="ksig-cal-dow">'+CAL_DOW_ID.map(function(dn){return '<div>'+dn+'</div>';}).join('')+'</div>'+
'<div class="ksig-cal-grid">'+cells+'</div>'+
'<div class="ksig-cal-range-label">'+esc(rangeTxt)+'</div>'+
'<div class="ksig-cal-actions"><button type="button" class="ksig-btn" id="ksigCalCancel">Batal</button><button type="button" class="ksig-btn primary" id="ksigCalApply"'+(!(R.calStart&&R.calEnd)?' disabled':'')+'>Terapkan</button></div>'+
'</div>'+
'</div>';
}
function ksigCalWheelStep(isYear, deltaY){
var R = state.recap;
if(R.__calWheelBusy) return;
R.__calWheelBusy = true;
setTimeout(function(){ R.__calWheelBusy = false; }, 180);
ksigCalEnsureView();
if(isYear){
if(deltaY > 0) R.calViewYear++; else if(deltaY < 0) R.calViewYear--;
} else {
if(deltaY > 0){ R.calViewMonth++; if(R.calViewMonth>11){R.calViewMonth=0; R.calViewYear++;} }
else if(deltaY < 0){ R.calViewMonth--; if(R.calViewMonth<0){R.calViewMonth=11; R.calViewYear--;} }
}
renderRecapCard();
}
function bindRecapCalendar(){
var btn = document.getElementById('ksigRecapCalBtn');
if(btn) btn.addEventListener('click', function(e){
e.stopPropagation();
state.recap.calOpen = true;
renderRecapCard();
});
var backdrop = document.getElementById('ksigCalBackdrop');
if(!backdrop) return;
backdrop.addEventListener('click', function(e){ if(e.target===backdrop){ state.recap.calOpen=false; renderRecapCard(); } });
var prevBtn = document.getElementById('ksigCalPrev');
if(prevBtn) prevBtn.addEventListener('click', function(){
ksigCalEnsureView();
var R=state.recap; R.calViewMonth--; if(R.calViewMonth<0){R.calViewMonth=11; R.calViewYear--;}
renderRecapCard();
});
var nextBtn = document.getElementById('ksigCalNext');
if(nextBtn) nextBtn.addEventListener('click', function(){
ksigCalEnsureView();
var R=state.recap; R.calViewMonth++; if(R.calViewMonth>11){R.calViewMonth=0; R.calViewYear++;}
renderRecapCard();
});
var monthPart = document.getElementById('ksigCalMonthPart');
if(monthPart) monthPart.addEventListener('wheel', function(e){ e.preventDefault(); ksigCalWheelStep(false, e.deltaY); }, { passive:false });
var yearPart = document.getElementById('ksigCalYearPart');
if(yearPart) yearPart.addEventListener('wheel', function(e){ e.preventDefault(); ksigCalWheelStep(true, e.deltaY); }, { passive:false });
document.querySelectorAll('.ksig-cal-cell[data-date]').forEach(function(cell){
cell.addEventListener('click', function(){
var dStr = cell.getAttribute('data-date');
if(!dStr) return;
var R = state.recap;
if(!R.calStart || (R.calStart && R.calEnd)){ R.calStart = dStr; R.calEnd = null; }
else { if(dStr < R.calStart){ R.calEnd = R.calStart; R.calStart = dStr; } else { R.calEnd = dStr; } }
renderRecapCard();
});
});
var calCancelBtn = document.getElementById('ksigCalCancel');
if(calCancelBtn) calCancelBtn.addEventListener('click', function(){ state.recap.calOpen=false; state.recap.calStart=null; state.recap.calEnd=null; renderRecapCard(); });
var calApplyBtn = document.getElementById('ksigCalApply');
if(calApplyBtn) calApplyBtn.addEventListener('click', function(){
var R = state.recap;
if(!R.calStart || !R.calEnd) return;
var fp = R.calStart.split('-').map(Number), tp = R.calEnd.split('-').map(Number);
var startMs = Date.UTC(fp[0], fp[1]-1, fp[2], 0,0,0);
var endMs = Date.UTC(tp[0], tp[1]-1, tp[2], 0,0,0) + 86400000;
var startIso = new Date(startMs - 7*3600*1000).toISOString();
var endIso = new Date(endMs - 7*3600*1000).toISOString();
var lbl = ksigDateLabel(R.calStart) + (R.calStart!==R.calEnd ? ' \u2013 '+ksigDateLabel(R.calEnd) : '');
R.calOpen = false;
R.type = 'CUSTOM';
R.customPreset = 'custom';
R.customFrom = R.calStart; R.customTo = R.calEnd;
loadRecapCustomRange(startIso, endIso, lbl);
});
}
function recapPeriodLabel(iso, type){
if(!iso) return 'Terbaru';
if(type === 'MONTHLY') return fmtWIB(iso, { day:undefined, month:'long', year:'numeric', hour:undefined, minute:undefined });
return fmtWIB(iso, { hour:undefined, minute:undefined });
}
function recapPeriodPickerHtml(){
var R = state.recap;
if(!R.periods || R.periods.length <= 1) return '';
var label = recapPeriodLabel(R.selectedPeriod, R.type);
var menu = R.periods.map(function(p){
var active = p === R.selectedPeriod;
return '<div class="ksig-recap-picker-item'+(active?' active':'')+'" data-period="'+esc(p)+'">'+esc(recapPeriodLabel(p, R.type))+'</div>';
}).join('');
return '<div class="ksig-recap-picker">'+
'<button type="button" class="ksig-recap-picker-btn" id="ksigRecapPeriodBtn" aria-label="Pilih tanggal" title="'+esc(label)+'">'+
'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="5" width="18" height="16" rx="3" stroke="currentColor" stroke-width="2"/><path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'+
'</button>'+
'<div class="ksig-recap-picker-menu'+(R.pickerOpen?' open':'')+'" id="ksigRecapPeriodMenu">'+menu+'</div>'+
'</div>';
}
var CUSTOM_PRESETS = [
['today','Hari Ini'],
['yesterday','Kemarin'],
['3d','3 Hari Terakhir'],
['1w','1 Minggu'],
['1m','1 Bulan'],
['custom','Pilih Tanggal']
];
function wibTodayYmd(){
var wib = new Date(Date.now() + 7*3600*1000);
return { y: wib.getUTCFullYear(), m: wib.getUTCMonth(), d: wib.getUTCDate() };
}
function ymdStr(y,m,d){ return y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0'); }
function recapCustomRangeHtml(){
var R = state.recap;
var preset = R.customPreset || 'today';
var chips = CUSTOM_PRESETS.map(function(p){
return '<button type="button" class="ksig-recap-preset-btn'+(preset===p[0]?' active':'')+'" data-preset="'+p[0]+'">'+esc(p[1])+'</button>';
}).join('');
var dateRow = '';
if(preset === 'custom'){
dateRow = '<div class="ksig-recap-daterange-row">'+
'<input type="date" class="ksig-recap-date-input" id="ksigCustomFrom" value="'+esc(R.customFrom||'')+'">'+
'<span class="ksig-recap-daterange-sep">\u2013</span>'+
'<input type="date" class="ksig-recap-date-input" id="ksigCustomTo" value="'+esc(R.customTo||'')+'">'+
'<button type="button" class="ksig-recap-apply-btn" id="ksigCustomApply">Terapkan</button>'+
'</div>';
}
return '<div class="ksig-recap-customrange">'+
'<div class="ksig-recap-preset-row">'+chips+'</div>'+
dateRow+
'</div>';
}
function loadRecapCustomRange(startIso, endIso, label){
var R = state.recap;
R.loading = true; R.error = null;
renderRecapCard();
return state.client.from('signal_recaps').select('*').eq('recap_type','DAILY')
.gte('period_end_wib', startIso).lt('period_end_wib', endIso)
.order('period_end_wib', { ascending:false }).order('timeframe', { ascending:true }).limit(1000)
.then(function(res){
if(res.error) throw res.error;
R.rows = res.data || [];
R.customRangeLabel = label;
R.loading = false;
R.loaded = true;
renderRecapCard();
}).catch(function(err){
R.loading = false; R.error = 'Data belum dapat dimuat.';
renderRecapCard();
});
}
function applyCustomPreset(key){
var R = state.recap;
R.customPreset = key;
if(key === 'custom'){
if(!R.customFrom || !R.customTo){
var t0 = wibTodayYmd();
R.customFrom = ymdStr(t0.y,t0.m,t0.d);
R.customTo = ymdStr(t0.y,t0.m,t0.d);
}
renderRecapCard();
return;
}
var t = wibTodayYmd();
var todayStart = Date.UTC(t.y,t.m,t.d,0,0,0);
var DAY = 86400000;
var startMs, endMs, label;
if(key==='today'){ startMs=todayStart; endMs=todayStart+DAY; label='Hari Ini'; }
else if(key==='yesterday'){ startMs=todayStart-DAY; endMs=todayStart; label='Kemarin'; }
else if(key==='3d'){ startMs=todayStart-2*DAY; endMs=todayStart+DAY; label='3 Hari Terakhir'; }
else if(key==='1w'){ startMs=todayStart-6*DAY; endMs=todayStart+DAY; label='1 Minggu Terakhir'; }
else if(key==='1m'){ startMs=todayStart-29*DAY; endMs=todayStart+DAY; label='1 Bulan Terakhir'; }
else { return; }
var startIso = new Date(startMs - 7*3600*1000).toISOString();
var endIso = new Date(endMs - 7*3600*1000).toISOString();
loadRecapCustomRange(startIso, endIso, label);
}
function applyCustomRange(){
var R = state.recap;
if(!R.customFrom || !R.customTo) return;
var fp = R.customFrom.split('-').map(Number);
var tp = R.customTo.split('-').map(Number);
var startMs = Date.UTC(fp[0], fp[1]-1, fp[2], 0,0,0);
var endMs = Date.UTC(tp[0], tp[1]-1, tp[2], 0,0,0) + 86400000;
if(endMs <= startMs) return;
var startIso = new Date(startMs - 7*3600*1000).toISOString();
var endIso = new Date(endMs - 7*3600*1000).toISOString();
var lbl = (R.customFrom === R.customTo)
? fmtWIB(startIso,{hour:undefined,minute:undefined})
: (fmtWIB(startIso,{hour:undefined,minute:undefined}) + ' \u2013 ' + fmtWIB(new Date(endMs-86400000-7*3600*1000).toISOString(),{hour:undefined,minute:undefined}));
loadRecapCustomRange(startIso, endIso, lbl);
}
function aggregateRecapRowsByTimeframe(rows){
var map = {}, order = [];
rows.forEach(function(r){
var tf = r.timeframe || 'Semua Timeframe';
if(!map[tf]){ map[tf] = { timeframe: tf, total_signal:0, total_buy:0, total_sell:0, total_profit:0, total_loss:0, total_pips:0 }; order.push(tf); }
var g = map[tf];
g.total_signal += Number(r.total_signal||0);
g.total_buy += Number(r.total_buy||0);
g.total_sell += Number(r.total_sell||0);
g.total_profit += Number(r.total_profit||0);
g.total_loss += Number(r.total_loss||0);
g.total_pips += Number(r.total_pips||0);
});
var ordered = TIMEFRAME_ORDER.filter(function(k){ return map[k]; });
order.forEach(function(k){ if(ordered.indexOf(k)===-1) ordered.push(k); });
return ordered.map(function(tf){
var g = map[tf];
var decided = g.total_profit + g.total_loss;
g.winrate = decided>0 ? (g.total_profit/decided*100) : null;
return g;
});
}
function recapSummaryHtml(rows){
var buyN=0, sellN=0, profitN=0, lossN=0, pipsN=0, signalN=0;
rows.forEach(function(r){
buyN += Number(r.total_buy||0);
sellN += Number(r.total_sell||0);
profitN += Number(r.total_profit||0);
lossN += Number(r.total_loss||0);
pipsN += Number(r.total_pips||0);
signalN += Number(r.total_signal||0);
});
var decided = profitN + lossN;
var winrateN = decided > 0 ? (profitN/decided*100) : null;
var pipsTxt = (pipsN>=0?'+':'')+fmtNum(pipsN,1)+' Pips';
var pipsCls = pipsN<0 ? 'neg' : 'pos';
function sumItem(label, val){
return '<div class="ksig-recap-summary-item"><span class="ksig-recap-summary-val">'+esc(val)+'</span><span class="ksig-recap-summary-label">'+esc(label)+'</span></div>';
}
return '<div class="ksig-recap-summary">'+
'<div class="ksig-recap-summary-head"><span>Ringkasan Periode</span><span class="ksig-recap-summary-pips '+pipsCls+'">'+esc(pipsTxt)+'</span></div>'+
'<div class="ksig-recap-summary-grid">'+
sumItem('Total Signal', signalN) +
sumItem('Buy', buyN) +
sumItem('Sell', sellN) +
sumItem('Profit', profitN) +
sumItem('Loss', lossN) +
sumItem('Winrate', winrateN!=null ? (fmtNum(winrateN,1)+'%') : '-') +
'</div>'+
'</div>';
}
function bindRecapTabs(){
    document.querySelectorAll('.ksig-tab').forEach(function(t){
      t.addEventListener('click', function(){ var ty=t.getAttribute('data-type'); if(ty===state.recap.type) return; if(ty==='CUSTOM'){ state.recap.type='CUSTOM'; applyCustomPreset(state.recap.customPreset||'today'); } else { loadRecap(ty); } });
      t.addEventListener('keydown', function(e){
        if(e.key!=='Enter' && e.key!==' ') return;
        e.preventDefault();
        var ty=t.getAttribute('data-type'); if(ty===state.recap.type) return; if(ty==='CUSTOM'){ state.recap.type='CUSTOM'; applyCustomPreset(state.recap.customPreset||'today'); } else { loadRecap(ty); }
      });
    });
  
  var pbtn = document.getElementById('ksigRecapPeriodBtn');
  if(pbtn){
    pbtn.addEventListener('click', function(e){
      e.stopPropagation();
      state.recap.pickerOpen = !state.recap.pickerOpen;
      renderRecapCard();
    });
  }
  document.querySelectorAll('.ksig-recap-picker-item').forEach(function(it){
    it.addEventListener('click', function(){
      var p = it.getAttribute('data-period');
      state.recap.pickerOpen = false;
      if(p !== state.recap.selectedPeriod) loadRecap(state.recap.type, p);
      else renderRecapCard();
    });
  });
  if(state.recap.pickerOpen){
    document.addEventListener('click', function closePicker(e){
      if(!e.target.closest('.ksig-recap-picker')){ state.recap.pickerOpen = false; renderRecapCard(); }
      document.removeEventListener('click', closePicker);
    }, { once:true });
  }
}
  function bindRecapCustomControls(){
document.querySelectorAll('.ksig-recap-preset-btn').forEach(function(b){
b.addEventListener('click', function(){ applyCustomPreset(b.getAttribute('data-preset')); });
});
var fromInput = document.getElementById('ksigCustomFrom');
if(fromInput) fromInput.addEventListener('change', function(){ state.recap.customFrom = fromInput.value; });
var toInput = document.getElementById('ksigCustomTo');
if(toInput) toInput.addEventListener('change', function(){ state.recap.customTo = toInput.value; });
var applyBtn = document.getElementById('ksigCustomApply');
if(applyBtn) applyBtn.addEventListener('click', applyCustomRange);
}
function groupRecapRows(rows){
    var order = [], map = {};
    rows.forEach(function(r){
      var tf = r.timeframe || 'Semua Timeframe';
      if(!map[tf]){ map[tf] = []; order.push(tf); }
      map[tf].push(r);
    });
    var ordered = TIMEFRAME_ORDER.filter(function(k){ return map[k]; });
    order.forEach(function(k){ if(ordered.indexOf(k)===-1) ordered.push(k); });
    return ordered.map(function(tf){ return { timeframe: tf, rows: map[tf] }; });
  }
  function recapRowLine(label, r, sub){
    var pipsVal = r.total_pips!=null ? Number(r.total_pips) : null;
    var pipsTxt = pipsVal!=null ? (pipsVal>=0?'+':'')+fmtNum(pipsVal,1)+' Pips' : '-';
    var pipsCls = pipsVal!=null && pipsVal<0 ? 'neg' : 'pos';
    return '<div class="ksig-recap-row'+(sub?' sub':'')+'">'+
      '<div class="ksig-recap-row-top"><span class="ksig-recap-row-label">'+esc(label)+'</span><span class="ksig-recap-row-pips '+pipsCls+'">'+esc(pipsTxt)+'</span></div>'+
      '<div class="ksig-recap-row-stats">'+(r.total_signal||0)+' Signal • '+(r.total_profit||0)+' Profit • '+(r.total_loss||0)+' Loss • Winrate '+(r.winrate!=null?fmtNum(r.winrate,1)+'%':'-')+'</div>'+
    '</div>';
  }
  function recapTimeframeGroupHtml(g){
    if(g.rows.length === 1){
      return recapRowLine(g.timeframe, g.rows[0]);
    }
    return '<div class="ksig-recap-tf-block">'+
      '<div class="ksig-recap-tf-heading">'+esc(g.timeframe)+'</div>'+
      g.rows.map(function(r){ return recapRowLine(r.pair || '-', r, true); }).join('') +
    '</div>';
  }
  function renderRecapBody(){
    var body = document.getElementById('ksigRecapBody');
    if(!body) return;
    var R = state.recap;
    if(R.loading){ body.innerHTML = '<div class="ksig-skel"><div class="ksig-skel-row" style="height:52px"></div><div class="ksig-skel-row" style="height:52px"></div></div>'; return; }
    if(R.error){ body.innerHTML = '<div class="ksig-error"><p>'+esc(R.error)+'</p><button class="ksig-btn primary" id="ksigRetryRecap">Coba Lagi</button></div>'; var rb=document.getElementById('ksigRetryRecap'); if(rb) rb.onclick=function(){ loadRecap(R.type); }; return; }
    if(!R.rows || !R.rows.length){
      var periodLabel = R.type==='DAILY' ? 'Harian' : (R.type==='WEEKLY' ? 'Mingguan' : (R.type==='MONTHLY' ? 'Bulanan' : (R.customRangeLabel || 'periode ini')));
      body.innerHTML = '<div class="ksig-recap-empty"><div class="ksig-recap-empty-icon" aria-hidden="true">◇</div><div class="ksig-recap-empty-title">Belum ada rekap '+esc(periodLabel)+'</div><div class="ksig-recap-empty-desc">Rekap akan tampil ketika data pada periode ini tersedia.</div></div>';
      return;
    }
    if(R.type === 'CUSTOM'){
var aggGroups = aggregateRecapRowsByTimeframe(R.rows);
body.innerHTML =
'<div class="ksig-recap-list ksig-fade">' + aggGroups.map(function(g){ return recapRowLine(g.timeframe, g); }).join('') + '</div>' +
recapSummaryHtml(R.rows) +
'<div class="ksig-recap-period">'+esc(R.customRangeLabel||'')+'</div>';
return;
}
var groups = groupRecapRows(R.rows);
    var periodRef = R.rows[0];
    body.innerHTML =
      '<div class="ksig-recap-list ksig-fade">' + groups.map(recapTimeframeGroupHtml).join('') + '</div>' +
      recapSummaryHtml(R.rows) +
      '<div class="ksig-recap-period">'+fmtWIB(periodRef.period_start_wib,{hour:undefined,minute:undefined})+' – '+fmtWIB(periodRef.period_end_wib,{hour:undefined,minute:undefined})+'</div>';
  }

  function renderRecap(){
    el.innerHTML =
      appBar('Rekap Signal', { back:'/signal/' }) +
      '<div class="ksig-main">'+ recapCardHtml() +'</div>';
    updateLiveDot();
    bindInstallBtn(); bindNotifBtn(); bindTelegramBtn(); bindSettingsBtn();
    bindRecapTabs(); bindRecapCustomControls(); bindRecapCalendar();
    renderRecapBody();
    if(!state.recap.loaded && !state.recap.loading) loadRecap(state.recap.type);
  }

  /* ---------------- aktivitas terbaru ---------------- */
  var ACTIVITY_BADGE = {
    SIGNAL_CREATED_OR_UPDATED: { label:'FRESH', cls:'fresh' },
    NEW_ZONE:            { label:'FRESH', cls:'fresh' },
    ZONE_ACTIVE:          { label:'AKTIF', cls:'aktif' },
    RUNNING:              { label:'RUNNING', cls:'aktif' },
    RUNNING_UPDATE:        { label:'RUNNING', cls:'aktif' },
    TP1_HIT:               { label:'TP1', cls:'profit' },
    TP2_HIT:               { label:'TP2', cls:'profit' },
    TP3_HIT:               { label:'TP3', cls:'profit' },
    HOLD1_HIT:              { label:'TP1', cls:'profit' },
    HOLD2_HIT:              { label:'TP2', cls:'profit' },
    HOLD3_HIT:              { label:'TP3', cls:'profit' },
    RR_1_1_REACHED:        { label:'LAST CALL', cls:'lastcall' },
    HIGH_RISK_WARNING:      { label:'PERINGATAN', cls:'loss' },
    CRITICAL_ZONE_WARNING:  { label:'PERINGATAN', cls:'loss' },
    HIT_INVALIDASI:         { label:'CUT LOSS', cls:'loss' },
    INVALID:                { label:'CUT LOSS', cls:'loss' }
  };
  function activityRowHtml(item){
    var sig = item.signals || {};
    var badgeMeta = ACTIVITY_BADGE[item.event_type] || { label:(STATUS_LABEL[sig.display_status]||'').replace('Signal ','').toUpperCase(), cls: sig.display_status||'' };
    var dirBadge = sig.skenario==='SELL' ? 'sell' : 'buy';
    var isFreshCreate = (item.event_type==='SIGNAL_CREATED_OR_UPDATED' || item.event_type==='NEW_ZONE');
    var unread = state.readsLoaded && isUnread(item.id_zona, sig.updated_at);
    var info;
    if(isFreshCreate && sig.jenis_zona){
      info = sig.jenis_zona + ((sig.area_low!=null && sig.area_high!=null) ? ' • Area '+fmtNum(sig.area_low)+' – '+fmtNum(sig.area_high) : '');
    } else {
      info = item.event_description || item.event_title || EVENT_LABEL[item.event_type] || '';
    }
    return '<div class="ksig-row ksig-pointer-light'+(unread?' ksig-row-unread':'')+'" data-ksig-nav="/signal/id/'+encodeURIComponent(item.id_zona)+'" tabindex="0" role="link">'+
      '<div class="ksig-row-main">'+
        '<div class="ksig-row-top"><span class="ksig-row-symbol">'+esc(sig.pair||'-')+'</span><span class="ksig-row-tf">'+esc(sig.timeframe||'-')+'</span><span class="ksig-badge '+dirBadge+'">'+esc(sig.skenario||'-')+'</span><span class="ksig-badge '+esc(badgeMeta.cls)+'">'+esc(badgeMeta.label)+'</span>'+(unread?'<span class="ksig-new-badge">NEW</span>':'')+'</div>'+
        (info ? '<div class="ksig-row-info">'+esc(info)+'</div>' : '')+
        '<div class="ksig-row-time">'+fmtWIB(item.created_at)+'</div>'+
      '</div>'+
      '<div class="ksig-row-chev" aria-hidden="true">›</div>'+
    '</div>';
  }
  function renderActivityBody(){
    var body = document.getElementById('ksigActivityBody');
    if(!body) return;
    var A = state.activity;
    if(A.loading && !A.items.length){ body.innerHTML = '<div class="ksig-skel">'+'<div class="ksig-skel-row" style="height:60px"></div>'.repeat(3)+'</div>'; return; }
    if(A.error){ body.innerHTML = '<div class="ksig-error"><p>'+esc(A.error)+'</p><button class="ksig-btn primary" id="ksigRetryActivity">Coba Lagi</button></div>'; var ab=document.getElementById('ksigRetryActivity'); if(ab) ab.onclick=function(){ loadActivity(); }; return; }
    if(!A.items.length){ body.innerHTML = '<div class="ksig-empty">Belum ada aktivitas terbaru.</div>'; return; }
    body.innerHTML = '<div class="ksig-list ksig-fade">' + A.items.map(activityRowHtml).join('') + '</div>';
  }

  /* ---------------- signal detail ---------------- */
  var EVENT_LABEL = {
    NEW_ZONE:'Signal dibuat', ZONE_ACTIVE:'Signal aktif', RUNNING_UPDATE:'Update berjalan',
    TP1_HIT:'TP1 tercapai', TP2_HIT:'TP2 tercapai', TP3_HIT:'TP3 tercapai',
    HOLD1_HIT:'Target lanjutan 1', HOLD2_HIT:'Target lanjutan 2', HOLD3_HIT:'Target lanjutan 3',
    RR_1_1_REACHED:'Last Call — RR 1:1 tercapai', HIGH_RISK_WARNING:'Peringatan risiko tinggi',
    CRITICAL_ZONE_WARNING:'Peringatan zona kritis', HIT_INVALIDASI:'Invalidasi'
  };

  function renderDetail(){
    var D = state.detail;
    if(D.id_zona !== state.route.id_zona) loadDetail(state.route.id_zona);
    el.innerHTML = appBar('Detail Signal', { back:'/signal/list/'+(state.list.status||'fresh') }) + '<div class="ksig-main" id="ksigDetailBody"></div>';
    updateLiveDot();
    bindInstallBtn(); bindNotifBtn(); bindTelegramBtn(); bindSettingsBtn();
    renderDetailBody();
  }
  function renderDetailBody(){
    var body = document.getElementById('ksigDetailBody');
    if(!body) return;
    var D = state.detail;
    if(D.loading){ body.innerHTML = '<div class="ksig-skel"><div class="ksig-skel-row" style="height:160px"></div><div class="ksig-skel-row" style="height:160px"></div></div>'; return; }
    if(D.error){ body.innerHTML = '<div class="ksig-error"><p>'+esc(D.error)+'</p><button class="ksig-btn primary" id="ksigRetryDetail">Coba Lagi</button></div>'; var b=document.getElementById('ksigRetryDetail'); if(b) b.onclick=function(){ loadDetail(D.id_zona); }; return; }
    if(!D.signal){ body.innerHTML = '<div class="ksig-empty">Signal tidak ditemukan.</div>'; return; }
    var s = D.signal;
    var dirBadge = s.skenario==='SELL' ? 'sell' : 'buy';
    var lastCallActive = !!(D.events.length && D.events[D.events.length-1].event_type === 'RR_1_1_REACHED');
    var ha = hasilAkhirInfo(s);
    var maxRunVal = s.max_running_point!=null ? s.max_running_point*10 : null;
    var maxRun = maxRunVal!=null ? fmtNum(maxRunVal,1)+' Pips' : '-';
    var rows = [
      ['Signal', (s.skenario||'-') + ' • ' + (s.timeframe||'-')],
      ['Jenis Zona', s.jenis_zona],
      ['Area', (s.area_low!=null && s.area_high!=null) ? fmtNum(s.area_low)+' – '+fmtNum(s.area_high) : '-'],
      ['Take Profit', [s.tp1,s.tp2,s.tp3].map(function(v){return v!=null?fmtNum(v):'-';}).join(' / ')],
      ['Cut Loss', s.invalidasi!=null?fmtNum(s.invalidasi):'-'],
      ['Running Profit', maxRun],
      ['Hasil Akhir', ha.text],
      ['Dibuat', fmtWIB(s.created_at)],
      ['Update Terakhir', fmtWIB(s.updated_at)],
      ['ID Zona', s.id_zona]
    ];
    var html =
      '<div class="ksig-fade">'+
      '<div class="ksig-detail-head">'+
        '<div class="ksig-detail-top">'+
          '<span class="ksig-detail-symbol">'+esc(s.pair)+'</span>'+
          '<div class="ksig-detail-meta"><span class="ksig-badge '+dirBadge+'">'+esc(s.skenario||'-')+'</span><span class="ksig-badge '+s.display_status+'">'+esc(STATUS_LABEL[s.display_status]||s.display_status)+'</span>'+(s.is_critical_zone?'<span class="ksig-badge critical">CRITICAL</span>':'')+'<span class="ksig-detail-tf">'+esc(s.timeframe||'-')+'</span></div>'+
        '</div>'+
        (lastCallActive ? '<div class="ksig-lastcall-banner">⚡ LAST CALL — RR 1:1 tercapai, pantau terus pergerakan harga</div>' : '') +
(s.is_critical_zone ? '<div class="ksig-critical-banner">⚠ ZONA KRITIS — pantau ketat, pertimbangkan kurangi risiko/lot</div>' : '') +
        (s.setup_description ? '<div class="ksig-detail-sub">'+esc(s.setup_description)+'</div>' : '') +
        '<div class="ksig-detail-rows">' + rows.map(function(r){ var isRun = (r[0]==='Running Profit') && maxRunVal!=null; var valInner = isRun ? ('<span class="ksig-cnum" data-cnum="detail-runpips-'+esc(s.id_zona)+'" data-cval="'+maxRunVal+'" data-cdigits="1">'+esc(fmtNum(maxRunVal,1))+' Pips</span>') : esc(r[1]==null?'-':r[1]); var rowCls = (r[0]==='Jenis Zona') ? ' ksig-detail-row-zona' : (r[0]==='Area') ? ' ksig-detail-row-area' : (r[0]==='Take Profit') ? ' ksig-detail-row-tp' : (r[0]==='Cut Loss') ? ' ksig-detail-row-cl' : ''; return '<div class="ksig-detail-row'+rowCls+'"><span>'+esc(r[0])+'</span><strong>'+valInner+'</strong></div>'; }).join('') + '</div>'+
      '</div>'+
      '<div class="ksig-timeline-card">'+
        '<div class="ksig-timeline-title">Riwayat Perkembangan</div>'+
        (D.events.length ? D.events.map(function(ev){
          return '<div class="ksig-tl-item"><div class="ksig-tl-time">'+fmtTimeShort(ev.created_at)+'</div><div class="ksig-tl-body"><strong>'+esc(ev.event_title || EVENT_LABEL[ev.event_type] || ev.event_type)+'</strong>'+(ev.event_description?'<span>'+esc(ev.event_description)+'</span>':'')+'</div></div>';
        }).join('') : '<div class="ksig-empty" style="padding:16px 0;">Belum ada riwayat perkembangan.</div>')+
      '</div>'+
      '</div>';
    body.innerHTML = html;
    applyCountAnimations(body);
  }

    /* ---------------- update PWA (toast) ---------------- */
  function showUpdateToast(){
    if(document.getElementById('ksigUpdateToast')) return;
    var t = document.createElement('div');
    t.id = 'ksigUpdateToast';
    t.className = 'ksig-update-toast';
    t.innerHTML = '<span class="ksig-update-toast-text">Versi baru Kamar Signal tersedia</span>'+
      '<button type="button" class="ksig-update-toast-btn" id="ksigUpdateReload">Perbarui</button>';
    document.body.appendChild(t);
    requestAnimationFrame(function(){ requestAnimationFrame(function(){ t.classList.add('show'); }); });
    var btn = document.getElementById('ksigUpdateReload');
    if(btn) btn.addEventListener('click', function(){ location.reload(); });
  }
  window.ksigShowUpdateToast = showUpdateToast;

/* ---------------- start ---------------- */
  // FIX 2026-08-23: watchdog diagnostik darurat. User laporkan HP iOS (iPhone x2 + iPad,
  // browser apapun) macet total di layar loading tanpa pesan error apapun -- padahal boot()
  // sudah dibungkus timeout 9 detik lewat Promise.race. Kalau tetap macet tanpa pesan sama
  // sekali, kemungkinan ada error JS/promise yang lolos dari try/catch yang sudah ada. Tiga
  // lapis jaring pengaman independen ditambahkan di sini supaya SELALU ada pesan error yang
  // muncul (tidak pernah diam macet tanpa penjelasan lagi), dan supaya pesan errornya bisa
  // dipakai buat diagnosis akar masalah sebenarnya di percobaan berikutnya:
  var __ksigBootSettled = false;
  var __origRenderBootError = renderBootError;
  renderBootError = function(msg){ __ksigBootSettled = true; __origRenderBootError(msg); };
  var __origRenderApp = (typeof renderApp === 'function') ? renderApp : null;
  if(__origRenderApp){ renderApp = function(){ __ksigBootSettled = true; return __origRenderApp.apply(this, arguments); }; }
  window.addEventListener('error', function(ev){
    if(__ksigBootSettled) return;
    try{ renderBootError('Error JS: ' + (ev && ev.message || 'unknown') + (ev && ev.filename ? ' ('+ev.filename.split('/').pop()+':'+ev.lineno+')' : '')); }catch(e){}
  });
  window.addEventListener('unhandledrejection', function(ev){
    if(__ksigBootSettled) return;
    try{
      var reason = ev && ev.reason;
      var msg = (reason && reason.message) ? reason.message : String(reason);
      renderBootError('Promise gagal tanpa tertangani: ' + msg);
    }catch(e){}
  });
  setTimeout(function(){
    if(__ksigBootSettled) return;
    try{ renderBootError('Macet lebih dari 15 detik tanpa respons (watchdog darurat). Coba Muat Ulang. Kalau masih macet, ini kemungkinan bug spesifik browser di HP ini.'); }catch(e){}
  }, 15000);

  dbg('memanggil boot() sekarang');
  boot();
})();
