// Kamar Step 62: public homepage CTA menyesuaikan status login.
// Kalau member/admin sudah login (sesi Supabase Auth masih ada), tombol
// "Daftar / Login" di navbar berubah jadi "Dashboard" mengarah ke dashboard.html.
// TIDAK mengubah logic auth/session lain, cuma membaca sesi yang sudah ada.
// Sesi sendiri defaultnya bertahan sampai logout manual (persistSession+autoRefreshToken
// di kamar-supabase.js), skrip ini tidak menambah/mengurangi durasi sesi.
(function(){
  'use strict';

  function swapToDashboard(){
    var links = document.querySelectorAll('a[href="register.html"]');
    links.forEach(function(a){
      if(a.textContent.trim().toLowerCase().indexOf('daftar') === -1) return;
      a.textContent = 'Dashboard';
      a.setAttribute('href', 'dashboard.html');
    });
  }

  function checkSession(){
    if(!(window.KamarSupabase && window.KamarSupabase.ready)) return;
    window.KamarSupabase.ready().then(function(client){
      client = client || (window.KamarSupabase.getClient && window.KamarSupabase.getClient());
      if(!client || !client.auth) return;
      return client.auth.getSession().then(function(res){
        var session = res && res.data && res.data.session;
        if(session && session.user) swapToDashboard();
      });
    }).catch(function(){});
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', checkSession);
  else checkSession();
})();
