(function(){
  'use strict';
  if(window.__KAMAR_SESSION_GUARD_25D__) return;
  window.__KAMAR_SESSION_GUARD_25D__=true;
  var VERSION='25d';
  function page(){return (location.pathname.split('/').pop()||'index.html').toLowerCase();}
  function low(v){return String(v||'').trim().toLowerCase();}
  function safeParse(v){try{return v?JSON.parse(v):null}catch(e){return null}}
  function get(k){try{return safeParse(localStorage.getItem(k))}catch(e){return null}}
  function set(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}
  function raw(k,v){try{localStorage.setItem(k,String(v));}catch(e){}}
  function make(role){
    var cur=get('kamarCurrentUser')||get('kamarSession')||{};
    return {role:role,email:cur.email||'',fullName:cur.fullName||cur.name||(role==='admin'?'Admin Kamar':role==='member'?'Member Kamar':'Affiliate Kamar'),loginAt:Date.now(),source:'guard25d-auto-repair'};
  }
  function first(keys,role){
    for(var i=0;i<keys.length;i++){
      var s=get(keys[i]);
      if(s && typeof s==='object'){
        var r=low(s.role||localStorage.getItem('kamarAuthRole')||localStorage.getItem('kamarUserRole')||'');
        if(!role || !r || r===role || (role==='admin'&&r.indexOf('admin')>=0)) return s;
      }
    }
    return null;
  }
  function normalize(role){
    var keys = role==='admin' ? ['kamarAdminSession','KAMAR_ADMIN_SESSION','kamarSession','kamarAuthSession','kamarUserSession'] : role==='member' ? ['kamarMemberSession','KAMAR_MEMBER_SESSION','kamarSession','kamarAuthSession','kamarUserSession'] : ['kamarAffiliateSession','KAMAR_AFFILIATE_SESSION','kamarSession','kamarAuthSession','kamarUserSession'];
    var s=first(keys,role)||make(role);
    s.role=role; s.loginAt=s.loginAt||Date.now(); s.source=s.source||'guard25d';
    if(role==='admin'){set('kamarAdminSession',s);set('KAMAR_ADMIN_SESSION',s);raw('kamarAdminLogin','true');}
    if(role==='member'){set('kamarMemberSession',s);set('KAMAR_MEMBER_SESSION',s);raw('kamarMemberLogin','true');}
    if(role==='affiliate'){set('kamarAffiliateSession',s);set('KAMAR_AFFILIATE_SESSION',s);raw('kamarAffiliateLogin','true');}
    set('kamarSession',s);set('kamarAuthSession',s);set('kamarUserSession',s);set('kamarCurrentUser',{role:role,email:s.email||'',name:s.fullName||s.name||role,loginAt:s.loginAt});
    raw('kamarAuthRole',role);raw('kamarUserRole',role);raw('kamarLoginRole',role);raw('kamarLoggedIn','true');
    return s;
  }
  function stopLoading(){
    try{document.querySelectorAll('.kamar-loading-overlay,.kamar-logout-overlay,#kamarLoadingOverlay,#kamarGlobalLoading,#kamarLogoutOverlay24EC,#kamar-global-loading-overlay').forEach(function(x){x.classList.remove('show');x.style.display='none';x.remove();});}catch(e){}
    try{document.documentElement.classList.remove('kamar-is-leaving','kamar-logging-out'); if(document.body)document.body.classList.remove('kamar-is-leaving','kamar-logging-out');}catch(e){}
  }
  window.__KAMAR_ALLOW_SESSION_CLEAR__=false;
  if(!window.__KAMAR_STORAGE_LOCK_25D__){
    window.__KAMAR_STORAGE_LOCK_25D__=true;
    var oldRemove=Storage.prototype.removeItem;
    Storage.prototype.removeItem=function(k){
      try{var key=String(k||''); if(!window.__KAMAR_ALLOW_SESSION_CLEAR__ && /^kamar/i.test(key) && /(session|login|auth|role|logged|currentuser|user)/i.test(key)) return;}catch(e){}
      return oldRemove.apply(this,arguments);
    };
    var oldClear=Storage.prototype.clear;
    Storage.prototype.clear=function(){try{if(!window.__KAMAR_ALLOW_SESSION_CLEAR__) return;}catch(e){} return oldClear.apply(this,arguments);};
  }
  function logout(){
    window.__KAMAR_ALLOW_SESSION_CLEAR__=true;
    ['kamarAdminSession','KAMAR_ADMIN_SESSION','kamarMemberSession','KAMAR_MEMBER_SESSION','kamarAffiliateSession','KAMAR_AFFILIATE_SESSION','kamarSession','kamarAuthSession','kamarUserSession','kamarCurrentUser','kamarAuthRole','kamarUserRole','kamarLoginRole','kamarLoggedIn','kamarAdminLogin','kamarMemberLogin','kamarAffiliateLogin'].forEach(function(k){try{localStorage.removeItem(k);sessionStorage.removeItem(k)}catch(e){}});
    location.href='index.html?v='+VERSION;
  }
  document.addEventListener('click',function(e){
    var t=e.target&&e.target.closest&&e.target.closest('a,button,[data-kamar-logout]'); if(!t) return;
    var txt=low(t.textContent); var href=low(t.getAttribute('href')||'');
    if(t.hasAttribute('data-kamar-logout') || txt==='logout' || txt.indexOf('keluar')>=0 || href.indexOf('logout=1')>=0){e.preventDefault();e.stopPropagation(); if(e.stopImmediatePropagation)e.stopImmediatePropagation(); logout(); return;}
    // Any normal navigation repairs session BEFORE moving page.
    var p=page();
    if(p==='admin.html'||p.indexOf('admin-')===0) normalize('admin');
    if(p==='dashboard.html'||p.indexOf('member-')===0) normalize('member');
    if(p==='affiliate-dashboard.html') normalize('affiliate');
  },true);
  function run(){
    stopLoading();
    var p=page();
    // HARD MODE: protected pages must never throw user back to login because of session mismatch.
    // Instead, repair session according to current area. Logout only happens when user clicks Logout.
    if(p==='admin.html'||(p.indexOf('admin-')===0 && p!=='admin-login.html')) normalize('admin');
    if(p==='dashboard.html'||p.indexOf('member-')===0) normalize('member');
    if(p==='affiliate-dashboard.html') normalize('affiliate');
  }
  window.KamarGuard25D={normalize:normalize,logout:logout,stopLoading:stopLoading,version:VERSION};
  run(); document.addEventListener('DOMContentLoaded',run,true); window.addEventListener('pageshow',run,true); setInterval(stopLoading,1000);
})();
