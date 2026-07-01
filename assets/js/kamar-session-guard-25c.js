(function(){
  'use strict';
  if(window.__KAMAR_SESSION_GUARD_25C__) return;
  window.__KAMAR_SESSION_GUARD_25C__ = true;
  var VERSION='25c';
  function page(){return (location.pathname.split('/').pop()||'index.html').toLowerCase();}
  function safeJSON(v,d){try{return v?JSON.parse(v):d}catch(e){return d}}
  function get(k){try{return safeJSON(localStorage.getItem(k),null)}catch(e){return null}}
  function set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
  function raw(k,v){try{localStorage.setItem(k,String(v))}catch(e){}}
  function low(v){return String(v||'').trim().toLowerCase()}
  function stopLoading(){
    try{document.querySelectorAll('.kamar-loading-overlay,.kamar-logout-overlay,#kamarLoadingOverlay,#kamarGlobalLoading,#kamarLogoutOverlay24EC,#kamar-global-loading-overlay').forEach(function(x){x.classList.remove('show');x.style.display='none';x.remove();});}catch(e){}
    try{document.body.classList.remove('kamar-is-leaving','kamar-logging-out');document.documentElement.classList.remove('kamar-is-leaving','kamar-logging-out');}catch(e){}
  }
  function first(keys,role){
    for(var i=0;i<keys.length;i++){
      var s=get(keys[i]);
      if(s && typeof s==='object'){
        if(!role || !s.role || low(s.role)===role || (role==='admin' && low(s.role).indexOf('admin')>=0)) return s;
      }
    }
    return null;
  }
  function hasAdmin(){return !!first(['kamarAdminSession','KAMAR_ADMIN_SESSION','kamarSession','kamarAuthSession','kamarUserSession'],'admin') || (low(localStorage.getItem('kamarAuthRole'))==='admin' && localStorage.getItem('kamarLoggedIn')==='true') || localStorage.getItem('kamarAdminLogin')==='true';}
  function hasMember(){return !!first(['kamarMemberSession','KAMAR_MEMBER_SESSION','kamarSession','kamarAuthSession','kamarUserSession'],'member') || (low(localStorage.getItem('kamarAuthRole'))==='member' && localStorage.getItem('kamarLoggedIn')==='true') || localStorage.getItem('kamarMemberLogin')==='true';}
  function hasAffiliate(){return !!first(['kamarAffiliateSession','KAMAR_AFFILIATE_SESSION','kamarSession','kamarAuthSession','kamarUserSession'],'affiliate') || (low(localStorage.getItem('kamarAuthRole'))==='affiliate' && localStorage.getItem('kamarLoggedIn')==='true') || localStorage.getItem('kamarAffiliateLogin')==='true';}
  function normalize(role){
    var keys = role==='admin' ? ['kamarAdminSession','KAMAR_ADMIN_SESSION','kamarSession','kamarAuthSession','kamarUserSession'] : role==='member' ? ['kamarMemberSession','KAMAR_MEMBER_SESSION','kamarSession','kamarAuthSession','kamarUserSession'] : ['kamarAffiliateSession','KAMAR_AFFILIATE_SESSION','kamarSession','kamarAuthSession','kamarUserSession'];
    var s=first(keys,role)||{role:role,email:'',fullName:role};
    s.role=role; s.loginAt=s.loginAt||Date.now(); s.source=s.source||'guard25c';
    if(role==='admin'){set('kamarAdminSession',s);set('KAMAR_ADMIN_SESSION',s);raw('kamarAdminLogin','true');}
    if(role==='member'){set('kamarMemberSession',s);set('KAMAR_MEMBER_SESSION',s);raw('kamarMemberLogin','true');}
    if(role==='affiliate'){set('kamarAffiliateSession',s);set('KAMAR_AFFILIATE_SESSION',s);raw('kamarAffiliateLogin','true');}
    set('kamarSession',s);set('kamarAuthSession',s);set('kamarUserSession',s);set('kamarCurrentUser',{role:role,email:s.email||'',name:s.fullName||s.name||s.email||role,loginAt:s.loginAt});raw('kamarAuthRole',role);raw('kamarUserRole',role);raw('kamarLoginRole',role);raw('kamarLoggedIn','true');
  }
  window.__KAMAR_ALLOW_SESSION_CLEAR__ = false;
  var oldRemove=Storage.prototype.removeItem;
  Storage.prototype.removeItem=function(k){
    try{if(!window.__KAMAR_ALLOW_SESSION_CLEAR__ && /^kamar/i.test(String(k||'')) && /(session|login|auth|role|logged|currentuser|user)/i.test(String(k||''))) return; }catch(e){}
    return oldRemove.apply(this,arguments);
  };
  var oldClear=Storage.prototype.clear;
  Storage.prototype.clear=function(){try{if(!window.__KAMAR_ALLOW_SESSION_CLEAR__) return;}catch(e){} return oldClear.apply(this,arguments);};
  function logout(){
    window.__KAMAR_ALLOW_SESSION_CLEAR__=true;
    ['kamarAdminSession','KAMAR_ADMIN_SESSION','kamarMemberSession','KAMAR_MEMBER_SESSION','kamarAffiliateSession','KAMAR_AFFILIATE_SESSION','kamarSession','kamarAuthSession','kamarUserSession','kamarCurrentUser','kamarAuthRole','kamarUserRole','kamarLoginRole','kamarLoggedIn','kamarAdminLogin','kamarMemberLogin','kamarAffiliateLogin'].forEach(function(k){try{localStorage.removeItem(k);sessionStorage.removeItem(k)}catch(e){}});
    location.href='index.html?logout=1&v='+VERSION;
  }
  document.addEventListener('click',function(e){var t=e.target&&e.target.closest&&e.target.closest('a,button,[data-kamar-logout]'); if(!t) return; var txt=low(t.textContent); var href=low(t.getAttribute('href')||''); if(t.hasAttribute('data-kamar-logout')||txt.indexOf('logout')>=0||href.indexOf('logout')>=0){e.preventDefault();e.stopPropagation();logout();}},true);
  function run(){
    stopLoading();
    var p=page();
    if(p==='admin-login.html'||p==='member.html'||p==='register.html'||p==='affiliate-login.html'||p==='affiliate.html'||p==='index.html') return;
    var next=encodeURIComponent(p+location.search);
    if((p==='admin.html'||p.indexOf('admin-')===0) && !hasAdmin()) return location.replace('admin-login.html?v='+VERSION+'&next='+next);
    if((p==='dashboard.html'||p.indexOf('member-')===0) && !hasMember()) return location.replace('member.html?v='+VERSION+'&next='+next);
    if(p==='affiliate-dashboard.html' && !hasAffiliate()) return location.replace('affiliate-login.html?v='+VERSION+'&next='+next);
    if(p==='admin.html'||p.indexOf('admin-')===0) normalize('admin');
    if(p==='dashboard.html'||p.indexOf('member-')===0) normalize('member');
    if(p==='affiliate-dashboard.html') normalize('affiliate');
  }
  window.KamarGuard25C={hasAdmin:hasAdmin,hasMember:hasMember,hasAffiliate:hasAffiliate,normalize:normalize,logout:logout,stopLoading:stopLoading};
  run();
  window.addEventListener('pageshow',run,true);
})();
