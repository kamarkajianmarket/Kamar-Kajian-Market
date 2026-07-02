(function(){
  'use strict';
  if(window.__KAMAR_SESSION_FINAL_26__) return;
  window.__KAMAR_SESSION_FINAL_26__ = true;
  var VERSION='26F';
  function file(){return (location.pathname.split('/').pop()||'index.html').toLowerCase();}
  function get(k){try{return JSON.parse(localStorage.getItem(k)||'null')}catch(e){return null}}
  function set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
  function del(k){try{localStorage.removeItem(k)}catch(e){}}
  function norm(v){return String(v||'').trim().toLowerCase()}
  function emailOf(o){return String((o&&(o.email||o.member_email||o.user_email||o.account_email||o.login_email))||'').trim()}
  function roleOf(o){return norm([o&&o.role,o&&o.account_role,o&&o.user_role,o&&o.type,o&&o.account_type,emailOf(o),o&&o.fullName,o&&o.full_name,o&&o.name].join(' '))}
  function isAdminSession(s){var r=roleOf(s); return !!s && (/admin|internal|owner|superadmin|staff/.test(r)||norm(emailOf(s))==='kamarkajianmarket@gmail.com');}
  function isMemberSession(s){var r=roleOf(s); return !!s && !/admin|internal|owner|superadmin|staff/.test(r);}
  function bridge(){
    var a=get('kamarAdminSession');
    var m=get('kamarMemberSession');
    if(!a){['KAMAR_ADMIN_SESSION','kamarCurrentAdmin','kamarAuthAdmin'].some(function(k){var v=get(k); if(isAdminSession(v)){set('kamarAdminSession',v); return true;} return false;});}
    if(!m){['KAMAR_MEMBER_SESSION','kamarCurrentMember','kamarAuthMember'].some(function(k){var v=get(k); if(isMemberSession(v)){set('kamarMemberSession',v); return true;} return false;});}
    var u=get('kamarCurrentUser')||get('kamarAuthSession')||get('kamarSession');
    if(u){ if(!get('kamarAdminSession')&&isAdminSession(u)) set('kamarAdminSession',u); if(!get('kamarMemberSession')&&isMemberSession(u)) set('kamarMemberSession',u); }
  }
  function logout(){
    ['kamarAdminSession','KAMAR_ADMIN_SESSION','kamarCurrentAdmin','kamarAuthAdmin','kamarMemberSession','KAMAR_MEMBER_SESSION','kamarCurrentMember','kamarAuthMember','kamarAffiliateSession','kamarCurrentAffiliate','kamarSession','kamarAuthSession','kamarCurrentUser'].forEach(del);
    location.href='index.html?v='+VERSION;
  }
  function guard(){
    bridge();
    var f=file();
    var adminPages=['admin.html','admin-members.html','admin-internal.html','admin-activation.html','admin-activation-v2.html','admin-affiliate.html','admin-affiliate-v2.html','admin-connection-check.html','admin-banner.html','admin-video.html','admin-materials.html','admin-payment.html','admin-settings.html','admin-tools.html','admin-maintenance.html','admin-page-control.html','admin-dashboard-control.html','admin-study-control.html','admin-links.html','admin-data-check.html'];
    var memberPages=['dashboard.html','member-profile.html','member-materials.html','member-study.html','member-private.html','member-indicator.html','member-robot.html','member-activate.html','member-activate-edukasi.html','member-activate-study.html','member-renewal.html'];
    var admin=get('kamarAdminSession');
    var member=get('kamarMemberSession');
    if(adminPages.indexOf(f)>=0 && !isAdminSession(admin)) location.replace('admin-login.html?v='+VERSION);
    if(memberPages.indexOf(f)>=0 && !isMemberSession(member)) location.replace('member.html?v='+VERSION);
  }
  document.addEventListener('click',function(e){var t=e.target&&e.target.closest&&e.target.closest('[data-kamar-logout],a[href*="logout=1"]'); if(!t)return; e.preventDefault(); e.stopImmediatePropagation(); logout();},true);
  guard();
  window.KamarSessionFinal26={bridge:bridge,logout:logout,getAdmin:function(){bridge();return get('kamarAdminSession')},getMember:function(){bridge();return get('kamarMemberSession')}};
})();
