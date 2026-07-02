(function(){
  'use strict';
  if(window.__KAMAR_SUPABASE_HELPER_26__) return; window.__KAMAR_SUPABASE_HELPER_26__=true;
  function cfg(){var c=window.KAMAR_CONFIG||window.KamarConfig||window.kamarConfig||window.kamarConfigPublic||{};return {url:c.supabaseUrl||c.SUPABASE_URL||c.url||window.KAMAR_SUPABASE_URL||window.SUPABASE_URL||'',key:c.supabaseAnonKey||c.SUPABASE_ANON_KEY||c.anonKey||c.key||window.KAMAR_SUPABASE_ANON_KEY||window.SUPABASE_ANON_KEY||''};}
  window.KamarSupabase=window.KamarSupabase||{};
  window.KamarSupabase.getClient=function(){
    if(window.kamarSupabaseClient) return window.kamarSupabaseClient;
    var c=cfg();
    if(window.supabase&&window.supabase.createClient&&c.url&&c.key){window.kamarSupabaseClient=window.supabase.createClient(c.url,c.key); window.KamarSupabase.client=window.kamarSupabaseClient; return window.kamarSupabaseClient;}
    return null;
  };
  window.KamarSupabase.client=window.KamarSupabase.getClient();
})();
