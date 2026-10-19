(function(){
  if(window.__ksigFx) return; window.__ksigFx=true;
  var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var b=document.body; if(!reduce){b.classList.add('ksig-fx-intro'); setTimeout(function(){b.classList.remove('ksig-fx-intro');},1800);}
  function fmt(n,o){return o.dot?String(n).replace(/\B(?=(\d{3})+(?!\d))/g,'.'):String(n);}
  function anim(el){
    if(el.__fxAnim) return; var raw=(el.textContent||'').trim(); var m=raw.match(/^(\d{1,3}(?:\.\d{3})*|\d+)(.*)$/); if(!m) return;
    var dot=m[1].indexOf('.')>=0; var to=parseInt(m[1].replace(/\./g,''),10); if(isNaN(to)) return;
    var suffix=m[2]||''; var key=to+'|'+suffix; if(el.__fx===key) return;
    var from=(typeof el.__fxv==='number')?el.__fxv:0; el.__fx=key; el.__fxv=to;
    if(reduce||from===to){return;}
    el.__fxAnim=true; var t0=performance.now(), dur=Math.min(1100,500+Math.abs(to-from)*2);
    (function step(t){ var p=Math.min(1,(t-t0)/dur); var e=1-Math.pow(1-p,3); var v=Math.round(from+(to-from)*e); el.textContent=fmt(v,{dot:dot})+suffix; if(p<1) requestAnimationFrame(step); else { el.textContent=fmt(to,{dot:dot})+suffix; el.__fxAnim=false; } })(t0);
  }
  function scan(){
    document.querySelectorAll('.ksig-cnum').forEach(anim);
    document.querySelectorAll('.ksig-recap-summary-val').forEach(function(e){ if(/^\d+$/.test((e.textContent||'').trim())) anim(e); });
  }
  var pend=false; var mo=new MutationObserver(function(){ if(pend) return; pend=true; requestAnimationFrame(function(){pend=false; scan();}); });
  function start(){ var r=document.getElementById('ksigRoot')||document.body; mo.observe(r,{childList:true,subtree:true,characterData:true}); scan(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start); else start();
})();
