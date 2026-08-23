(function(){
  'use strict';
  if(window.__KAMAR_CONFIG_29D__) return;
  window.__KAMAR_CONFIG_29D__ = true;

  function trim(v){ return String(v || '').trim(); }
  function readMeta(name){ var m=document.querySelector('meta[name="'+name+'"]'); return m ? trim(m.getAttribute('content')) : ''; }
  function readLS(key){ try { return trim(localStorage.getItem(key)); } catch(e){ return ''; } }
  function normalize(source){
    source = source || {};
    var url = trim(source.supabaseUrl || source.SUPABASE_URL || source.url || source.projectUrl || '');
    var key = trim(source.supabaseAnonKey || source.SUPABASE_ANON_KEY || source.anonKey || source.key || source.publicAnonKey || '');
    return { supabaseUrl:url, supabaseAnonKey:key, SUPABASE_URL:url, SUPABASE_ANON_KEY:key, url:url, key:key };
  }
  function current(){
    var old = window.KAMAR_CONFIG || window.KamarConfig || window.kamarConfig || window.kamarConfigPublic || {};
    return normalize({
      supabaseUrl: old.supabaseUrl || old.SUPABASE_URL || old.url || window.KAMAR_SUPABASE_URL || window.SUPABASE_URL || readMeta('kamar-supabase-url') || readLS('KAMAR_SUPABASE_URL') || readLS('SUPABASE_URL'),
      supabaseAnonKey: old.supabaseAnonKey || old.SUPABASE_ANON_KEY || old.anonKey || old.key || window.KAMAR_SUPABASE_ANON_KEY || window.SUPABASE_ANON_KEY || readMeta('kamar-supabase-anon-key') || readLS('KAMAR_SUPABASE_ANON_KEY') || readLS('SUPABASE_ANON_KEY')
    });
  }
  function apply(cfg){
    cfg = normalize(cfg);
    window.KAMAR_CONFIG = cfg;
    window.KamarConfig = cfg;
    window.kamarConfig = cfg;
    window.KAMAR_SUPABASE_URL = cfg.supabaseUrl;
    window.KAMAR_SUPABASE_ANON_KEY = cfg.supabaseAnonKey;
    return cfg;
  }

  apply(current());

  function __dbgc(msg){
    try{
      var elx = document.getElementById('__ksigDebugLog');
      if(!elx){
        elx = document.createElement('div');
        elx.id = '__ksigDebugLog';
        elx.style.cssText = 'position:fixed;left:0;right:0;bottom:0;max-height:45vh;overflow:auto;background:rgba(0,0,0,.92);color:#0f0;font:10px/1.4 monospace;padding:8px;z-index:2147483647;white-space:pre-wrap;word-break:break-all;';
        (document.body||document.documentElement).appendChild(elx);
      }
      var line = document.createElement('div');
      line.textContent = '[cfg ' + Date.now()%100000 + 'ms] ' + msg;
      elx.appendChild(line);
    }catch(e){}
  }

  window.KAMAR_CONFIG_READY = (async function(){
    __dbgc('IIFE mulai jalan');
    var cfg = current();
    __dbgc('current() selesai, hasConfig awal: ' + !!(cfg.supabaseUrl && cfg.supabaseAnonKey));
    if(cfg.supabaseUrl && cfg.supabaseAnonKey) return apply(cfg);

    var endpoints = ['/api/kamar-config', '/api/kamar-config.js', '/supabase-config.json', '/kamar-config.json'];
    __dbgc('config kosong, mulai coba endpoint fallback satu-satu');
    for(var i=0; i<endpoints.length; i++){
      try{
        __dbgc('mencoba fetch: ' + endpoints[i]); var res = await fetch(endpoints[i] + '?t=' + Date.now(), { cache:'no-store' }); __dbgc('fetch ' + endpoints[i] + ' SELESAI, status: ' + res.status);
        if(!res.ok) continue;
        var data = await res.json();
        cfg = normalize(data);
        if(cfg.supabaseUrl && cfg.supabaseAnonKey) return apply(cfg);
      catch(e){ __dbgc('fetch endpoint ke-' + i + ' GAGAL: ' + (e && (e.message||String(e)))); }
    }
    __dbgc('SEMUA endpoint gagal, fallback ke config kosong/asli'); return apply(current());
  })();

  window.KamarConfigReady = window.KAMAR_CONFIG_READY;
})();
