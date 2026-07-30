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
