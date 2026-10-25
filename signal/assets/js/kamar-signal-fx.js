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

/* ===== viz: grafik batang rekap + bar menang/kalah ===== */
(function(){
  if(window.__ksigViz) return; window.__ksigViz=true;
  var animated=false, pend=0;
  function num(s){var m=String(s||'').replace(/\./g,'').match(/-?\d+(,\d+)?/);return m?parseFloat(m[0].replace(',','.')):0;}
  function deco(){
    pend=0;
    var body=document.getElementById('ksigRecapBody'); if(!body) return;
    var list=body.querySelector('.ksig-recap-list'); if(!list||list.getAttribute('data-viz')==='1') return;
    var rows=[].slice.call(list.querySelectorAll('.ksig-recap-row')); if(!rows.length) return;
    var data=rows.map(function(r){
      var pe=r.querySelector('.ksig-recap-row-pips'), lb=r.querySelector('.ksig-recap-row-label'), st=(r.querySelector('.ksig-recap-row-stats')||{}).textContent||'';
      var m=st.match(/(\d+)\s*Signal[\s\S]*?(\d+)\s*Profit[\s\S]*?(\d+)\s*Loss/i)||[];
      return {r:r,lab:((lb&&lb.textContent)||'').trim(),pips:num(pe&&pe.textContent),sig:+m[1]||0,pr:+m[2]||0,ls:+m[3]||0};
    });
    var maxAbs=Math.max.apply(null,data.map(function(d){return Math.abs(d.pips);}).concat([1]));
    var cls=animated?'':' anim'; animated=true;
    data.forEach(function(d){
      if(d.r.querySelector('.ksig-rbar')) return;
      var tot=Math.max(d.sig,d.pr+d.ls,1);
      var b=document.createElement('div'); b.className='ksig-rbar'+cls;
      b.innerHTML='<i class="p" style="--w:'+(d.pr/tot*100)+'%"></i><i class="l" style="--w:'+(d.ls/tot*100)+'%"></i>';
      d.r.appendChild(b);
    });
    var old=body.querySelector('.ksig-vchart'); if(old) old.parentNode.removeChild(old);
    var tabEl=document.querySelector('.ksig-tab.active'),perEl=document.querySelector('.ksig-recap-period');var per=((tabEl?tabEl.textContent.trim():'')+(perEl?' \u00b7 '+perEl.textContent.trim():'')).replace(/</g,'');var ch=document.createElement('div'); ch.className='ksig-vchart'+cls;
    ch.innerHTML='<div class="ksig-vchart-title"><b>PIPS PER TIMEFRAME</b><em>'+per+'</em></div><div class="ksig-vchart-bars">'+data.map(function(d,i){
      var h=Math.max(6,Math.abs(d.pips)/maxAbs*120);
      return '<div class="ksig-vbar '+(d.pips>=0?'pos':'neg')+'" style="--h:'+h+'px;--i:'+i+'"><div class="ksig-vbar-track"><span class="ksig-vbar-val">'+(d.pips>=0?'+':'')+Math.round(d.pips)+'</span><div class="ksig-vbar-col"></div></div><span class="ksig-vbar-lab">'+d.lab+'</span></div>';
    }).join('')+'</div>';
    list.parentNode.insertBefore(ch,list);
    list.setAttribute('data-viz','1');
  }
  function sched(){ if(pend) return; pend=requestAnimationFrame(deco); }
  function start(){ var root=document.getElementById('ksigRoot')||document.body; new MutationObserver(sched).observe(root,{childList:true,subtree:true}); sched(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start); else start();
})();

/* fold: kartu akses + app ringkas di HP */
(function(){
  var open={};
  function fold(cls,title,sumFn){
    var c=document.querySelector('.'+cls); if(!c||c.getAttribute('data-fold')) return;
    c.setAttribute('data-fold','1'); c.classList.add('ksig-fold'); if(open[cls]) c.classList.add('open');
    var bar=document.createElement('div'); bar.className='ksig-fold-bar'; bar.setAttribute('role','button'); bar.tabIndex=0;
    bar.innerHTML='<span class="ksig-fold-t">'+title+'</span><b class="ksig-fold-s">'+sumFn(c.textContent||'')+'</b><i class="ksig-fold-i"></i>';
    function tg(){ var o=c.classList.toggle('open'); open[cls]=o; }
    bar.addEventListener('click',tg); bar.addEventListener('keydown',function(e){ if(e.key==='Enter'||e.key===' '){e.preventDefault();tg();} });
    c.insertBefore(bar,c.firstChild);
  }
  function run(){
    fold('ksig-access-card','Akses',function(t){var m=t.match(/(\d+)\s*HARI\s*TERSISA/i);return m?m[1]+' hari tersisa':'Aktif';});
    fold('ksig-install-card','Kamar Signal App',function(){return 'Install';});
  }
  function place(){
    var meta=document.querySelector('.ksig-header-meta'),perf=document.querySelector('.ksig-perf'),row=document.querySelector('.ksig-header-row');
    if(!meta||!perf||!row) return;
    if(meta.parentNode!==perf) perf.insertBefore(meta,perf.firstChild);
  }
  var q=0; function sched(){ if(q) return; q=requestAnimationFrame(function(){q=0;run();place();}); }
  window.addEventListener('resize',sched);
  function start(){ var root=document.getElementById('ksigRoot')||document.body; new MutationObserver(sched).observe(root,{childList:true,subtree:true}); sched(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start); else start();
})();

/* equity curve + heatmap winrate */
(function(){
  var css='.ksig-eq{margin:14px 0;padding:18px;border-radius:22px;background:linear-gradient(165deg,rgba(20,26,38,.95),rgba(8,11,17,.98));border:1px solid rgba(232,199,119,.22);box-shadow:0 18px 50px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.08)}'+
  '.ksig-eq-h{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;margin-bottom:12px}'+
  '.ksig-eq-t{font-size:10.5px;font-weight:800;letter-spacing:.2em;color:#e8c777}'+
  '.ksig-eq-s{font-size:11px;color:#a9b3c4;margin-top:4px}'+
  '.ksig-eq-v{font-size:clamp(26px,6vw,34px);font-weight:900;color:#5df0bb;text-shadow:0 0 22px rgba(47,230,164,.6);font-variant-numeric:tabular-nums;line-height:1}'+
  '.ksig-eq-v.neg{color:#ff6b7a;text-shadow:0 0 22px rgba(255,92,110,.6)}'+
  '.ksig-eq svg{width:100%;height:auto;display:block;overflow:visible}'+
  '.ksig-eq .ln{fill:none;stroke:#5df0bb;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round;filter:drop-shadow(0 0 6px rgba(47,230,164,.7))}'+
  '.ksig-eq.anim .ln{stroke-dasharray:var(--len);stroke-dashoffset:var(--len);animation:ksEqDraw 1.6s cubic-bezier(.2,.8,.2,1) forwards}'+
  '.ksig-eq.anim .ar{opacity:0;animation:ksEqFade 1s .9s forwards}'+
  '@keyframes ksEqDraw{to{stroke-dashoffset:0}}@keyframes ksEqFade{to{opacity:1}}'+
  '.ksig-eq-st{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}'+
  '.ksig-eq-st span{flex:1 1 90px;padding:8px 10px;border-radius:12px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.08);font-size:10px;letter-spacing:.12em;color:#a9b3c4;text-transform:uppercase}'+
  '.ksig-eq-st b{display:block;margin-top:3px;font-size:15px;letter-spacing:0;color:#fff6df}'+
  '.ksig-hm{margin-top:18px;padding-top:14px;border-top:1px solid rgba(255,255,255,.08)}'+
  '.ksig-hm-g{display:grid;grid-template-columns:44px repeat(7,1fr);gap:5px;margin-top:10px;font-size:10px;color:#a9b3c4}'+
  '.ksig-hm-c{height:34px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:800;color:#fff;font-size:10.5px}'+
  '.ksig-hm-l{display:flex;align-items:center;font-weight:700;letter-spacing:.04em}'+
  '.ksig-hm-d{text-align:center;font-weight:800;letter-spacing:.06em}';
  var extra='.ksig-eqf{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:16px}.ksig-eqf button{cursor:pointer;padding:8px 14px;border-radius:999px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);color:#c4cddb;font:800 11px inherit;letter-spacing:.08em;text-transform:uppercase;transition:all .25s}.ksig-eqf button.on{background:linear-gradient(180deg,#f3d98d,#c9a24a);color:#1a1305;border-color:transparent;box-shadow:0 6px 18px rgba(201,162,74,.35)}.ksig-eqf-d{display:flex;gap:8px;align-items:center;flex-wrap:wrap;width:100%}.ksig-eqf-d input{padding:8px 10px;border-radius:12px;border:1px solid rgba(232,199,119,.3);background:rgba(255,255,255,.06);color:#fff6df;color-scheme:dark;font-size:12px}.ksig-eqf-d span{font-size:11px;color:#a9b3c4}.ksig-eq-empty{padding:30px 10px;text-align:center;color:#a9b3c4;font-size:13px}';var st=document.createElement('style');st.textContent=css+extra;document.head.appendChild(st);
  var data=null,loading=false,animated=false,lastLoad=0;
  function pips(s){
    var rp=s.running_point!=null?Number(s.running_point):null, mx=s.max_running_point!=null?Number(s.max_running_point):null;
    if(s.status==='INVALID'&&(s.farthest_tp_level||0)===0){var m=rp!=null?rp:mx;return m!=null?-Math.abs(m)*10:null;}
    if(mx!=null)return mx*10;
    return rp!=null?rp*10:null;
  }
  function wib(iso){var d=new Date(iso);var p=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Jakarta',hour:'numeric',hour12:false,weekday:'short'}).formatToParts(d);var o={};p.forEach(function(x){o[x.type]=x.value});var days={Mon:0,Tue:1,Wed:2,Thu:3,Fri:4,Sat:5,Sun:6};return {d:days[o.weekday],h:parseInt(o.hour,10)%24};}
  function fmt(n){return (n>=0?'+':'')+Math.round(n).toLocaleString('id-ID');}
  var F={mode:'all',from:'',to:''};
  function dstr(iso){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta'}).format(new Date(iso));}
  function todayS(){return dstr(new Date().toISOString());}
  function shift(ds,n){var d=new Date(ds+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
  function range(){var t=todayS();if(F.mode==='day')return [t,t];if(F.mode==='week'){var dow=(new Date(t+'T00:00:00Z').getUTCDay()+6)%7;return [shift(t,-dow),t];}if(F.mode==='month')return [t.slice(0,8)+'01',t];if(F.mode==='custom')return [F.from||'0000-01-01',F.to||'9999-12-31'];return ['0000-01-01','9999-12-31'];}
  function flabel(){return {all:'Seluruh masa',day:'Hari ini',week:'Minggu ini',month:'Bulan ini',custom:(F.from||'...')+' s/d '+(F.to||'...')}[F.mode];}
  function filtered(){var r=range();return data.filter(function(s){var d=dstr(s.created_at);return d>=r[0]&&d<=r[1];});}
  function filterHtml(){var m=[['all','Keseluruhan'],['month','Bulanan'],['week','Mingguan'],['day','Harian'],['custom','Custom']];return '<div class="ksig-eqf">'+m.map(function(x){return '<button type="button" data-eqf="'+x[0]+'" class="'+(F.mode===x[0]?'on':'')+'">'+x[1]+'</button>';}).join('')+(F.mode==='custom'?calBtnHtml():'')+'</div>';}
  function build(){
    var rows=filtered().map(function(s){return {p:pips(s),w:wib(s.created_at),win:s.display_status==='profit'};}).filter(function(r){return r.p!=null;});
    if(rows.length<1)return filterHtml()+'<div class="ksig-eq-empty">Belum ada signal tertutup pada periode ini.</div>';
    var cum=0,pts=[0],peak=0,dd=0,ddSum=0,ddN=0;
    rows.forEach(function(r){cum+=r.p;pts.push(cum);if(cum>peak){if(dd>0){ddSum+=dd;ddN++;dd=0;}peak=cum;}else if(peak-cum>dd)dd=peak-cum;});
    if(dd>0){ddSum+=dd;ddN++;}
    var avgDd=ddN?ddSum/ddN:0;
    var W=600,H=190,pad=8,mn=Math.min.apply(null,pts),mx=Math.max.apply(null,pts);if(mx===mn)mx=mn+1;
    var xs=function(i){return pad+i*(W-2*pad)/(pts.length-1);},ys=function(v){return H-pad-(v-mn)/(mx-mn)*(H-2*pad);};
    var d='';pts.forEach(function(v,i){d+=(i?'L':'M')+xs(i).toFixed(1)+' '+ys(v).toFixed(1)+' ';});
    var area=d+'L'+xs(pts.length-1).toFixed(1)+' '+(H-pad)+' L'+xs(0).toFixed(1)+' '+(H-pad)+' Z';
    var y0=ys(0).toFixed(1);
    var wins=rows.filter(function(r){return r.win;}).length;
    var grid={};rows.forEach(function(r){var b=Math.floor(r.w.h/6),k=b+'-'+r.w.d;var g=grid[k]||(grid[k]={n:0,w:0});g.n++;if(r.win)g.w++;});
    var dn=['Sen','Sel','Rab','Kam','Jum','Sab','Min'],bl=['00-06','06-12','12-18','18-24'];
    var hm='<div class="ksig-hm-g"><div></div>'+dn.map(function(x){return '<div class="ksig-hm-d">'+x+'</div>';}).join('');
    for(var b=0;b<4;b++){hm+='<div class="ksig-hm-l">'+bl[b]+'</div>';for(var k=0;k<7;k++){var g=grid[b+'-'+k];if(!g||g.n<2){hm+='<div class="ksig-hm-c" style="background:rgba(255,255,255,.05);color:#667">–</div>';}else{var wr=g.w/g.n;var hue=Math.round(wr*130);hm+='<div class="ksig-hm-c" title="'+g.n+' signal" style="background:hsla('+hue+',70%,'+(28+wr*8)+'%,'+(.55+wr*.4)+')">'+Math.round(wr*100)+'%</div>';}}}
    hm+='</div>';
    var neg=cum<0;
    return filterHtml()+'<div class="ksig-eq-h"><div><div class="ksig-eq-t">EQUITY CURVE</div><div class="ksig-eq-s">Akumulasi pips · '+flabel()+' · '+rows.length+' signal</div></div><div class="ksig-eq-v'+(neg?' neg':'')+'">'+fmt(cum)+' <small style="font-size:.4em;letter-spacing:.1em">PIPS</small></div></div>'+
    '<svg data-pts="'+pts.map(Math.round).join(',')+'" viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none"><defs><linearGradient id="ksEqG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2fe6a4" stop-opacity=".38"/><stop offset="1" stop-color="#2fe6a4" stop-opacity="0"/></linearGradient></defs><line x1="0" x2="'+W+'" y1="'+y0+'" y2="'+y0+'" stroke="rgba(255,255,255,.18)" stroke-dasharray="4 5"/><path class="ar" d="'+area+'" fill="url(#ksEqG)"/><path class="ln" style="--len:'+Math.round(W*4)+'" pathLength="'+Math.round(W*4)+'" d="'+d+'"/><circle cx="'+xs(pts.length-1).toFixed(1)+'" cy="'+ys(cum).toFixed(1)+'" r="4.5" fill="#fff" stroke="#2fe6a4" stroke-width="2"/></svg>'+
    '<div class="ksig-eq-st"><span>Winrate periode ini<b>'+(wins/rows.length*100).toFixed(1).replace('.',',')+'%</b></span><span class="dn">Rata-rata Drawdown<b>'+(avgDd>0?'-':'')+Math.round(avgDd).toLocaleString('id-ID')+' Pips</b></span><span class="up">Rata-rata Profit<b>'+fmt(cum/rows.length)+' Pips</b></span></div>'+
    '<div class="ksig-hm"><div class="ksig-eq-t">HEATMAP WINRATE</div><div class="ksig-eq-s">Hari × jam masuk (WIB) · hijau = winrate tinggi</div>'+hm+'</div>';
  }
  function cardAnim(el){if(window.__ksigEqAnimated)return;if(window.__ksigIntroHold&&!window.__ksigIntroFlag)return;el.classList.add('anim');window.__ksigEqAnimated=1;}
  var CM=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'],DW=['Sen','Sel','Rab','Kam','Jum','Sab','Min'];
  var cal={y:0,m:0,s:'',e:''}, curEl=null;
  (function(){if(document.getElementById('ksig-eqcal-css'))return;var st=document.createElement('style');st.id='ksig-eqcal-css';st.textContent='.ksig-eqf-d{display:block!important;width:100%;margin-top:10px}.ksig-eqf-cal{width:100%;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 16px;border-radius:14px;border:1px solid rgba(232,199,119,.45);background:linear-gradient(180deg,rgba(232,199,119,.14),rgba(232,199,119,.05));color:#f3e3b3;font:inherit;font-size:13px;font-weight:700;letter-spacing:.02em;cursor:pointer}.ksig-eqf-cal:hover{border-color:#e8c777}.ksig-eqf-cal span{opacity:.75;font-size:11px;font-weight:600}';document.head.appendChild(st);})();
  function ymd(y,m,d){return y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');}
  function dlab(s){var p=s.split('-').map(Number);return p[2]+' '+CM[p[1]-1]+' '+p[0];}
  function calBtnHtml(){var l=(F.from&&F.to)?(F.from===F.to?dlab(F.from):dlab(F.from)+' \u2013 '+dlab(F.to)):'Pilih tanggal';return '<div class="ksig-eqf-d"><button type="button" class="ksig-eqf-cal" data-eqcal="1"><b>\uD83D\uDCC5 '+l+'</b><span>Ubah</span></button></div>';}
  function calHtml(){
    var t=todayS(),first=(new Date(Date.UTC(cal.y,cal.m,1)).getUTCDay()+6)%7,dim=new Date(Date.UTC(cal.y,cal.m+1,0)).getUTCDate(),cells='',i,d;
    for(i=0;i<first;i++)cells+='<div class="ksig-cal-cell empty"></div>';
    for(d=1;d<=dim;d++){var ds=ymd(cal.y,cal.m,d),sel=(cal.s===ds||cal.e===ds),inr=!!(cal.s&&cal.e&&ds>cal.s&&ds<cal.e),fut=ds>t;
      cells+='<div class="ksig-cal-cell'+(sel?' selected':'')+(inr?' in-range':'')+(ds===t?' today':'')+(fut?' disabled':'')+'" data-date="'+(fut?'':ds)+'">'+d+'</div>';}
    var rt=cal.s?(dlab(cal.s)+(cal.e&&cal.e!==cal.s?' \u2013 '+dlab(cal.e):'')):'Pilih tanggal mulai';
    return '<div class="ksig-cal-popup-backdrop" id="ksigEqBackdrop"><div class="ksig-cal-popup" id="ksigEqPopup"><div class="ksig-cal-head"><button type="button" class="ksig-cal-nav" id="ksigEqPrev" aria-label="Bulan sebelumnya">\u2039</button><div class="ksig-cal-title"><span class="ksig-cal-month-part">'+CM[cal.m]+'</span> <span class="ksig-cal-year-part">'+cal.y+'</span></div><button type="button" class="ksig-cal-nav" id="ksigEqNext" aria-label="Bulan berikutnya">\u203a</button></div><div class="ksig-cal-dow">'+DW.map(function(x){return '<div>'+x+'</div>';}).join('')+'</div><div class="ksig-cal-grid">'+cells+'</div><div class="ksig-cal-range-label">'+rt+'</div><div class="ksig-cal-actions"><button type="button" class="ksig-btn" id="ksigEqCancel">Batal</button><button type="button" class="ksig-btn primary" id="ksigEqApply"'+(cal.s?'':' disabled')+'>Terapkan</button></div></div></div>';
  }
  function closeCal(){var o=document.getElementById('ksigEqBackdrop');if(o)o.remove();}
  function showCal(){
    closeCal();var h=document.createElement('div');h.innerHTML=calHtml();var bd=h.firstChild;document.body.appendChild(bd);
    bd.addEventListener('click',function(e){
      var x=e.target;
      if(x===bd){cancelCal();return;}
      if(x.closest('#ksigEqPrev')){cal.m--;if(cal.m<0){cal.m=11;cal.y--;}showCal();return;}
      if(x.closest('#ksigEqNext')){cal.m++;if(cal.m>11){cal.m=0;cal.y++;}showCal();return;}
      if(x.closest('#ksigEqCancel')){cancelCal();return;}
      if(x.closest('#ksigEqApply')){if(!cal.s)return;F.from=cal.s;F.to=cal.e||cal.s;closeCal();if(curEl)curEl.innerHTML=build();return;}
      var c=x.closest('.ksig-cal-cell[data-date]');if(!c)return;var ds=c.getAttribute('data-date');if(!ds)return;
      if(!cal.s||(cal.s&&cal.e)){cal.s=ds;cal.e='';}else if(ds<cal.s){cal.s=ds;}else{cal.e=ds;}
      showCal();
    });
  }
  function cancelCal(){closeCal();if(!F.from&&curEl){F.mode='all';curEl.innerHTML=build();}}
  function openCal(){var b=(F.from||todayS()).split('-').map(Number);cal.y=b[0];cal.m=b[1]-1;cal.s=F.from||'';cal.e=F.to||'';showCal();}
  function bind(el){curEl=el;el.addEventListener('click',function(e){
    var cb=e.target.closest('[data-eqcal]');if(cb){openCal();return;}
    var b=e.target.closest('[data-eqf]');if(!b)return;F.mode=b.getAttribute('data-eqf');
    if(F.mode!=='custom'){F.from='';F.to='';}
    curEl=el;el.innerHTML=build();
    if(F.mode==='custom'&&!F.from)openCal();
  });}
  function patchPerf(){
    if(!data)return;var p=0,l=0;data.forEach(function(s){if(s.display_status==='profit')p++;else if(s.display_status==='loss')l++;});
    var t=p+l;if(!t)return;var wr=Math.round(p/t*1000)/10;
    var closed=data.filter(function(s){return s.display_status==='profit'||s.display_status==='loss';}).sort(function(a,b){return a.created_at<b.created_at?-1:1;});
    function sparkSvg(lb){
      var key=lb==='total closed'?'all':(lb==='profit'?'profit':(lb==='loss'?'loss':null));if(!key||closed.length<4)return '';
      var N=24,c=0,pts=[0];closed.forEach(function(s,i){if(key==='all'||s.display_status===key)c++;if((i+1)%Math.max(1,Math.floor(closed.length/N))===0)pts.push(c);});pts.push(c);
      var mx=Math.max.apply(null,pts)||1,W=96,H=30,d=pts.map(function(v,i){return (i?'L':'M')+(i*W/(pts.length-1)).toFixed(1)+' '+(H-2-v/mx*(H-4)).toFixed(1);}).join(' ');
      return '<svg class="ksig-spark ksig-spark-'+key+'" data-k="'+key+pts.length+'-'+c+'" viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" aria-hidden="true"><path d="'+d+'"/></svg>';
    }
    var ring=document.querySelector('.ksig-perf-ring');if(!ring)return;
    ring.style.setProperty('--p',wr);var rb=ring.querySelector('b');var wt=String(wr.toFixed(1)).replace('.',',')+'%';if(rb&&rb.textContent!==wt)rb.textContent=wt;
    document.querySelectorAll('.ksig-perf-stat').forEach(function(st){var lb=((st.querySelector('small')||{}).textContent||'').trim().toLowerCase(),v=st.querySelector('b');if(!v)return;var val=null;if(lb==='total closed')val=t;else if(lb==='profit')val=p;else if(lb==='loss')val=l;if(val===null){if(lb==='signal aktif'){var as=st.querySelector('.ksig-perf-sub');if(!as){as=document.createElement('i');as.className='ksig-perf-sub';st.appendChild(as);}as.textContent='sedang berjalan';}return;}var sv=String(val).replace(/\B(?=(\d{3})+(?!\d))/g,'.');if(v.textContent!==sv)v.textContent=sv;var pct=function(n){return (Math.round(n/t*1000)/10).toFixed(1).replace('.',',')+'%';};var sub=st.querySelector('.ksig-perf-sub');if(!sub){sub=document.createElement('i');sub.className='ksig-perf-sub';st.appendChild(sub);}var tx=lb==='total closed'?'signal tertutup':(pct(val)+' dari closed');if(sub.textContent!==tx)sub.textContent=tx;if(lb!=='total closed')st.style.setProperty('--sh',(val/t*100).toFixed(1)+'%');var sp=st.querySelector('svg.ksig-spark');var sv2=sparkSvg(lb);if(sv2){if(!sp){st.insertAdjacentHTML('beforeend',sv2);}else if(sp.getAttribute('data-k')!==sv2.split('data-k="')[1].split('"')[0]){sp.outerHTML=sv2;}}});
  }
  function skel(){var top=document.querySelector('#ksigRoot .ksig-top-row');if(!top)return;var n=top.nextElementSibling;if(n&&n.classList.contains('ksig-eq'))return;var el=document.createElement('div');el.className='ksig-eq skel';top.insertAdjacentElement('afterend',el);}
  function place(){
    if(!data)return;var top=document.querySelector('#ksigRoot .ksig-top-row');if(!top)return;
    var ex=top.nextElementSibling;
    if(ex&&ex.classList.contains('ksig-eq')){if(!ex.classList.contains('skel'))return;var h0=build();if(!h0)return;ex.classList.remove('skel');ex.innerHTML=h0;bind(ex);cardAnim(ex);return;}
    var html=build();if(!html)return;
    var el=document.createElement('div');el.className='ksig-eq';el.innerHTML=html;top.insertAdjacentElement('afterend',el);bind(el);cardAnim(el);
  }
  function load(){
    if(loading||(data&&Date.now()-lastLoad<120000))return;
    var c=window.kamarSupabaseClient;if(!c)return;loading=true;
    Promise.all([0,1000,2000,3000,4000,5000,6000,7000].map(function(f){return c.from('signals').select('created_at,status,display_status,farthest_tp_level,running_point,max_running_point').in('display_status',['profit','loss']).order('created_at',{ascending:true}).range(f,f+999).then(function(r){if(r.error)throw r.error;return r.data||[];});})).then(function(parts){return [].concat.apply([],parts);})
    .then(function(rows){loading=false;if(!rows||!rows.length)return;data=rows;lastLoad=Date.now();place();})
    .catch(function(){loading=false;});
  }
  var q=0;function sched(){if(q)return;q=requestAnimationFrame(function(){q=0;if(document.querySelector('#ksigRoot .ksig-top-row')){if(data){place();patchPerf();}else skel();load();}});}
  function start(){var root=document.getElementById('ksigRoot')||document.body;new MutationObserver(sched).observe(root,{childList:true,subtree:true});sched();(function early(n){if(window.kamarSupabaseClient){load();return;}if(n<60)setTimeout(function(){early(n+1);},100);})(0);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();


/* intro dashboard: overlay statis di index.html, dibuka SEKALI saat semua bagian siap (tanpa animasi per-elemen => tidak berkedip) */
(function(){
  if(!window.__ksigIntroHold)return;
  var done=false;
  function release(){
    if(done)return;done=true;
    window.__ksigIntroFlag=1;
    if(window.__ksigIntroDone)window.__ksigIntroDone();
    setTimeout(function(){var e=document.querySelector('#ksigRoot .ksig-eq');if(e&&!window.__ksigEqAnimated){e.classList.add('anim');window.__ksigEqAnimated=1;}},650);
  }
  function check(){
    if(done)return;
    if(document.querySelector('#ksigRoot .ksig-top-row')&&document.querySelector('#ksigRoot .ksig-vchart')&&document.querySelector('#ksigRoot .ksig-eq:not(.skel)'))setTimeout(release,250);
  }
  new MutationObserver(check).observe(document.body,{childList:true,subtree:true});
  setTimeout(release,5500);
})();

/* tooltip grafik equity: hover / sentuh menampilkan akumulasi pips per signal */
(function(){
  var css='.ksig-eq{position:relative}.ksig-eq-tip{position:absolute;pointer-events:none;z-index:3;padding:7px 11px;border-radius:12px;background:rgba(8,11,17,.96);border:1px solid rgba(232,199,119,.35);box-shadow:0 8px 24px rgba(0,0,0,.55);font-size:12px;font-weight:800;color:#fff6df;white-space:nowrap;transform:translate(-50%,-100%);font-variant-numeric:tabular-nums}.ksig-eq-tip small{display:block;font-size:10px;font-weight:700;letter-spacing:.08em;color:#a9b3c4}.ksig-eq-tip.up b{color:#5df0bb}.ksig-eq-tip.dn b{color:#ff6b7a}.ksig-eq-vl{position:absolute;pointer-events:none;width:1px;background:rgba(232,199,119,.45);z-index:2}.ksig-eq-dot{position:absolute;pointer-events:none;width:10px;height:10px;margin:-5px 0 0 -5px;border-radius:50%;background:#e8c777;box-shadow:0 0 12px rgba(232,199,119,.9);z-index:3}.ksig-eq svg{touch-action:pan-y;cursor:crosshair}';
  var st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
  var tip,vl,dot;
  function hide(){[tip,vl,dot].forEach(function(e){if(e&&e.parentNode)e.parentNode.removeChild(e);});}
  function move(e){
    var svg=e.target&&e.target.closest?e.target.closest('.ksig-eq svg[data-pts]'):null;
    if(!svg){hide();return;}
    var pts=svg.getAttribute('data-pts').split(',').map(Number),n=pts.length;if(n<2)return;
    var r=svg.getBoundingClientRect(),card=svg.closest('.ksig-eq'),cr=card.getBoundingClientRect();
    var f=Math.min(1,Math.max(0,(e.clientX-r.left)/r.width)),i=Math.round(f*(n-1)),v=pts[i];
    var mn=Math.min.apply(null,pts),mx=Math.max.apply(null,pts);if(mx===mn)mx=mn+1;
    var pad=8/190,yf=1-pad-(v-mn)/(mx-mn)*(1-2*pad);
    var x=r.left-cr.left+(8/600+i*(1-16/600)/(n-1))*r.width,y=r.top-cr.top+yf*r.height;
    if(!tip){tip=document.createElement('div');vl=document.createElement('div');dot=document.createElement('div');vl.className='ksig-eq-vl';dot.className='ksig-eq-dot';}
    [vl,dot,tip].forEach(function(el){if(el.parentNode!==card)card.appendChild(el);});
    vl.style.left=x+'px';vl.style.top=(r.top-cr.top)+'px';vl.style.height=r.height+'px';
    dot.style.left=x+'px';dot.style.top=y+'px';
    tip.className='ksig-eq-tip '+(v>=0?'up':'dn');
    tip.innerHTML='<small>'+(i===0?'Awal':'Signal ke-'+i)+'</small><b>'+(v>=0?'+':'')+v.toLocaleString('id-ID')+' pips</b>';
    var tw=tip.offsetWidth/2+6,tx=Math.min(cr.width-tw,Math.max(tw,x));
    tip.style.left=tx+'px';tip.style.top=Math.max(tip.offsetHeight+4,y-12)+'px';
  }
  document.addEventListener('pointermove',move,{passive:true});
  document.addEventListener('pointerdown',move,{passive:true});
  document.addEventListener('pointerleave',hide);
  document.addEventListener('pointerup',function(e){if(e.pointerType==='touch')setTimeout(hide,1400);});
})();
