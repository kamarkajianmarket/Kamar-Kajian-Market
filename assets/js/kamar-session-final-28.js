(function(){
  'use strict';
  if(window.__KAMAR_SESSION_FINAL_28__) return;
  window.__KAMAR_SESSION_FINAL_28__ = true;
  var VERSION='28_24DZ_LOCKED';
  function file(){return (location.pathname.split('/').pop()||'index.html').toLowerCase().split('?')[0];}
  function get(k){try{return JSON.parse(localStorage.getItem(k)||'null')}catch(e){return null}}
  function set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
  function del(k){try{localStorage.removeItem(k)}catch(e){}}
  function norm(v){return String(v||'').trim().toLowerCase()}
  function emailOf(o){return String((o&&(o.email||o.member_email||o.user_email||o.account_email||o.login_email||o.affiliate_email))||'').trim()}
  function roleText(o){return norm([o&&o.role,o&&o.account_role,o&&o.user_role,o&&o.type,o&&o.account_type,o&&o.member_type,o&&o.category,o&&o.level,o&&o.fullName,o&&o.full_name,o&&o.name,emailOf(o)].join(' '))}
  function isAdmin(s){var r=roleText(s);return !!s&&(/admin|internal|owner|superadmin|staff|team/.test(r)||norm(emailOf(s))==='kamarkajianmarket@gmail.com'||norm(s&&s.name)==='kamarkajianmarket'||norm(s&&s.fullName)==='kamarkajianmarket');}
  function isAffiliate(s){var r=roleText(s);return !!s&&/affiliate|affiliator|referral/.test(r);}
  function isMember(s){return !!s&&!isAdmin(s)&&!isAffiliate(s);}
  function bridge(){
    var a=get('kamarAdminSession');
    var m=get('kamarMemberSession');
    var af=get('kamarAffiliateSession');
    if(!a){['KAMAR_ADMIN_SESSION','kamarCurrentAdmin','kamarAuthAdmin'].some(function(k){var v=get(k); if(isAdmin(v)){set('kamarAdminSession',v); return true;} return false;});}
    if(!m){['KAMAR_MEMBER_SESSION','kamarCurrentMember','kamarAuthMember'].some(function(k){var v=get(k); if(isMember(v)){set('kamarMemberSession',v); return true;} return false;});}
    if(!af){['KAMAR_AFFILIATE_SESSION','kamarCurrentAffiliate','kamarAuthAffiliate'].some(function(k){var v=get(k); if(isAffiliate(v)){set('kamarAffiliateSession',v); return true;} return false;});}
    var u=get('kamarCurrentUser')||get('kamarAuthSession')||get('kamarSession');
    if(u){
      if(!get('kamarAdminSession')&&isAdmin(u)) set('kamarAdminSession',u);
      if(!get('kamarMemberSession')&&isMember(u)) set('kamarMemberSession',u);
      if(!get('kamarAffiliateSession')&&isAffiliate(u)) set('kamarAffiliateSession',u);
    }
  }
  function logout(){
    ['kamarAdminSession','KAMAR_ADMIN_SESSION','kamarCurrentAdmin','kamarAuthAdmin','kamarMemberSession','KAMAR_MEMBER_SESSION','kamarCurrentMember','kamarAuthMember','kamarAffiliateSession','KAMAR_AFFILIATE_SESSION','kamarCurrentAffiliate','kamarAuthAffiliate','kamarSession','kamarAuthSession','kamarCurrentUser'].forEach(del);
    var done=false;
    function go(){if(done)return;done=true;location.href='index.html?v='+VERSION;}
    try{
      if(window.KamarSupabase && window.KamarSupabase.ready){
        window.KamarSupabase.ready().then(function(client){
          client=client||(window.KamarSupabase.getClient&&window.KamarSupabase.getClient());
          if(client&&client.auth&&client.auth.signOut) return client.auth.signOut();
        }).catch(function(){}).then(go,go);
        setTimeout(go,2500);
      } else { go(); }
    }catch(e){ go(); }
  }
  function guard(){
    bridge();
    var f=file();
    var adminPages=['admin.html','admin-members.html','admin-internal.html','admin-activation.html','admin-activation-v2.html','admin-affiliate.html','admin-affiliate-v2.html','admin-affiliate-list.html','admin-affiliate-overview.html','admin-affiliate-reward.html','admin-affiliate-payment.html','admin-affiliate-commission-rate.html','admin-connection-check.html','admin-banner.html','admin-video.html','admin-materials.html','admin-payment.html','admin-settings.html','admin-tools.html','admin-internal-license.html','admin-maintenance.html','admin-page-control.html','admin-dashboard-control.html','admin-study-control.html','admin-links.html','admin-data-check.html','admin-license-requests.html','admin-license-self-request.html'];
    var memberPages=['dashboard.html','member-profile.html','member-materials.html','member-study.html','member-private.html','member-indicator.html','member-robot.html','member-activate.html','member-activate-edukasi.html','member-activate-study.html','member-renewal.html','member-affiliate-activate.html','affiliate-dashboard.html'];
    var affiliatePages=[];
    if(adminPages.indexOf(f)>=0 && !isAdmin(get('kamarAdminSession'))) location.replace('admin-login.html?v='+VERSION);
    if(memberPages.indexOf(f)>=0 && !get('kamarMemberSession')) location.replace('member.html?v='+VERSION);
    if(affiliatePages.indexOf(f)>=0 && !get('kamarAffiliateSession')) location.replace('affiliate.html?v='+VERSION);
  }
  document.addEventListener('click',function(e){var t=e.target&&e.target.closest&&e.target.closest('[data-kamar-logout],a[href*="logout=1"]'); if(!t)return; e.preventDefault(); e.stopImmediatePropagation(); logout();},true);
  guard();
  window.KamarSessionFinal28={bridge:bridge,logout:logout,getAdmin:function(){bridge();return get('kamarAdminSession')},getMember:function(){bridge();return get('kamarMemberSession')},getAffiliate:function(){bridge();return get('kamarAffiliateSession')}};
})();
