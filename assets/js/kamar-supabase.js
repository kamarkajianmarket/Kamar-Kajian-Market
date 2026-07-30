(function(){
  'use strict';
  if(window.__KAMAR_SUPABASE_29F__) return;
  window.__KAMAR_SUPABASE_29F__ = true;

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
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
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
  async function ready(){
    if(window.kamarSupabaseClient) return window.kamarSupabaseClient;
    try { if(window.KAMAR_CONFIG_READY) await window.KAMAR_CONFIG_READY; } catch(e) {}
    var cfg = readConfig();
    if(!cfg.hasConfig) cfg = await fetchConfigFallback();
    var client = createClientFromConfig(cfg);
    window.dispatchEvent(new CustomEvent('kamar:supabase-ready', { detail: { ok: !!client, config: cfg } }));
    return client;
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

/* Kamar Step 63: live Banner Pengumuman on the public homepage, read from
   Supabase (table banners) instead of never being shown at all. Admin can
   already write rows to this table from admin-banner.html; this is the
   missing "read" side. Only active banners (is_active = true) whose
   display_area is public/both/global are shown, newest first, placed at
   the very top of <main id="top"> so it doesn't disturb the existing
   layout. Colors are tuned for this page's light theme (see PAGE_AREA -
   admin pages use a dark theme and are handled separately). */
(function(){
  'use strict';
  if(window.__KAMAR_BANNERS_LIVE_63__) return;
  window.__KAMAR_BANNERS_LIVE_63__ = true;

  var PAGE_AREA = {
    "index.html": ["public","both","global"]
  };

  function esc(v){ return String(v==null?'':v).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }

  async function run(){
    var file = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    var areas = PAGE_AREA[file];
    if(!areas || !areas.length) return;
    if(document.getElementById('kamarBannersLive63')) return;
    var main = document.querySelector('main#top') || document.querySelector('main');
    if(!main) return;
    try{
      var client = window.kamarSupabaseClient || (window.KamarSupabase && await window.KamarSupabase.ready());
      if(!client) return;
      var res = await client.from('banners')
        .select('title,body,image_url,cta_label,cta_url,display_area,is_active,created_at')
        .eq('is_active', true)
        .in('display_area', areas)
        .order('created_at', { ascending:false })
        .limit(3);
      if(res.error || !res.data || !res.data.length) return;
      if(document.getElementById('kamarBannersLive63')) return;
      var wrap = document.createElement('div');
      wrap.id = 'kamarBannersLive63';
      wrap.style.cssText = 'display:grid;gap:14px;margin:0 0 22px';
      res.data.forEach(function(b){
        var card = document.createElement('div');
        card.style.cssText = 'border:1px solid rgba(184,138,61,.35);background:linear-gradient(135deg,rgba(184,138,61,.10),rgba(255,255,255,.55));border-radius:22px;padding:18px 20px;color:#11141c;display:flex;gap:16px;align-items:center;flex-wrap:wrap;backdrop-filter:blur(4px)';
        var html = '';
        if(b.image_url) html += '<img src="'+esc(b.image_url)+'" alt="" style="width:56px;height:56px;border-radius:14px;object-fit:cover;flex:none">';
        html += '<div style="flex:1;min-width:200px">';
        if(b.title) html += '<strong style="display:block;font-size:16px;margin-bottom:4px;color:#11141c">'+esc(b.title)+'</strong>';
        if(b.body) html += '<span style="color:#4a4a52;line-height:1.5">'+esc(b.body)+'</span>';
        html += '</div>';
        if(b.cta_label && b.cta_url) html += '<a href="'+esc(b.cta_url)+'" style="flex:none;display:inline-flex;border:0;border-radius:999px;background:linear-gradient(135deg,#f4df90,#c69a39);color:#111;font-weight:900;padding:10px 16px;text-decoration:none">'+esc(b.cta_label)+'</a>';
        card.innerHTML = html;
        wrap.appendChild(card);
      });
      main.insertBefore(wrap, main.firstChild);
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
