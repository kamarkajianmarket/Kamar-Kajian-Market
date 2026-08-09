/* ==========================================================================
Kamar Signal — app logic v1
Prinsip (jangan dilanggar, lihat master prompt user):
- EA adalah source of truth untuk isi/angka signal. App ini HANYA presentasi.
- Auth = Supabase Auth asli (auth.uid()), bukan boolean localStorage.
  RLS di database yang benar-benar menahan akses (member_can_access('kamar_study')).
  localStorage di sini hanya dipakai untuk state UX non-sensitif (unread cache lokal opsional).
- Semua waktu ditampilkan dalam WIB (timezone EA), bukan timezone browser.
- Tidak ada polling agresif. Update berbasis event (Supabase Realtime) + refetch bertarget.
========================================================================== */
(function(){
  'use strict';

  var ROOT_PATH = '/signal/';
  var el = document.getElementById('ksigRoot');

  var state = {
    client: null,
    user: null,
    profile: null,
    access: null,
    approved: false,
    route: { view: 'dashboard' },
    counts: { fresh:0, aktif:0, profit:0, loss:0 },
    lastUpdate: null,
    readsMap: {},
    realtimeStatus: 'off', // off | connecting | on | warn
    list: { status:'fresh', items:[], page:0, pageSize:20, hasMore:true, loading:false, search:'', sort:'terbaru', filters:{ symbol:'', timeframe:'', dir:'', period:'' } },
    recap: { type:'DAILY', row:null, loading:false },
    detail: { id_zona:null, signal:null, events:[], loading:false }
  };

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
  window.addEventListener('popstate', function(){ routeFromLocation(); renderApp(); });

  function routeFromLocation(){
    var p = location.pathname;
    if(p.indexOf(ROOT_PATH) !== 0){ state.route = { view:'dashboard' }; return; }
    var rest = p.slice(ROOT_PATH.length).replace(/\/+$/,'');
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
        return state.client.from('member_access').select('access_kamar_study,locked_by_expired,expires_kamar_study').eq('profile_id', state.profile.id).maybeSingle();
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
      onDone(null);
      renderBoot('Login berhasil, membuka Kamar Signal…');
      loadProfileAndAccess();
    }).catch(function(err){ onDone(err && err.message || 'Login gagal.'); });
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
  }, 600);
  function onLiveEvent(payload){
    state.lastUpdate = new Date().toISOString();
    onLiveEventDebounced();
  }
  window.addEventListener('online', function(){ if(state.approved) startRealtime(); });
  window.addEventListener('offline', function(){ state.realtimeStatus = 'off'; updateLiveDot(); });

  /* ---------------- data layer ---------------- */
  function refreshCounts(){
    if(!state.approved) return Promise.resolve();
    var statuses = ['fresh','aktif','profit','loss'];
    return Promise.all(statuses.map(function(s){
      return state.client.from('signals').select('id', { count:'exact', head:true }).eq('display_status', s);
    })).then(function(results){
      results.forEach(function(r,i){ state.counts[statuses[i]] = (r && r.count) || 0; });
      state.lastUpdate = new Date().toISOString();
      if(state.route.view === 'dashboard') renderApp();
    }).catch(function(){});
  }

  function loadReadsMap(){
    if(!state.profile) return;
    state.client.from('signal_member_reads').select('id_zona').eq('profile_id', state.profile.id).then(function(res){
      if(res.error) return;
      var map = {};
      (res.data||[]).forEach(function(r){ map[r.id_zona] = true; });
      state.readsMap = map;
      if(state.route.view === 'list') renderApp();
    }).catch(function(){});
  }
  function markRead(id_zona){
    if(!state.profile || !id_zona) return;
    state.readsMap[id_zona] = true;
    state.client.from('signal_member_reads').upsert({ profile_id: state.profile.id, id_zona: id_zona, last_seen_at: new Date().toISOString() }, { onConflict:'profile_id,id_zona' }).then(function(){}).catch(function(){});
  }

  function loadList(reset){
    var L = state.list;
    if(reset){ L.page = 0; L.items = []; L.hasMore = true; }
    if(L.loading || (!L.hasMore && !reset)) return Promise.resolve();
    L.loading = true;
    renderApp();
    var from = L.page * L.pageSize;
    var to = from + L.pageSize - 1;
    var q = state.client.from('signals').select('id_zona,pair,timeframe,skenario,status,display_status,farthest_tp_level,running_point,result_point,created_at,updated_at').eq('display_status', L.status);
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
    else if(L.sort==='pips') q = q.order('result_point', { ascending:false, nullsFirst:false }).order('running_point', { ascending:false, nullsFirst:false });
    else if(L.sort==='update') q = q.order('updated_at', { ascending:false });
    else q = q.order('created_at', { ascending:false });
    q = q.range(from, to);
    return q.then(function(res){
      if(res.error) throw res.error;
      var rows = res.data || [];
      L.items = reset ? rows : L.items.concat(rows);
      L.hasMore = rows.length === L.pageSize;
      L.page += 1;
      L.loading = false;
      L.error = null;
      renderApp();
    }).catch(function(err){
      L.loading = false; L.error = err && err.message || 'Data gagal dimuat.';
      renderApp();
    });
  }

  function loadRecap(type){
    var R = state.recap;
    R.type = type; R.loading = true; R.error = null;
    renderApp();
    return state.client.from('signal_recaps').select('*').eq('recap_type', type).order('period_end_wib', { ascending:false }).limit(1).maybeSingle()
      .then(function(res){
        if(res.error) throw res.error;
        R.row = res.data || null;
        R.loading = false;
        renderApp();
      }).catch(function(err){
        R.loading = false; R.error = err && err.message || 'Rekap gagal dimuat.';
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
        D.loading = false; D.error = err && err.message || 'Signal gagal dimuat.';
        renderApp();
      });
  }

  /* ---------------- rendering ---------------- */
  function updateLiveDot(){
    var dot = document.getElementById('ksigLive');
    if(!dot) return;
    dot.className = 'ksig-live ' + (state.realtimeStatus==='on'?'on':state.realtimeStatus==='connecting'?'warn':state.realtimeStatus==='warn'?'warn':'off');
    dot.querySelector('.ksig-live-label').textContent = state.realtimeStatus==='on' ? 'LIVE' : state.realtimeStatus==='connecting' ? 'Menghubungkan…' : state.realtimeStatus==='warn' ? 'Reconnecting…' : 'Offline';
  }

  function renderBoot(msg){
    el.innerHTML = '<div class="ksig-boot"><div class="ksig-boot-mark">Kamar Signal</div><div class="ksig-boot-sub">'+esc(msg)+'</div></div>';
  }
  function renderBootError(msg){
    el.innerHTML = '<div class="ksig-boot"><div class="ksig-boot-mark">Kamar Signal</div><div class="ksig-error"><p>'+esc(msg)+'</p><button class="ksig-btn primary" onclick="location.reload()">Coba Lagi</button></div></div>';
  }

  function appBar(title, opts){
    opts = opts || {};
    var back = opts.back ? '<div class="ksig-appbar-back" data-ksig-nav="'+esc(opts.back)+'">‹</div>' : '';
    var live = '<div class="ksig-live off" id="ksigLive"><span class="ksig-live-dot"></span><span class="ksig-live-label">Offline</span></div>';
    return '<div class="ksig-appbar">'+back+'<div class="ksig-appbar-title">'+esc(title)+'</div>'+live+'</div>';
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
  }

  function renderDashboard(){
    var c = state.counts;
    el.innerHTML =
      appBar('Kamar Signal') +
      '<div class="ksig-main">'+
        '<div class="ksig-grid">'+
          card('fresh','Signal Fresh', c.fresh) +
          card('aktif','Signal Aktif', c.aktif) +
          card('profit','Signal Profit', c.profit) +
          card('loss','Signal Loss', c.loss) +
        '</div>'+
        '<div class="ksig-section-gap"></div>'+
        '<div class="ksig-card ksig-card-full" data-ksig-nav="/signal/recap" style="cursor:pointer">'+
          '<div class="ksig-card-label">Rekap Signal</div>'+
          '<div style="font-size:12.5px;color:var(--km-muted);margin-top:2px;">Harian · Mingguan · Bulanan →</div>'+
        '</div>'+
        '<div class="ksig-lastupdate">'+(state.lastUpdate ? 'Last Update • '+fmtTimeShort(state.lastUpdate) : 'Memuat data…')+'</div>'+
      '</div>';
    updateLiveDot();
    if(!state.lastUpdate) refreshCounts();
    function card(status,label,count){
      return '<div class="ksig-card '+status+'" data-ksig-nav="/signal/list/'+status+'"><div class="ksig-card-label">'+label+'</div><div class="ksig-card-count">'+count+'</div></div>';
    }
  }

  var STATUS_LABEL = { fresh:'Signal Fresh', aktif:'Signal Aktif', profit:'Signal Profit', loss:'Signal Loss' };

  function renderList(){
    var L = state.list;
    var isFirstLoad = L.items.length===0 && !L.loading && !L.error;
    el.innerHTML =
      appBar(STATUS_LABEL[L.status] || 'Signal', { back:'/signal/' }) +
      '<div class="ksig-main">'+
        '<div class="ksig-toolbar">'+
          '<div class="ksig-search"><span>🔎</span><input id="ksigSearchInput" placeholder="Cari symbol, ID zona…" value="'+esc(L.search)+'"/></div>'+
          '<div class="ksig-tool-btn'+(hasActiveFilter(L.filters)?' on':'')+'" id="ksigFilterBtn">⚙</div>'+
          '<div class="ksig-tool-btn" id="ksigSortBtn">↕</div>'+
        '</div>'+
        '<div id="ksigListBody"></div>'+
      '</div>';
    updateLiveDot();
    renderListBody();
    var search = document.getElementById('ksigSearchInput');
    search.addEventListener('input', debounce(function(){ L.search = search.value.trim(); loadList(true); }, 400));
    document.getElementById('ksigFilterBtn').addEventListener('click', openFilterSheet);
    document.getElementById('ksigSortBtn').addEventListener('click', openSortSheet);
    if(isFirstLoad) loadList(true);
  }
  function hasActiveFilter(f){ return !!(f.symbol||f.timeframe||f.dir||f.period); }

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
    var html = '<div class="ksig-list">' + L.items.map(rowHtml).join('') + '</div>';
    if(L.hasMore) html += '<div class="ksig-loadmore"><button class="ksig-btn block" id="ksigLoadMore">'+(L.loading?'Memuat…':'Muat Lebih Banyak')+'</button></div>';
    body.innerHTML = html;
    var lm = document.getElementById('ksigLoadMore');
    if(lm) lm.addEventListener('click', function(){ loadList(false); });
  }
  function rowHtml(s){
    var unread = !state.readsMap[s.id_zona];
    var dirBadge = s.skenario==='SELL' ? 'sell' : 'buy';
    var pips = s.result_point!=null ? s.result_point : s.running_point;
    var pipsTxt = pips!=null ? (pips>=0?'+':'')+fmtNum(pips,1)+' pt' : '';
    var info = (s.timeframe||'-') + (pipsTxt?' • '+pipsTxt:'');
    return '<div class="ksig-row'+(unread?' ksig-row-unread':'')+'" data-ksig-nav="/signal/id/'+encodeURIComponent(s.id_zona)+'">'+
      '<div class="ksig-row-main">'+
        '<div class="ksig-row-top"><span class="ksig-row-symbol">'+esc(s.pair)+'</span><span class="ksig-badge '+dirBadge+'">'+esc(s.skenario||'-')+'</span><span class="ksig-badge '+s.display_status+'">'+esc(STATUS_LABEL[s.display_status]||s.display_status)+'</span></div>'+
        '<div class="ksig-row-info">'+esc(info)+'</div>'+
        '<div class="ksig-row-time">'+fmtWIB(s.created_at)+'</div>'+
      '</div>'+
      '<div class="ksig-row-chev">›</div>'+
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
        '<div class="ksig-sheet-group"><div class="ksig-sheet-group-label">Arah</div><div class="ksig-chip-row" data-group="dir">'+
          chipOpt('dir','','Semua',L.filters.dir) + chipOpt('dir','BUY','Buy',L.filters.dir) + chipOpt('dir','SELL','Sell',L.filters.dir) +
        '</div></div>'+
        '<div class="ksig-sheet-group"><div class="ksig-sheet-group-label">Periode</div><div class="ksig-chip-row" data-group="period">'+
          chipOpt('period','','Semua',L.filters.period) + chipOpt('period','today','Hari Ini',L.filters.period) + chipOpt('period','week','Minggu Ini',L.filters.period) + chipOpt('period','month','Bulan Ini',L.filters.period) +
        '</div></div>'+
        '<div class="ksig-sheet-actions"><button class="ksig-btn" id="ksigFilterReset">Reset</button><button class="ksig-btn primary" id="ksigFilterApply">Terapkan</button></div>'+
      '</div>';
    document.body.appendChild(wrap);
    var pending = Object.assign({}, L.filters);
    wrap.querySelectorAll('.ksig-chip-opt').forEach(function(chip){
      chip.addEventListener('click', function(){
        var group = chip.closest('[data-group]').getAttribute('data-group');
        pending[group] = chip.getAttribute('data-val');
        wrap.querySelectorAll('[data-group="'+group+'"] .ksig-chip-opt').forEach(function(c){ c.classList.toggle('active', c===chip); });
      });
    });
    wrap.addEventListener('click', function(e){ if(e.target===wrap) document.body.removeChild(wrap); });
    document.getElementById('ksigFilterReset').addEventListener('click', function(){
      L.filters = { symbol:'', timeframe:'', dir:'', period:'' };
      document.body.removeChild(wrap);
      loadList(true); renderList();
    });
    document.getElementById('ksigFilterApply').addEventListener('click', function(){
      L.filters = pending;
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

  function renderRecap(){
    var R = state.recap;
    el.innerHTML =
      appBar('Rekap Signal', { back:'/signal/' }) +
      '<div class="ksig-main">'+
        '<div class="ksig-recap-card">'+
          '<div class="ksig-tabs">'+
            tab('DAILY','Harian') + tab('WEEKLY','Mingguan') + tab('MONTHLY','Bulanan') +
          '</div>'+
          '<div id="ksigRecapBody"></div>'+
        '</div>'+
      '</div>';
    updateLiveDot();
    document.querySelectorAll('.ksig-tab').forEach(function(t){
      t.addEventListener('click', function(){ loadRecap(t.getAttribute('data-type')); });
    });
    renderRecapBody();
    if(!R.row && !R.loading) loadRecap(R.type);
    function tab(type,label){
      return '<div class="ksig-tab'+(R.type===type?' active':'')+'" data-type="'+type+'">'+label+'</div>';
    }
  }
  function renderRecapBody(){
    var body = document.getElementById('ksigRecapBody');
    if(!body) return;
    var R = state.recap;
    if(R.loading){ body.innerHTML = '<div class="ksig-skel"><div class="ksig-skel-row" style="height:120px"></div></div>'; return; }
    if(R.error){ body.innerHTML = '<div class="ksig-error"><p>'+esc(R.error)+'</p></div>'; return; }
    if(!R.row){ body.innerHTML = '<div class="ksig-empty">Belum ada rekap untuk periode ini.</div>'; return; }
    var r = R.row;
    body.innerHTML =
      '<div class="ksig-recap-stats">'+
        stat('Total Signal', r.total_signal) +
        stat('Buy / Sell', (r.total_buy||0)+' / '+(r.total_sell||0)) +
        stat('Profit', r.total_profit, 'pos') +
        stat('Loss', r.total_loss, 'neg') +
        stat('Win Rate', (r.winrate!=null? fmtNum(r.winrate,1)+'%' : '-')) +
        stat('Total Pips', (r.total_pips!=null? (r.total_pips>=0?'+':'')+fmtNum(r.total_pips,1) : '-'), r.total_pips>=0?'pos':'neg') +
      '</div>'+
      '<div class="ksig-recap-period">'+fmtWIB(r.period_start_wib,{hour:undefined,minute:undefined})+' – '+fmtWIB(r.period_end_wib,{hour:undefined,minute:undefined})+(r.pair?' • '+esc(r.pair):'')+'</div>';
    function stat(label,val,cls){
      return '<div class="ksig-stat"><div class="ksig-stat-label">'+esc(label)+'</div><div class="ksig-stat-value'+(cls?' '+cls:'')+'">'+esc(val==null?'-':val)+'</div></div>';
    }
  }

  var EVENT_LABEL = {
    NEW_ZONE:'Signal dibuat', ZONE_ACTIVE:'Signal aktif', RUNNING_UPDATE:'Update berjalan',
    TP1_HIT:'TP1 tercapai', TP2_HIT:'TP2 tercapai', TP3_HIT:'TP3 tercapai',
    HOLD1_HIT:'Target lanjutan 1', HOLD2_HIT:'Target lanjutan 2', HOLD3_HIT:'Target lanjutan 3',
    RR_1_1_REACHED:'RR 1:1 tercapai', HIGH_RISK_WARNING:'Peringatan risiko tinggi',
    CRITICAL_ZONE_WARNING:'Peringatan zona kritis', HIT_INVALIDASI:'Invalidasi'
  };

  function renderDetail(){
    var D = state.detail;
    if(D.id_zona !== state.route.id_zona) loadDetail(state.route.id_zona);
    el.innerHTML = appBar('Detail Signal', { back:'/signal/list/'+(state.list.status||'fresh') }) + '<div class="ksig-main" id="ksigDetailBody"></div>';
    updateLiveDot();
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
    var rows = [
      ['ID Zona', s.id_zona],
      ['Timeframe', s.timeframe],
      ['Jenis Zona', s.jenis_zona],
      ['Area', fmtNum(s.area_low)+' – '+fmtNum(s.area_high)],
      ['TP1 / TP2 / TP3', [s.tp1,s.tp2,s.tp3].map(function(v){return v!=null?fmtNum(v):'-';}).join(' / ')],
      ['Invalidasi', s.invalidasi!=null?fmtNum(s.invalidasi):'-'],
      ['Running Point', s.running_point!=null?fmtNum(s.running_point,1):'-'],
      ['Hasil Akhir', s.result_point!=null?fmtNum(s.result_point,1):'-'],
      ['Dibuat', fmtWIB(s.created_at)],
      ['Update Terakhir', fmtWIB(s.updated_at)]
    ];
    var html =
      '<div class="ksig-detail-head">'+
        '<div class="ksig-detail-top"><span class="ksig-detail-symbol">'+esc(s.pair)+'</span><span class="ksig-badge '+dirBadge+'">'+esc(s.skenario||'-')+'</span><span class="ksig-badge '+s.display_status+'">'+esc(STATUS_LABEL[s.display_status]||s.display_status)+'</span></div>'+
        (s.setup_description ? '<div class="ksig-detail-sub">'+esc(s.setup_description)+'</div>' : '') +
        '<div class="ksig-detail-rows">' + rows.map(function(r){ return '<div class="ksig-detail-row"><span>'+esc(r[0])+'</span><strong>'+esc(r[1]==null?'-':r[1])+'</strong></div>'; }).join('') + '</div>'+
      '</div>'+
      '<div class="ksig-timeline-card">'+
        '<div class="ksig-timeline-title">Riwayat Perkembangan</div>'+
        (D.events.length ? D.events.map(function(ev){
          return '<div class="ksig-tl-item"><div class="ksig-tl-time">'+fmtTimeShort(ev.created_at)+'</div><div class="ksig-tl-body"><strong>'+esc(ev.event_title || EVENT_LABEL[ev.event_type] || ev.event_type)+'</strong>'+(ev.event_description?'<span>'+esc(ev.event_description)+'</span>':'')+'</div></div>';
        }).join('') : '<div class="ksig-empty" style="padding:16px 0;">Belum ada riwayat perkembangan.</div>')+
      '</div>';
    body.innerHTML = html;
  }

  /* ---------------- start ---------------- */
  boot();
})();
