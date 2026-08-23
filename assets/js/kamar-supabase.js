(function(){
  'use strict';
  if(window.__KAMAR_SUPABASE_29F__) return;
  window.__KAMAR_SUPABASE_29F__ = true;

  // FIX 2026-08-22: lock kustom no-op untuk bypass navigator.locks (Web Locks API) milik
  // supabase-js. Default supabase-js v2 pakai navigator.locks saat auth.getSession()/refresh,
  // dan ini diketahui bisa NYANGKUT TANPA PERNAH resolve di browser berbasis WebKit/iOS
  // (Safari iOS, termasuk Chrome-di-iPhone karena mesinnya tetap WebKit) -- akar masalah
  // dashboard Kamar Signal macet selamanya di iPhone padahal normal di Android. Lock ini
  // langsung jalankan fn() tanpa antre lock browser sama sekali.
  function kamarNoopAuthLock(name, acquireTimeout, fn){
    return fn();
  }

  function trim(v){ return String(v == null ? '' : v).trim(); }
  function normalizeUrl(url){
    url = trim(url);
    url = url.replace(/\/+$/,'');
    url = url.replace(/\/rest\/v1$/,'');
    return url;
  }
  function readConfig(){
    var c = window.KAMAR_CONFIG || window.KamarConfig || window.kamarConfig || window.kamarConfigPublic || {};
    var url = c.supabaseUrl || c.SUPABASE_URL || c.url || window.KAMAR_SUPABASE_URL || window.SUPABASE_URL || '';
    var key = c.supabaseAnonKey || c.SUPABASE_ANON_KEY || c.anonKey || c.key || window.KAMAR_SUPABASE_ANON_KEY || window.SUPABASE_ANON_KEY || '';
    return { url: normalizeUrl(url), key: trim(key), hasConfig: !!(normalizeUrl(url) && trim(key)) };
  }
  function applyConfig(cfg){
    cfg = cfg || readConfig();
    window.KAMAR_CONFIG = window.KAMAR_CONFIG || {};
    window.KAMAR_CONFIG.supabaseUrl = cfg.url;
    window.KAMAR_CONFIG.supabaseAnonKey = cfg.key;
    window.KAMAR_CONFIG.SUPABASE_URL = cfg.url;
    window.KAMAR_CONFIG.SUPABASE_ANON_KEY = cfg.key;
    window.KAMAR_SUPABASE_URL = cfg.url;
    window.KAMAR_SUPABASE_ANON_KEY = cfg.key;
    return cfg;
  }
  function createClientFromConfig(cfg){
    cfg = applyConfig(cfg || readConfig());
    if(window.kamarSupabaseClient) return window.kamarSupabaseClient;
    if(!(window.supabase && window.supabase.createClient)) return null;
    if(!cfg.url || !cfg.key) return null;
    window.kamarSupabaseClient = window.supabase.createClient(cfg.url, cfg.key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        lock: kamarNoopAuthLock
      }
    });
    window.KamarSupabase.client = window.kamarSupabaseClient;
    window.KamarSupabaseClient = window.kamarSupabaseClient;
    return window.kamarSupabaseClient;
  }
  async function fetchConfigFallback(){
    var endpoints = ['/api/kamar-config', '/supabase-config.json', '/kamar-config.json'];
    for(var i=0;i<endpoints.length;i++){
      try{
        var res = await fetch(endpoints[i] + '?t=' + Date.now(), { cache: 'no-store' });
        if(!res.ok) continue;
        var data = await res.json();
        var cfg = {
          url: normalizeUrl(data.supabaseUrl || data.SUPABASE_URL || data.url || data.projectUrl || ''),
          key: trim(data.supabaseAnonKey || data.SUPABASE_ANON_KEY || data.anonKey || data.key || '')
        };
        cfg.hasConfig = !!(cfg.url && cfg.key);
        if(cfg.hasConfig) return applyConfig(cfg);
      }catch(e){}
    }
    return applyConfig(readConfig());
  }
  function __dbg(msg){
    try{
      var elx = document.getElementById('__ksigDebugLog');
      if(!elx){
        elx = document.createElement('div');
        elx.id = '__ksigDebugLog';
        elx.style.cssText = 'position:fixed;left:0;right:0;bottom:0;max-height:45vh;overflow:auto;background:rgba(0,0,0,.92);color:#0f0;font:10px/1.4 monospace;padding:8px;z-index:2147483647;white-space:pre-wrap;word-break:break-all;';
        (document.body||document.documentElement).appendChild(elx);
      }
      var line = document.createElement('div');
      line.textContent = '[sup ' + Date.now()%100000 + 'ms] ' + msg;
      elx.appendChild(line);
    }catch(e){}
  }
  async function ready(){
    __dbg('ready() dipanggil');
    
    __dbg('ready(): window.kamarSupabaseClient sudah ada? ' + (!!window.kamarSupabaseClient));if(window.kamarSupabaseClient) return window.kamarSupabaseClient;
    // FIX 2026-08-23: cache promise ready() supaya HANYA SATU proses fetch-config +
    // buat-client yang pernah jalan per page load, tidak peduli berapa banyak pemanggil
    // independen (boot(), auto-init bawah file ini, maintenance-check, dll). SEBELUM fix
    // ini, tiap pemanggil ready() memicu eksekusi BARU sendiri-sendiri secara paralel --
    // dibuktikan lewat log debug: createClientFromConfig() berhasil dipanggil ULANG
    // beberapa kali oleh pemanggil BERBEDA di HP iOS yang sama, dan salah satu
    // pemanggilnya (punya boot()) tidak pernah dapat balasan sama sekali -- diduga kuat
    // race/deadlock WebKit saat beberapa instance client Supabase dibuat bersamaan.
    if(window.__kamarReadyInFlight) return window.__kamarReadyInFlight;
    window.__kamarReadyInFlight = (async function(){
    __dbg('ready(): akan tunggu KAMAR_CONFIG_READY, ada: ' + (!!window.KAMAR_CONFIG_READY)); try { if(window.KAMAR_CONFIG_READY) await window.KAMAR_CONFIG_READY; } catch(e) {} __dbg('ready(): selesai tunggu KAMAR_CONFIG_READY');
    var cfg = readConfig();
    __dbg('ready(): readConfig() selesai, hasConfig: ' + (cfg && cfg.hasConfig));
    __dbg('ready(): akan panggil fetchConfigFallback (cfg blm ada)'); if(!cfg.hasConfig) cfg = await fetchConfigFallback(); __dbg('ready(): fetchConfigFallback selesai, hasConfig: ' + (cfg && cfg.hasConfig));
    __dbg('ready(): akan panggil createClientFromConfig'); var client = createClientFromConfig(cfg); __dbg('ready(): createClientFromConfig SELESAI, client ada: ' + (!!client));
    window.dispatchEvent(new CustomEvent('kamar:supabase-ready', { detail: { ok: !!client, config: cfg } }));
    return client;
    })();
    return window.__kamarReadyInFlight;
  }
  async function select(table, options){
    options = options || {};
    var client = await ready();
    if(!client) throw new Error('Client Supabase tidak terbaca. Config URL/key belum siap atau Supabase SDK gagal dimuat.');
    var q = client.from(table).select(options.columns || '*', options.count ? { count: options.count } : undefined);
    if(options.eq){ Object.keys(options.eq).forEach(function(k){ q = q.eq(k, options.eq[k]); }); }
    if(options.order){ q = q.order(options.order, { ascending: options.ascending !== false }); }
    if(options.limit) q = q.limit(options.limit);
    var res = await q;
    if(res.error) throw res.error;
    return res;
  }
  async function insert(table, row){
    var client = await ready();
    if(!client) throw new Error('Client Supabase tidak terbaca.');
    var res = await client.from(table).insert(row).select();
    if(res.error) throw res.error;
    return res.data || [];
  }
  async function update(table, values, eq){
    var client = await ready();
    if(!client) throw new Error('Client Supabase tidak terbaca.');
    var q = client.from(table).update(values);
    Object.keys(eq || {}).forEach(function(k){ q = q.eq(k, eq[k]); });
    var res = await q.select();
    if(res.error) throw res.error;
    return res.data || [];
  }
  async function upsert(table, row, options){
    var client = await ready();
    if(!client) throw new Error('Client Supabase tidak terbaca.');
    var res = await client.from(table).upsert(row, options || {}).select();
    if(res.error) throw res.error;
    return res.data || [];
  }

  window.KamarSupabase = window.KamarSupabase || {};
  window.KamarSupabase.getConfig = readConfig;
  window.KamarSupabase.getClient = function(){ return window.kamarSupabaseClient || createClientFromConfig(readConfig()); };
  window.KamarSupabase.ready = ready;
  window.KamarSupabase.select = select;
  window.KamarSupabase.insert = insert;
  window.KamarSupabase.update = update;
  window.KamarSupabase.upsert = upsert;
  window.KamarSupabase.client = createClientFromConfig(readConfig());
  window.KAMAR_DB_READY = ready();
})();

/* Kamar Step 62: site-wide maintenance notice, read live from Supabase
   (table maintenance_settings) instead of the old localStorage-only
   toggle. This file is loaded on every page, so this runs everywhere
   without needing to edit each page's own scripts. The old inline
   localStorage-based notice scripts left on individual pages are now
   dead code (harmless) since admin-maintenance.html no longer writes
   to localStorage. */
(function(){
  'use strict';
  if(window.__KAMAR_MAINTENANCE_LIVE_62__) return;
  window.__KAMAR_MAINTENANCE_LIVE_62__ = true;

  var PAGE_MAP = {
    "index.html":["home"],
    "member.html":["member_dashboard"],
    "dashboard.html":["member_dashboard"],
    "affiliate-dashboard.html":["affiliate_dashboard"],
    "affiliate.html":["register_affiliate"],
    "register.html":["register_member"],
    "member-profile.html":["member_dashboard"],
    "member-materials.html":["kamar_edukasi"],
    "member-study.html":["kamar_study"],
    "member-private.html":["kamar_private"],
    "member-indicator.html":["kamar_indikator"],
    "member-robot.html":["kamar_robot"],
    "member-activate.html":["payment"],
    "member-activate-edukasi.html":["payment","kamar_edukasi"],
    "member-activate-study.html":["payment","kamar_study"]
  };

  function esc(v){ return String(v==null?'':v).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }

  async function run(){
    var file = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    var keys = PAGE_MAP[file];
    if(!keys || !keys.length) return;
    try{
      var client = window.kamarSupabaseClient || (window.KamarSupabase && await window.KamarSupabase.ready());
      if(!client) return;
      var res = await client.from('maintenance_settings')
        .select('maintenance_key,title,message,is_active')
        .in('maintenance_key', keys)
        .eq('is_active', true)
        .limit(1);
      if(res.error || !res.data || !res.data.length) return;
      if(document.getElementById('kamarMaintenanceNoticeLive')) return;
      var row = res.data[0];
      var bar = document.createElement('div');
      bar.id = 'kamarMaintenanceNoticeLive';
      bar.style.cssText = 'position:fixed;left:16px;right:16px;bottom:16px;z-index:99999;border:1px solid rgba(238,206,122,.42);background:rgba(9,9,8,.96);color:#fff3d8;border-radius:18px;padding:16px 18px;font-weight:900;box-shadow:0 16px 50px rgba(0,0,0,.45);text-align:left';
      bar.innerHTML = '<strong style="letter-spacing:.12em;text-transform:uppercase">'+esc(row.title||'Maintenance')+'</strong><br><span style="color:#cfc5ad;font-weight:800;line-height:1.5">'+esc(row.message||'Maintenance sedang berlangsung. Silakan cek kembali nanti.')+'</span>';
      function place(){ document.body.appendChild(bar); }
      if(document.body) place(); else document.addEventListener('DOMContentLoaded', place);
    }catch(e){}
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', run); else run();
})();

/* Kamar Step 65: live Banner Pengumuman on EVERY real page (public/member/
   affiliate/admin), replacing the old index.html-only version. Reads
      display_area (public/member/admin/affiliate/both/global) and
         display_style (topbar = full-width card at top of page content,
            floating_card = fixed dismissible card bottom-left that reappears on
               every refresh since nothing is saved to storage) from Supabase table
                  banners. Order-of-appearance rule (banner, then video, then materi,
                     then file tools) is kept by inserting topbar banners as the very
                        first child of the main content area. */
(function(){
  'use strict';
  if(window.__KAMAR_BANNERS_LIVE_65__) return;
  window.__KAMAR_BANNERS_LIVE_65__ = true;

  function pageFile(){ return (location.pathname.split('/').pop()||'index.html').toLowerCase(); }
  function pageCtx(){
    var f=pageFile();
    if(f==='dashboard.html' || f.indexOf('member-')===0) return 'member';
    if(f==='affiliate-dashboard.html') return 'affiliate';
    if(f==='admin.html' || f.indexOf('admin-')===0) return 'admin';
    if(f==='index.html') return 'public';
    return null;
  }
  function esc(v){ return String(v==null?'':v).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function cardInner(b){
    var html='';
    if(b.image_url) html += '<img src="'+esc(b.image_url)+'" alt="" style="width:52px;height:52px;border-radius:14px;object-fit:cover;flex:none">';
    html += '<div style="flex:1;min-width:180px">';
    if(b.title) html += '<strong style="display:block;font-size:15px;margin-bottom:3px">'+esc(b.title)+'</strong>';
    if(b.body) html += '<span style="line-height:1.5;opacity:.85">'+esc(b.body)+'</span>';
    html += '</div>';
    if(b.cta_label && b.cta_url) html += '<a href="'+esc(b.cta_url)+'" style="flex:none;display:inline-flex;border:0;border-radius:999px;background:linear-gradient(135deg,#f4df90,#c69a39);color:#111;font-weight:900;padding:9px 14px;text-decoration:none;font-size:13px">'+esc(b.cta_label)+'</a>';
    return html;
  }
  async function run(){
    var ctx=pageCtx();
    if(!ctx) return;
    if(document.getElementById('kamarBannersTopbar65')||document.getElementById('kamarBannersFloating65')) return;
    var areas=[ctx,'both','global'];
    try{
      var client = window.kamarSupabaseClient || (window.KamarSupabase && await window.KamarSupabase.ready());
      if(!client) return;
      var res = await client.from('banners')
        .select('title,body,image_url,cta_label,cta_url,display_area,display_style,is_active,start_at,end_at,sort_order,created_at')
        .eq('is_active', true)
        .in('display_area', areas)
        .order('sort_order', { ascending:true })
        .order('created_at', { ascending:false });
      if(res.error || !res.data || !res.data.length) return;
      var now=Date.now();
      var rows=res.data.filter(function(b){
        if(b.start_at && new Date(b.start_at).getTime()>now) return false;
        if(b.end_at && new Date(b.end_at).getTime()<now) return false;
        return true;
      });
      if(!rows.length) return;
      var dark = true;
      var topRows = rows.filter(function(b){return b.display_style!=='floating_card';}).slice(0,3);
      var floatRows = rows.filter(function(b){return b.display_style==='floating_card';}).slice(0,2);
      if(topRows.length){
        var main=document.querySelector('main#top')||document.querySelector('.split-main')||document.querySelector('.admin-main')||document.querySelector('main');
        if(main){
          var wrap=document.createElement('div');
          wrap.id='kamarBannersTopbar65';
          wrap.style.cssText='display:grid;gap:12px;margin:0 0 20px';
          topRows.forEach(function(b){
            var card=document.createElement('div');
            card.style.cssText = dark
              ? 'border:1px solid rgba(238,206,122,.32);background:rgba(9,9,8,.94);color:#fff3d8;border-radius:20px;padding:16px 18px;display:flex;gap:14px;align-items:center;flex-wrap:wrap'
              : 'border:1px solid rgba(184,138,61,.35);background:linear-gradient(135deg,rgba(184,138,61,.10),rgba(255,255,255,.55));color:#11141c;border-radius:22px;padding:18px 20px;display:flex;gap:16px;align-items:center;flex-wrap:wrap;backdrop-filter:blur(4px)';
            card.innerHTML=cardInner(b);
            wrap.appendChild(card);
          });
          main.insertBefore(wrap, main.firstChild);
        }
      }
      if(floatRows.length){
        var fwrap=document.createElement('div');
        fwrap.id='kamarBannersFloating65';
        fwrap.style.cssText='position:fixed;left:16px;bottom:16px;z-index:9998;display:grid;gap:10px;max-width:340px';
        floatRows.forEach(function(b){
          var card=document.createElement('div');
          card.style.cssText=(dark?'border:1px solid rgba(238,206,122,.34);background:rgba(9,9,8,.96);color:#fff3d8;':'border:1px solid rgba(184,138,61,.35);background:#fffdf7;color:#11141c;')+'border-radius:18px;padding:14px 16px;display:flex;gap:12px;align-items:flex-start;box-shadow:0 16px 46px rgba(0,0,0,.35);position:relative';
          card.innerHTML=cardInner(b);
          var closeBtn=document.createElement('button');
          closeBtn.textContent='×'; closeBtn.type='button';
          closeBtn.style.cssText='position:absolute;top:8px;right:10px;background:none;border:0;color:inherit;opacity:.6;font-size:16px;cursor:pointer;line-height:1';
          closeBtn.onclick=function(){ card.remove(); };
          card.appendChild(closeBtn);
          fwrap.appendChild(card);
        });
        document.body.appendChild(fwrap);
      }
    }catch(e){}
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', run); else run();
})();

/* Kamar Step 64: personal per-member announcements. New table
   member_notifications (RLS: member only sees their own rows via
   current_profile_id()) - admin sends one from the member detail panel in
   admin-activation.html, this reads it back only for the logged-in member
   it was written for and lets them dismiss it (marks is_read = true so it
   never shows again). */
(function(){
  'use strict';
  if(window.__KAMAR_MEMBER_NOTIFS_64__) return;
  window.__KAMAR_MEMBER_NOTIFS_64__ = true;

  var PAGES = ["dashboard.html","member-profile.html","member-materials.html","member-study.html","member-private.html","member-indicator.html","member-robot.html"];

  function esc(v){ return String(v==null?'':v).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }

  async function run(){
    var file = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    if(PAGES.indexOf(file) === -1) return;
    
if(document.getElementById('kamarMemberNotifs64')) return;
    try{
      var client = window.kamarSupabaseClient || (window.KamarSupabase && await window.KamarSupabase.ready());
      if(!client) return;
      var res = await client.from('member_notifications')
        .select('id,title,message,created_at')
        .eq('is_read', false)
        .order('created_at', { ascending:true })
        .limit(5);
      if(res.error || !res.data || !res.data.length) return;
      try{var kNotifSnd=new Audio('/assets/sounds/kamar-notif-A-chime.mp3');kNotifSnd.volume=0.55;kNotifSnd.play().catch(function(){});}catch(kNotifErr){}
      if(document.getElementById('kamarMemberNotifs64')) return;
      var main = document.querySelector('.split-main') || document.querySelector('main');
      var wrap = document.createElement('div');
      wrap.id = 'kamarMemberNotifs64';
      wrap.style.cssText = 'display:grid;gap:12px;margin:0 0 20px';
      res.data.forEach(function(n){
        var card = document.createElement('div');
        card.style.cssText = 'border:1px solid rgba(238,206,122,.32);background:rgba(9,9,8,.92);color:#fff3d8;border-radius:20px;padding:16px 18px;display:flex;justify-content:space-between;gap:14px;align-items:flex-start;box-shadow:0 12px 40px rgba(0,0,0,.35)';
        var body = document.createElement('div');
        body.innerHTML = '<strong style="display:block;letter-spacing:.04em;margin-bottom:4px">'+esc(n.title||'Pengumuman')+'</strong><span style="color:#cfc5ad;line-height:1.5">'+esc(n.message||'')+'</span>';
        var closeBtn = document.createElement('button');
        closeBtn.textContent = 'Tutup';
        closeBtn.type = 'button';
        closeBtn.style.cssText = 'flex:none;border:1px solid rgba(238,206,122,.3);background:rgba(255,255,255,.06);color:#f3d985;border-radius:999px;padding:8px 14px;font-weight:900;cursor:pointer';
        closeBtn.onclick = async function(){
          card.style.opacity = '0.4'; closeBtn.disabled = true;
          try{
            await client.from('member_notifications').update({ is_read:true, read_at:new Date().toISOString() }).eq('id', n.id);
            card.remove();
          }catch(e){ closeBtn.disabled = false; card.style.opacity = '1'; }
        };
        card.appendChild(body); card.appendChild(closeBtn);
        wrap.appendChild(card);
      });
      if(main) main.insertBefore(wrap, main.firstChild);
      else document.body.insertBefore(wrap, document.body.firstChild);
    }catch(e){}
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
