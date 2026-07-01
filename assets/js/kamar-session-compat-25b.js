(function(){
  'use strict';
  if(window.__KAMAR_SESSION_COMPAT_25B__) return;
  window.__KAMAR_SESSION_COMPAT_25B__ = true;
  function safeJSON(v,d){try{return v?JSON.parse(v):d}catch(e){return d}}
  function get(k){try{return safeJSON(localStorage.getItem(k),null)}catch(e){return null}}
  function set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
  function raw(k,v){try{localStorage.setItem(k,String(v))}catch(e){}}
  function page(){return (location.pathname.split('/').pop()||'index.html').toLowerCase()}
  function roleNeeded(){var p=page(); if(p==='admin.html'||p.indexOf('admin-')===0) return p==='admin-login.html'?null:'admin'; if(p==='dashboard.html'||p.indexOf('member-')===0) return 'member'; if(p==='affiliate-dashboard.html') return 'affiliate'; return null;}
  function bestSession(role){
    var keys = role==='admin' ? ['kamarAdminSession','KAMAR_ADMIN_SESSION','kamarSession','kamarAuthSession','kamarUserSession'] : role==='member' ? ['kamarMemberSession','KAMAR_MEMBER_SESSION','kamarSession','kamarAuthSession','kamarUserSession'] : ['kamarAffiliateSession','KAMAR_AFFILIATE_SESSION','kamarSession','kamarAuthSession','kamarUserSession'];
    for(var i=0;i<keys.length;i++){var s=get(keys[i]); if(s && (!s.role || String(s.role).toLowerCase()===role || (role==='admin'&&String(s.role).toLowerCase().indexOf('admin')>=0))) return s;}
    return null;
  }
  function normalize(role,s){
    if(!role||!s) return;
    s.role=role; s.loginAt=s.loginAt||Date.now(); s.source=s.source||'compat25b';
    if(role==='admin'){
      set('kamarAdminSession',s); set('KAMAR_ADMIN_SESSION',s); raw('kamarAdminLogin','true'); raw('kamarAuthRole','admin');
    } else if(role==='member'){
      set('kamarMemberSession',s); set('KAMAR_MEMBER_SESSION',s); raw('kamarMemberLogin','true'); raw('kamarAuthRole','member');
    } else if(role==='affiliate'){
      set('kamarAffiliateSession',s); set('KAMAR_AFFILIATE_SESSION',s); raw('kamarAffiliateLogin','true'); raw('kamarAuthRole','affiliate');
    }
    set('kamarCurrentUser',{role:role,email:s.email||'',name:s.fullName||s.name||s.email||role,loginAt:s.loginAt});
    set('kamarSession',s); set('kamarAuthSession',s); set('kamarUserSession',s); raw('kamarLoggedIn','true'); raw('kamarUserRole',role); raw('kamarLoginRole',role);
  }
  function sync(){var r=roleNeeded(); if(!r) return; var s=bestSession(r); if(s) normalize(r,s);}
  sync(); document.addEventListener('visibilitychange',sync,true); window.addEventListener('pageshow',sync,true); document.addEventListener('click',function(e){var t=e.target&&e.target.closest&&e.target.closest('a,button'); if(!t) return; var txt=(t.textContent||'').toLowerCase(); var href=(t.getAttribute('href')||'').toLowerCase(); if(txt.indexOf('logout')>=0||href.indexOf('logout')>=0){window.__KAMAR_ALLOW_SESSION_CLEAR__=true; return;} sync();},true);
  var oldRemove=Storage.prototype.removeItem;
  Storage.prototype.removeItem=function(k){try{var r=roleNeeded(); if(r&&!window.__KAMAR_ALLOW_SESSION_CLEAR__&&/kamar.*(session|login|auth|currentuser|role|loggedin)/i.test(String(k||''))){return;}}catch(e){} return oldRemove.apply(this,arguments)};
  var oldClear=Storage.prototype.clear;
  Storage.prototype.clear=function(){try{var r=roleNeeded(); if(r&&!window.__KAMAR_ALLOW_SESSION_CLEAR__){return;}}catch(e){} return oldClear.apply(this,arguments)};
  window.KamarSessionCompat25B={sync:sync,normalize:normalize,bestSession:bestSession};
})();