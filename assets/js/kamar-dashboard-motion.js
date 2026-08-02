(function(){
  'use strict';
  if(window.__KAMAR_DASHBOARD_MOTION__) return;
  window.__KAMAR_DASHBOARD_MOTION__ = true;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduced) return;
  var root = document.documentElement;

 var tx=50, ty=30, cx=50, cy=30, ticking=false;
  function render(){
    cx += (tx-cx)*0.08; cy += (ty-cy)*0.08;
    root.style.setProperty('--ambient-x', cx.toFixed(2)+'%');
    root.style.setProperty('--ambient-y', cy.toFixed(2)+'%');
    ticking=false;
  }
  function request(){ if(ticking) return; ticking=true; requestAnimationFrame(render); }
  window.addEventListener('pointermove', function(e){
    tx=(e.clientX/window.innerWidth)*100;
    ty=(e.clientY/window.innerHeight)*100;
    request();
  }, {passive:true});
  request();

 var SEL='.split-card,.member-page-panel,.member-payment-card,.facility-content-card,.setting-card,.stat-card,.action-card,.video-card,.todo-item';
  function bind(card){
    if(card.dataset.kamarMotionBound) return;
    card.dataset.kamarMotionBound='1';
    card.addEventListener('pointermove', function(e){
      var r=card.getBoundingClientRect();
      var x=(e.clientX-r.left)/r.width, y=(e.clientY-r.top)/r.height;
      card.style.setProperty('--mx',(x*100).toFixed(1)+'%');
      card.style.setProperty('--my',(y*100).toFixed(1)+'%');
    });
  }
  function scan(){ document.querySelectorAll(SEL).forEach(bind); }
  scan();
  if('MutationObserver' in window){
    new MutationObserver(scan).observe(document.body,{childList:true,subtree:true});
  }
})();
