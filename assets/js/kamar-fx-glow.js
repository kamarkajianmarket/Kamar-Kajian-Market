/* FX glow v1 - memasang sorot emas pada kartu. Aman dipasang berulang; kartu baru (render dinamis) ikut terpasang. */
(function(){
  'use strict';
  if(window.__KAMAR_FX_GLOW__) return;
  window.__KAMAR_FX_GLOW__=true;
  if(!window.matchMedia||!matchMedia('(hover:hover)').matches||matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  var SEL='.split-card:not(.kd-pagehero):not(.kamar-title-card),.method-card,.kc-card,.dashboard-card,.facility-detail-card';
  function attach(el){
    if(el.__fxGlow) return;
    el.__fxGlow=true;
    el.classList.add('fx-glow-host');
    var g=document.createElement('span');g.className='fx-glow';g.setAttribute('aria-hidden','true');
    el.insertBefore(g,el.firstChild);
    el.addEventListener('pointermove',function(e){
      var r=el.getBoundingClientRect();
      el.style.setProperty('--mx',(e.clientX-r.left)+'px');
      el.style.setProperty('--my',(e.clientY-r.top)+'px');
      el.classList.add('fx-glow-on');
    },{passive:true});
    el.addEventListener('pointerleave',function(){el.classList.remove('fx-glow-on');});
  }
  function scan(root){(root||document).querySelectorAll(SEL).forEach(attach);}
  function init(){
    scan();
    var t;
    new MutationObserver(function(){clearTimeout(t);t=setTimeout(scan,120);}).observe(document.body,{childList:true,subtree:true});
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
