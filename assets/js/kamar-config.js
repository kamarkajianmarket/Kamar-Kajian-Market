(function(){
  'use strict';
  function readMeta(name){var m=document.querySelector('meta[name="'+name+'"]');return m?String(m.getAttribute('content')||'').trim():'';}
  function readLS(key){try{return String(localStorage.getItem(key)||'').trim();}catch(e){return '';}}
  var old=window.KAMAR_CONFIG||window.KamarConfig||window.kamarConfig||window.kamarConfigPublic||{};
  var url=old.supabaseUrl||old.SUPABASE_URL||old.url||window.KAMAR_SUPABASE_URL||window.SUPABASE_URL||readMeta('kamar-supabase-url')||readLS('KAMAR_SUPABASE_URL')||readLS('SUPABASE_URL')||'';
  var key=old.supabaseAnonKey||old.SUPABASE_ANON_KEY||old.anonKey||old.key||window.KAMAR_SUPABASE_ANON_KEY||window.SUPABASE_ANON_KEY||readMeta('kamar-supabase-anon-key')||readLS('KAMAR_SUPABASE_ANON_KEY')||readLS('SUPABASE_ANON_KEY')||'';
  window.KAMAR_CONFIG={supabaseUrl:url,supabaseAnonKey:key,SUPABASE_URL:url,SUPABASE_ANON_KEY:key,url:url,key:key};
  window.KamarConfig=window.KAMAR_CONFIG;
  window.kamarConfig=window.KAMAR_CONFIG;
})();
