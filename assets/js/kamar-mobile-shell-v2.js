/* KAMAR MOBILE SHELL v2 - CSS loader, label peran drawer, swipe-to-close */
(function(){
  if(window.__KAMAR_SHELL_V2__) return; window.__KAMAR_SHELL_V2__=true;
  if(!document.querySelector('link[data-kamar-shell-v2]')){
    var l=document.createElement('link'); l.rel='stylesheet'; l.href='/assets/css/kamar-mobile-shell-v2.css?v=2'; l.setAttribute('data-kamar-shell-v2','1');
    document.head.appendChild(l);
  }
  function role(){
    var p=(location.pathname.split('/').pop()||'').toLowerCase();
    if(p.indexOf('affiliate-dashboard')===0||p.indexOf('member-affiliate')===0) return 'Area Affiliate';
    if(p.indexOf('admin')===0) return 'Panel Admin';
    return 'Area Member';
  }
  function addRole(n){
    var b=document.querySelector('.kamar-drawer-head .brand-small');
    if(b){ if(!b.querySelector('.kamar-drawer-role')){ var s=document.createElement('small'); s.className='kamar-drawer-role'; s.textContent=role(); b.appendChild(s);} return; }
    if(n<15) setTimeout(function(){addRole(n+1)},300);
  }
  addRole(0);
  function markLogout(n){
    var as=document.querySelectorAll('.split-sidebar a');
    as.forEach(function(a){ if(/^\s*logout\s*$/i.test(a.textContent)) a.classList.add('kamar-logout'); });
    if(n<12) setTimeout(function(){markLogout(n+1)},500);
  }
  markLogout(0);
  var sx=0,sy=0,tr=false;
  document.addEventListener('touchstart',function(e){
    if(!document.documentElement.classList.contains('kamar-drawer-open')) return;
    var t=e.touches[0]; sx=t.clientX; sy=t.clientY; tr=true;
  },{passive:true});
  document.addEventListener('touchmove',function(e){
    if(!tr) return; var t=e.touches[0];
    if(sx-t.clientX>70 && Math.abs(t.clientY-sy)<45){ tr=false; document.documentElement.classList.remove('kamar-drawer-open'); }
  },{passive:true});
  document.addEventListener('touchend',function(){tr=false},{passive:true});
})();
