(function(){
  'use strict';
  if(window.__KAMAR_SUPABASE_29D__) return;
  window.__KAMAR_SUPABASE_29D__ = true;

  function cfg(){
    var c = window.KAMAR_CONFIG || window.KamarConfig || window.kamarConfig || window.kamarConfigPublic || {};
    return {
      url: c.supabaseUrl || c.SUPABASE_URL || c.url || window.KAMAR_SUPABASE_URL || window.SUPABASE_URL || '',
      key: c.supabaseAnonKey || c.SUPABASE_ANON_KEY || c.anonKey || c.key || window.KAMAR_SUPABASE_ANON_KEY || window.SUPABASE_ANON_KEY || ''
    };
  }
  function create(){
    if(window.kamarSupabaseClient) return window.kamarSupabaseClient;
    var c = cfg();
    if(window.supabase && window.supabase.createClient && c.url && c.key){
      window.kamarSupabaseClient = window.supabase.createClient(c.url, c.key, {
        auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:true }
      });
      window.KamarSupabase.client = window.kamarSupabaseClient;
      return window.kamarSupabaseClient;
    }
    return null;
  }
  async function ready(){
    try { if(window.KAMAR_CONFIG_READY) await window.KAMAR_CONFIG_READY; } catch(e) {}
    return create();
  }

  window.KamarSupabase = window.KamarSupabase || {};
  window.KamarSupabase.getConfig = cfg;
  window.KamarSupabase.getClient = create;
  window.KamarSupabase.ready = ready;
  window.KamarSupabase.client = create();
})();
