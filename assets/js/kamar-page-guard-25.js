(function(){
  function get(k){try{return JSON.parse(localStorage.getItem(k)||'null')}catch(e){return null}}
  function has(role){
    if(window.KamarSessionCompat25B){try{window.KamarSessionCompat25B.sync()}catch(e){}}
    if(role==='admin') return !!get('kamarAdminSession')||!!get('KAMAR_ADMIN_SESSION')||localStorage.getItem('kamarAuthRole')==='admin';
    if(role==='member') return !!get('kamarMemberSession')||!!get('KAMAR_MEMBER_SESSION')||localStorage.getItem('kamarAuthRole')==='member';
    if(role==='affiliate') return !!get('kamarAffiliateSession')||!!get('KAMAR_AFFILIATE_SESSION')||localStorage.getItem('kamarAuthRole')==='affiliate';
    return false;
  }
  var p=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  if(p==='admin-login.html'||p==='member.html'||p==='register.html'||p==='affiliate-login.html'||p==='affiliate.html'||p==='index.html') return;
  var next=encodeURIComponent(p+location.search);
  if((p==='admin.html'||p.indexOf('admin-')===0) && !has('admin')) location.replace('admin-login.html?v=25b&next='+next);
  if((p==='dashboard.html'||p.indexOf('member-')===0) && !has('member')) location.replace('member.html?v=25b&next='+next);
  if(p==='affiliate-dashboard.html' && !has('affiliate')) location.replace('affiliate-login.html?v=25b&next='+next);
})();