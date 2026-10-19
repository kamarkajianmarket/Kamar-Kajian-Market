(function(){
  if(window.__ksigFx2) return; window.__ksigFx2=true;
  var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var b=document.body; if(!reduce){b.classList.add('ksig-fx-intro'); setTimeout(function(){b.classList.remove('ksig-fx-intro');},1800);}
  var reg={}, raf=0;
  function fmt(n,dot){var s=String(n);return dot?s.replace(/\B(?=(\d{3})+(?!\d))/g,'.'):s;}
  function parse(el){var raw=(el.textContent||'').trim(); var m=raw.match(/^(\d{1,3}(?:\.\d{3})+|\d+)(.*)$/); if(!m) return null; return {v:parseInt(m[1].replace(/\./g,''),10),dot:m[1].indexOf('.')>=0,suf:m[2]||''};}
  function targets(){
    var out=[];
    document.querySelectorAll('.ksig-card').forEach(function(card){
      var el=card.querySelector('.ksig-cnum'); if(!el) return;
      var k=(card.className.match(/\b(fresh|aktif|profit|loss|archive)\b/)||[,'c'+out.length])[1];
      out.push({key:'card:'+k,el:el});
    });
    document.querySelectorAll('.ksig-recap-summary-item').forEach(function(it,i){
      var el=it.querySelector('.ksig-recap-summary-val'); if(!el) return;
      var lb=it.querySelector('.ksig-recap-summary-label'); out.push({key:'sum:'+((lb&&lb.textContent)||i),el:el});
    });
    return out;
  }
  function frame(now){
    raf=0; var live=false;
    var map={}; targets().forEach(function(t){map[t.key]=t.el;});
    Object.keys(reg).forEach(function(k){
      var st=reg[k]; if(!st.run) return;
      var p=Math.min(1,(now-st.t0)/st.dur); var e=1-Math.pow(1-p,3);
      st.cur=Math.round(st.from+(st.to-st.from)*e);
      var el=map[k]; if(el) el.textContent=fmt(st.cur,st.dot)+st.suf;
      if(p>=1){st.run=false;st.cur=st.to;if(el) el.textContent=fmt(st.to,st.dot)+st.suf;} else live=true;
    });
    if(live) raf=requestAnimationFrame(frame);
  }
  function scan(){
    var started=false;
    targets().forEach(function(t){
      var p=parse(t.el); if(!p) return;
      var st=reg[t.key];
      if(!st){ st=reg[t.key]={cur:0,from:0,to:p.v,dot:p.dot,suf:p.suf,run:false,t0:0,dur:1300}; if(!reduce&&p.v>0){st.run=true;st.t0=performance.now();started=true;} else st.cur=p.v; return; }
      if(st.run){ if(p.v!==st.to&&!(st.cur===p.v)){ /* nilai baru dari server saat animasi: lanjut ke target baru */ if(p.v!==st.cur){st.from=st.cur;st.to=p.v;st.t0=performance.now();} } return; }
      if(p.v!==st.to){ st.from=st.cur; st.to=p.v; st.dot=p.dot; st.suf=p.suf; st.dur=Math.min(1100,400+Math.abs(p.v-st.from)*20); st.run=!reduce; st.t0=performance.now(); started=true; }
    });
    if(started&&!raf) raf=requestAnimationFrame(frame);
  }
  var pend=false; var mo=new MutationObserver(function(){ if(pend) return; pend=true; requestAnimationFrame(function(){pend=false; scan();}); });
  function start(){ var r=document.getElementById('ksigRoot')||document.body; mo.observe(r,{childList:true,subtree:true}); scan(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start); else start();
})();
