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
  var dashboardEntered = false;

  var state = {
    client: null,
    user: null,
    profile: null,
    access: null,
    approved: false,
    route: { view: 'dashboard' },
    counts: { fresh:0, aktif:0, profit:0, loss:0 },
    unreadCounts: { fresh:0, aktif:0, profit:0, loss:0 },
    badgeJustChanged: { fresh:false, aktif:false, profit:false, loss:false },
    lastUpdate: null,
    readsMap: {}, // id_zona -> ISO timestamp member last opened detail signal itu
    readsLoaded: false,
    realtimeStatus: 'off', // off | connecting | on | warn
    list: { status:'fresh', loadedForStatus:null, loaded:false, items:[], page:0, pageSize:20, hasMore:true, loading:false, search:'', sort:'terbaru', filters:{ symbol:'', timeframe:'', dir:'', period:'', unread:false }, unreadTotal:0 },
    recap: { type:'DAILY', rows:[], loaded:false, loading:false },
    activity: { items:[], loaded:false, loading:false },
    detail: { id_zona:null, signal:null, events:[], loading:false }
  };

  /* ---------------- instal aplikasi (PWA) ---------------- */
  var installPromptEvent = null;
  function isStandaloneMode(){
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
  }
  function isIOSDevice(){
    return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  }
  function installAvailable(){
    return !isStandaloneMode();
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
  function openInstallSheet(){
    var wrap = document.createElement('div');
    wrap.className = 'ksig-sheet-backdrop';
    var body;
    if(installPromptEvent){
      body = '<div class="ksig-sheet-title">Instal Kamar Signal</div>'+
        '<p style="color:var(--km-muted);font-size:13.5px;line-height:1.6;margin:0 0 16px">Instal Kamar Signal sebagai aplikasi di perangkat ini supaya lebih cepat dibuka dan tampil layar penuh seperti aplikasi biasa.</p>'+
        '<div class="ksig-sheet-actions"><button class="ksig-btn" id="ksigInstallCancel">Nanti Saja</button><button class="ksig-btn primary" id="ksigInstallGo">Instal Sekarang</button></div>';
    } else if(isIOSDevice()){
      body = '<div class="ksig-sheet-title">Instal Kamar Signal (iPhone/iPad)</div>'+
        '<ol style="color:var(--km-muted);font-size:13.5px;line-height:1.85;margin:0 0 16px;padding-left:18px">'+
          '<li>Tap tombol <strong>Share</strong> (kotak dengan panah ke atas) di Safari.</li>'+
          '<li>Pilih <strong>"Add to Home Screen"</strong>.</li>'+
          '<li>Tap <strong>"Add"</strong> di pojok kanan atas.</li>'+
        '</ol>'+
        '<div class="ksig-sheet-actions"><button class="ksig-btn primary block" id="ksigInstallCancel">Mengerti</button></div>';
    } else {
      body = '<div class="ksig-sheet-title">Instal Kamar Signal</div>'+
        '<p style="color:var(--km-muted);font-size:13.5px;line-height:1.6;margin:0 0 16px">Buka menu browser Anda (biasanya ikon titik tiga atau ikon instal di address bar) lalu pilih "Instal Aplikasi" atau "Add to Home Screen".</p>'+
        '<div class="ksig-sheet-actions"><button class="ksig-btn primary block" id="ksigInstallCancel">Mengerti</button></div>';
    }
    wrap.innerHTML = '<div class="ksig-sheet"><div class="ksig-sheet-handle"></div>'+body+'</div>';
    document.body.appendChild(wrap);
    wrap.addEventListener('click', function(e){ if(e.target===wrap) document.body.removeChild(wrap); });
    var cancelBtn = document.getElementById('ksigInstallCancel');
    if(cancelBtn) cancelBtn.addEventListener('click', function(){ document.body.removeChild(wrap); });
    var goBtn = document.getElementById('ksigInstallGo');
    if(goBtn) goBtn.addEventListener('click', function(){
      document.body.removeChild(wrap);
      if(!installPromptEvent) return;
      installPromptEvent.prompt();
      installPromptEvent.userChoice.then(function(){ installPromptEvent = null; renderApp(); });
    });
  }

  /* ---------------- notifikasi (push, additive) ---------------- */
  var VAPID_PUBLIC_KEY = 'BIKwVi8sVWcL4iyxeJo8POMiWSSEDJA6H3i2dn8jVKxPkXgRIA_lHat0dfldioTWOug-irdQnlUsGc5euOQoZyw';
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
        '<p style="color:var(--km-muted);font-size:13.5px;line-height:1.6;margin:0 0 16px">HP Anda akan mendapat pemberitahuan saat ada signal baru, signal aktif, dan hasil akhir (profit/loss). Matikan notifikasi?</p>'+
        '<div class="ksig-sheet-actions"><button class="ksig-btn" id="ksigNotifCancel">Batal</button><button class="ksig-btn primary" id="ksigNotifOff">Matikan Notifikasi</button></div>';
    } else {
      body = '<div class="ksig-sheet-title">Aktifkan Notifikasi</div>'+
        '<p style="color:var(--km-muted);font-size:13.5px;line-height:1.6;margin:0 0 16px">Dapatkan pemberitahuan langsung di HP Anda saat ada signal baru, signal aktif, dan hasil akhir (profit/loss). Anda bisa mematikannya kapan saja.</p>'+
        '<div class="ksig-sheet-actions"><button class="ksig-btn" id="ksigNotifCancel">Nanti Saja</button><button class="ksig-btn primary" id="ksigNotifOn">Aktifkan</button></div>';
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
  }

/* ---------------- helpers ---------------- */
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
    // Angka pip yang ditampilkan ke member: kalau signal sudah benar-benar selesai
    // (INVALID), pakai hasil final (result_point). Selama masih berjalan (FRESH/ACTIVE),
    // pakai rekor tertinggi yang pernah dicapai (max_running_point) supaya update live
    // mengikuti tiap event TP Hit, tidak menunggu signal ditutup.
    if(s.status==='INVALID' && s.result_point!=null) return Number(s.result_point);
    if(s.max_running_point!=null) return Number(s.max_running_point);
    return s.running_point!=null ? Number(s.running_point) : null;
  }
  function hasilAkhirInfo(s){
    var farthest = s.farthest_tp_level || 0;
    var pips = pipsOf(s);
    var pipsText = pips!=null ? (pips>=0?'+':'')+fmtNum(pips,1)+' pt' : '';
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
    else history.pushState({}, '', path);
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
    (window.KamarSupabase && window.KamarSupabase.ready ? window.KamarSupabase.ready() : Promise.resolve(null))
      .then(function(client){
        state.client = client || (window.KamarSupabase && window.KamarSupabase.getClient && window.KamarSupabase.getClient());
        if(!state.client){ renderBootError('Koneksi database belum siap. Muat ulang halaman.'); return; }
        return checkSession();
      })
      .catch(function(err){ renderBootError('Gagal memuat Kamar Signal: ' + (err && err.message || err)); });
  }

  function checkSession(){
    return state.client.auth.getSession().then(function(res){
      var session = res && res.data && res.data.session;
      if(!session || !session.user){
        state.user = null; state.approved = false;
        renderApp();
        return;
      }
      state.user = session.user;
      return loadProfileAndAccess();
    });
  }

  function loadProfileAndAccess(){
    return state.client.from('member_profiles').select('id,account_status,full_name,email').eq('user_id', state.user.id).maybeSingle()
      .then(function(res){
        if(res.error) throw res.error;
        state.profile = res.data || null;
        if(!state.profile){ state.approved = false; renderApp(); return null; }
        return state.client.from('member_access').select('access_kamar_study,locked_by_expired,expires_kamar_study,activation_source').eq('profile_id', state.profile.id).maybeSingle();
      })
      .then(function(res){
        if(!res) return;
        if(res.error) throw res.error;
        state.access = res.data || null;
        var accountOk = state.profile && state.profile.account_status === 'active';
        var accessOk = state.access && state.access.access_kamar_study === true && state.access.locked_by_expired !== true;
        state.approved = !!(accountOk && accessOk);
        renderApp();
        if(state.approved){
          startRealtime();
          loadReadsMap();
        }
      })
      .catch(function(err){
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
  var onLiveEventDebounced = debounce(function(){
    refreshCounts();
    if(state.route.view === 'list') loadList(true);
    if(state.route.view === 'detail') loadDetail(state.route.id_zona);
    if(state.route.view === 'dashboard') loadActivity();
  }, 600);
  function onLiveEvent(payload){
    state.lastUpdate = new Date().toISOString();
    onLiveEventDebounced();
  }
  window.addEventListener('online', function(){ if(state.approved) startRealtime(); });
  window.addEventListener('offline', function(){ state.realtimeStatus = 'off'; updateLiveDot(); });

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

  function refreshCounts(){
    if(!state.approved) return Promise.resolve();
    var statuses = ['fresh','aktif','profit','loss','archive'];
    return Promise.all(statuses.map(function(s){
      var q = state.client.from('signals').select('id_zona,updated_at');
      q = (s === 'archive') ? q.eq('is_archived', true) : q.eq('display_status', s).eq('is_archived', false);
      return q;
    })).then(function(results){
      var prev = state.unreadCounts;
      var next = {};
      var changed = {};
      results.forEach(function(r,i){
        var st = statuses[i];
        var rows = (r && r.data) || [];
        state.counts[st] = rows.length;
        var u = state.readsLoaded ? rows.filter(function(row){ return isUnread(row.id_zona, row.updated_at); }).length : (prev[st]||0);
        next[st] = u;
        changed[st] = state.readsLoaded && u !== (prev[st]||0);
      });
      state.unreadCounts = next;
      state.badgeJustChanged = changed;
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
    var q = state.client.from('signals').select('id_zona,pair,timeframe,jenis_zona,area_low,area_high,skenario,status,display_status,farthest_tp_level,running_point,max_running_point,result_point,created_at,updated_at,is_archived');
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

  function loadRecap(type){
    var R = state.recap;
    R.type = type; R.loading = true; R.error = null;
    renderApp();
    // Ambil rekap existing apa adanya. Struktur bisnis existing: satu periode bisa
    // mempunyai lebih dari satu baris (per timeframe, dan per pair kalau ada).
    // UI hanya mengelompokkan baris-baris ini untuk ditampilkan — tidak menghitung ulang,
    // tidak menggabungkan angka, tidak membuat timeframe baru.
    return state.client.from('signal_recaps').select('*').eq('recap_type', type)
      .order('period_end_wib', { ascending:false }).order('timeframe', { ascending:true }).limit(50)
      .then(function(res){
        if(res.error) throw res.error;
        var rows = res.data || [];
        if(rows.length){
          var latestEnd = rows[0].period_end_wib;
          rows = rows.filter(function(r){ return r.period_end_wib === latestEnd; });
        }
        R.rows = rows;
        R.loading = false;
        R.loaded = true;
        renderApp();
      }).catch(function(err){
        R.loading = false; R.error = 'Data belum dapat dimuat.';
        renderApp();
      });
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
    var back = opts.back ? '<div class="ksig-appbar-back" data-ksig-nav="'+esc(opts.back)+'" tabindex="0" role="link" aria-label="Kembali">‹</div>' : '';
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
    bindInstallBtn(); bindNotifBtn();
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
    bindInstallBtn(); bindNotifBtn();
  }

  /* ---------------- dashboard ---------------- */
  var OVERVIEW_META = {
    fresh:  { label:'Signal Fresh',  desc:'Signal terbaru' },
    aktif:  { label:'Signal Aktif',  desc:'Signal sedang aktif' },
    profit: { label:'Signal Profit', desc:'Signal selesai profit' },
    loss:   { label:'Signal Loss',   desc:'Signal selesai loss' },
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
    return '<div class="ksig-header'+animCls+'">'+
      '<div class="ksig-header-row">'+
        '<div class="ksig-header-titles">'+
          '<div class="ksig-header-title">Kamar Signal</div>'+
          '<div class="ksig-header-sub">Pantau signal dan perkembangannya</div>'+
          signalStatusBannerHtml()+
        '</div>'+
        '<div class="ksig-header-meta">'+
          '<div class="ksig-live off" id="ksigLive"><span class="ksig-live-dot"></span><span class="ksig-live-label">Offline</span></div>'+
          '<div class="ksig-header-updated">'+esc(updatedTxt)+'</div>'+
          notifBtn+
          install+
        '</div>'+
      '</div>'+
    '</div>';
  }

  function panduanSectionHtml(animCls){
    function guideCard(icon,title,desc){
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
        guideCard('◇','Aturan Kamar Signal','Ketentuan penggunaan dan panduan member Kamar Signal.') +
        guideCard('◇','Cara Membaca Signal','Panduan memahami format, status, dan informasi Kamar Signal.') +
      '</div>'+
    '</div>';
  }

  function renderDashboard(){
    var c = state.counts;
    var firstPaint = !dashboardEntered;
    function ac(n){ return firstPaint ? ' ksig-fade ksig-stagger-'+n : ''; }
    el.innerHTML =
      dashboardHeader(ac(1)) +
      '<div class="ksig-main ksig-dashboard">'+
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
    updateLiveDot();
    bindInstallBtn(); bindNotifBtn();
    bindRecapTabs();
    bindPointerLight();
    renderRecapBody();
    renderActivityBody();
    if(!state.lastUpdate) refreshCounts();
    if(!state.recap.loaded && !state.recap.loading) loadRecap(state.recap.type);
    if(!state.activity.loaded && !state.activity.loading) loadActivity();
    function card(status){
      var meta = OVERVIEW_META[status];
      var countHtml = state.lastUpdate!=null ? c[status] : '<span class="ksig-skel-inline"></span>';
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
      '<div class="ksig-main">'+
        '<div class="ksig-toolbar">'+
          '<div class="ksig-search"><span aria-hidden="true">🔎</span><input id="ksigSearchInput" placeholder="Cari symbol, ID zona…" value="'+esc(L.search)+'"/></div>'+
          '<div class="ksig-tool-btn'+(hasActiveFilter(L.filters)?' on':'')+'" id="ksigFilterBtn" tabindex="0" role="button" aria-label="Filter">⚙</div>'+
          '<div class="ksig-tool-btn" id="ksigSortBtn" tabindex="0" role="button" aria-label="Urutkan">↕</div>'+
        '</div>'+
        unreadBarHtml+
        '<div id="ksigListBody"></div>'+
      '</div>';
    updateLiveDot();
    bindInstallBtn(); bindNotifBtn();
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
    var html = '<div class="ksig-list ksig-fade">' + L.items.map(rowHtml).join('') + '</div>';
    if(L.hasMore) html += '<div class="ksig-loadmore"><button class="ksig-btn block" id="ksigLoadMore">'+(L.loading?'Memuat…':'Muat Lebih Banyak')+'</button></div>';
    body.innerHTML = html;
    var lm = document.getElementById('ksigLoadMore');
    if(lm) lm.addEventListener('click', function(){ loadList(false); });
  }
  function rowHtml(s){
    var unread = state.readsLoaded && isUnread(s.id_zona, s.updated_at);
    var dirBadge = s.skenario==='SELL' ? 'sell' : 'buy';
    var infoParts = [];
    if(s.jenis_zona) infoParts.push(s.jenis_zona);
    if(s.area_low!=null && s.area_high!=null) infoParts.push('Area '+fmtNum(s.area_low)+' – '+fmtNum(s.area_high));
    if(s.display_status!=='fresh'){
      var pips = pipsOf(s);
      if(pips!=null) infoParts.push((pips>=0?'+':'')+fmtNum(pips,1)+' pt');
    }
    var info = infoParts.join(' • ');
    return '<div class="ksig-row'+(unread?' ksig-row-unread':'')+'" data-ksig-nav="/signal/id/'+encodeURIComponent(s.id_zona)+'" tabindex="0" role="link">'+
      '<div class="ksig-row-main">'+
        '<div class="ksig-row-top"><span class="ksig-row-symbol">'+esc(s.pair)+'</span><span class="ksig-row-tf">'+esc(s.timeframe||'-')+'</span><span class="ksig-badge '+dirBadge+'">'+esc(s.skenario||'-')+'</span><span class="ksig-badge '+s.display_status+'">'+esc(STATUS_LABEL[s.display_status]||s.display_status)+'</span>'+(unread?'<span class="ksig-new-badge">NEW</span>':'')+'</div>'+
        (info ? '<div class="ksig-row-info">'+esc(info)+'</div>' : '')+
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
    var options = [ ['terbaru','Terbaru'], ['terlama','Terlama'], ['update','Update Terbaru'], ['pips','Pips Terbesar'] ];
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
    return '<div class="ksig-recap-card">'+
      '<div class="ksig-tabs" role="tablist">'+
        tab('DAILY','Harian') + tab('WEEKLY','Mingguan') + tab('MONTHLY','Bulanan') +
      '</div>'+
      '<div id="ksigRecapBody"></div>'+
    '</div>';
    function tab(type,label){
      return '<div class="ksig-tab'+(R.type===type?' active':'')+'" data-type="'+type+'" tabindex="0" role="tab" aria-selected="'+(R.type===type?'true':'false')+'">'+label+'</div>';
    }
  }
  function bindRecapTabs(){
    document.querySelectorAll('.ksig-tab').forEach(function(t){
      t.addEventListener('click', function(){ if(t.getAttribute('data-type')!==state.recap.type) loadRecap(t.getAttribute('data-type')); });
      t.addEventListener('keydown', function(e){
        if(e.key!=='Enter' && e.key!==' ') return;
        e.preventDefault();
        if(t.getAttribute('data-type')!==state.recap.type) loadRecap(t.getAttribute('data-type'));
      });
    });
  }
  function groupRecapRows(rows){
    var order = [], map = {};
    rows.forEach(function(r){
      var tf = r.timeframe || 'Semua Timeframe';
      if(!map[tf]){ map[tf] = []; order.push(tf); }
      map[tf].push(r);
    });
    return order.map(function(tf){ return { timeframe: tf, rows: map[tf] }; });
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
      var periodLabel = R.type==='DAILY' ? 'Harian' : (R.type==='WEEKLY' ? 'Mingguan' : 'Bulanan');
      body.innerHTML = '<div class="ksig-recap-empty"><div class="ksig-recap-empty-icon" aria-hidden="true">◇</div><div class="ksig-recap-empty-title">Belum ada rekap '+esc(periodLabel)+'</div><div class="ksig-recap-empty-desc">Rekap akan tampil ketika data pada periode ini tersedia.</div></div>';
      return;
    }
    var groups = groupRecapRows(R.rows);
    var periodRef = R.rows[0];
    body.innerHTML =
      '<div class="ksig-recap-list ksig-fade">' + groups.map(recapTimeframeGroupHtml).join('') + '</div>' +
      '<div class="ksig-recap-period">'+fmtWIB(periodRef.period_start_wib,{hour:undefined,minute:undefined})+' – '+fmtWIB(periodRef.period_end_wib,{hour:undefined,minute:undefined})+'</div>';
  }

  function renderRecap(){
    el.innerHTML =
      appBar('Rekap Signal', { back:'/signal/' }) +
      '<div class="ksig-main">'+ recapCardHtml() +'</div>';
    updateLiveDot();
    bindInstallBtn(); bindNotifBtn();
    bindRecapTabs();
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
    return '<div class="ksig-row'+(unread?' ksig-row-unread':'')+'" data-ksig-nav="/signal/id/'+encodeURIComponent(item.id_zona)+'" tabindex="0" role="link">'+
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
    bindInstallBtn(); bindNotifBtn();
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
    var maxRun = s.max_running_point!=null ? fmtNum(s.max_running_point,1)+' pt' : '-';
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
          '<div class="ksig-detail-meta"><span class="ksig-badge '+dirBadge+'">'+esc(s.skenario||'-')+'</span><span class="ksig-badge '+s.display_status+'">'+esc(STATUS_LABEL[s.display_status]||s.display_status)+'</span><span class="ksig-detail-tf">'+esc(s.timeframe||'-')+'</span></div>'+
        '</div>'+
        (lastCallActive ? '<div class="ksig-lastcall-banner">⚡ LAST CALL — RR 1:1 tercapai, pantau terus pergerakan harga</div>' : '') +
        (s.setup_description ? '<div class="ksig-detail-sub">'+esc(s.setup_description)+'</div>' : '') +
        '<div class="ksig-detail-rows">' + rows.map(function(r){ return '<div class="ksig-detail-row"><span>'+esc(r[0])+'</span><strong>'+esc(r[1]==null?'-':r[1])+'</strong></div>'; }).join('') + '</div>'+
      '</div>'+
      '<div class="ksig-timeline-card">'+
        '<div class="ksig-timeline-title">Riwayat Perkembangan</div>'+
        (D.events.length ? D.events.map(function(ev){
          return '<div class="ksig-tl-item"><div class="ksig-tl-time">'+fmtTimeShort(ev.created_at)+'</div><div class="ksig-tl-body"><strong>'+esc(ev.event_title || EVENT_LABEL[ev.event_type] || ev.event_type)+'</strong>'+(ev.event_description?'<span>'+esc(ev.event_description)+'</span>':'')+'</div></div>';
        }).join('') : '<div class="ksig-empty" style="padding:16px 0;">Belum ada riwayat perkembangan.</div>')+
      '</div>'+
      '</div>';
    body.innerHTML = html;
  }

  /* ---------------- start ---------------- */
  boot();
})();
