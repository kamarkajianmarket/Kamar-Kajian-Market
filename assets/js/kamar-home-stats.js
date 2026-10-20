/* Kamar Home: statistik signal live (angka ringkasan publik) */
(function(){
  if(window.__kamarHomeStats) return; window.__kamarHomeStats=1;
  var css='#bukti-signal{position:relative}'+
  '#bukti-signal .bs-wrap{width:100%}'+
  '#bukti-signal .bs-eyebrow{display:inline-block;padding:6px 14px;border-radius:999px;font-size:11px;font-weight:800;letter-spacing:.2em;color:#e8c777;background:rgba(232,199,119,.1);border:1px solid rgba(232,199,119,.3)}'+
  '#bukti-signal h2{margin:16px 0 10px;font-size:clamp(28px,5vw,46px);line-height:1.1;font-weight:900;color:#fff6df;letter-spacing:-.02em}'+
  '#bukti-signal h2 em{font-style:normal;color:#e8c777}'+
  '#bukti-signal .bs-sub{max-width:640px;color:#b4bece;font-size:clamp(14px,2vw,16px);line-height:1.6;margin:0 0 28px}'+
  '#bukti-signal .bs-live{display:inline-flex;align-items:center;gap:8px;font-size:11px;font-weight:800;letter-spacing:.14em;color:#5df0bb;margin-left:12px;vertical-align:middle}'+
  '#bukti-signal .bs-live i{width:8px;height:8px;border-radius:50%;background:#2fe6a4;box-shadow:0 0 0 0 rgba(47,230,164,.7);animation:bsPulse 1.8s infinite}'+
  '@keyframes bsPulse{70%{box-shadow:0 0 0 10px rgba(47,230,164,0)}100%{box-shadow:0 0 0 0 rgba(47,230,164,0)}}'+
  '#bukti-signal .bs-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}'+
  '#bukti-signal .bs-card{position:relative;overflow:hidden;padding:20px 18px;border-radius:22px;background:linear-gradient(165deg,rgba(24,30,42,.92),rgba(9,12,19,.96));border:1px solid rgba(232,199,119,.22);box-shadow:0 16px 44px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.08);opacity:0;transform:translateY(22px);transition:opacity .8s cubic-bezier(.2,.8,.2,1),transform .8s cubic-bezier(.2,.8,.2,1)}'+
  '#bukti-signal.in .bs-card{opacity:1;transform:none}'+
  '#bukti-signal .bs-card:nth-child(2){transition-delay:.08s}#bukti-signal .bs-card:nth-child(3){transition-delay:.16s}#bukti-signal .bs-card:nth-child(4){transition-delay:.24s}'+
  '#bukti-signal .bs-card::before{content:"";position:absolute;left:0;right:0;top:0;height:2px;background:linear-gradient(90deg,transparent,#e8c777,transparent)}'+
  '#bukti-signal .bs-k{font-size:10.5px;font-weight:800;letter-spacing:.18em;color:#e8c777;text-transform:uppercase}'+
  '#bukti-signal .bs-v{margin-top:10px;font-size:clamp(30px,4.4vw,44px);font-weight:900;line-height:1;color:#fff6df;font-variant-numeric:tabular-nums;letter-spacing:-.02em}'+
  '#bukti-signal .bs-v.g{color:#5df0bb;text-shadow:0 0 26px rgba(47,230,164,.55)}'+
  '#bukti-signal .bs-v.r{color:#ff6b7a}'+
  '#bukti-signal .bs-d{margin-top:8px;font-size:12px;color:#a9b3c4}'+
  '#bukti-signal .bs-chart{margin-top:14px;padding:18px;border-radius:22px;background:linear-gradient(165deg,rgba(20,26,38,.95),rgba(8,11,17,.98));border:1px solid rgba(232,199,119,.2);box-shadow:0 16px 44px rgba(0,0,0,.45);opacity:0;transform:translateY(22px);transition:opacity .9s .3s,transform .9s .3s}'+
  '#bukti-signal.in .bs-chart{opacity:1;transform:none}'+
  '#bukti-signal .bs-chart svg{width:100%;height:auto;display:block}'+
  '#bukti-signal .bs-chart .ln{fill:none;stroke:#5df0bb;stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round;filter:drop-shadow(0 0 7px rgba(47,230,164,.7));stroke-dasharray:2400;stroke-dashoffset:2400}'+
  '#bukti-signal.in .bs-chart .ln{animation:bsDraw 2s .5s cubic-bezier(.2,.8,.2,1) forwards}'+
  '@keyframes bsDraw{to{stroke-dashoffset:0}}'+
  '#bukti-signal .bs-note{margin-top:16px;padding:14px 16px;border-radius:14px;border:1px solid rgba(232,199,119,.3);border-left:4px solid #e8c777;background:rgba(232,199,119,.07);font-size:13.5px;color:#dfe5ee;line-height:1.65}#bukti-signal .bs-note b{display:block;margin-bottom:4px;font-size:11px;letter-spacing:.2em;color:#e8c777}'+
  '#bukti-signal .bs-cta{display:inline-block;margin-top:18px;padding:13px 26px;border-radius:999px;font-weight:800;color:#1a1305;background:linear-gradient(180deg,#f3d98d,#c9a24a);text-decoration:none;box-shadow:0 10px 30px rgba(201,162,74,.35)}'+
  '@media(max-width:860px){#bukti-signal .bs-grid{grid-template-columns:repeat(2,1fr)}}'+
  '@media(prefers-reduced-motion:reduce){#bukti-signal .bs-card,#bukti-signal .bs-chart{opacity:1;transform:none;transition:none}#bukti-signal .bs-chart .ln{animation:none;stroke-dashoffset:0}}';
  function fmt(n){return Math.round(n).toLocaleString('id-ID');}
  function count(el,to,dec){var t0=null,dur=1600;function f(ts){if(!t0)t0=ts;var p=Math.min(1,(ts-t0)/dur),e=1-Math.pow(1-p,3),v=to*e;el.textContent=dec?v.toFixed(1).replace('.',','):fmt(v);if(p<1)requestAnimationFrame(f);}requestAnimationFrame(f);}
  function spark(s){
    if(!s||s.length<2)return '';var W=1000,H=220,p=10,mn=Math.min(0,Math.min.apply(null,s)),mx=Math.max.apply(null,s);if(mx===mn)mx=mn+1;
    var d='';s.forEach(function(v,i){d+=(i?'L':'M')+(p+i*(W-2*p)/(s.length-1)).toFixed(1)+' '+(H-p-(v-mn)/(mx-mn)*(H-2*p)).toFixed(1)+' ';});
    var a=d+'L'+(W-p)+' '+(H-p)+' L'+p+' '+(H-p)+' Z';
    return '<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none"><defs><linearGradient id="bsG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2fe6a4" stop-opacity=".4"/><stop offset="1" stop-color="#2fe6a4" stop-opacity="0"/></linearGradient></defs><path d="'+a+'" fill="url(#bsG)"/><path class="ln" pathLength="2400" d="'+d+'"/></svg>';
  }
  function build(d){
    var sec=document.createElement('section');sec.id='bukti-signal';sec.className='section-shell compact-section is-visible';
    var since='';try{since=new Date(d.since+'T00:00:00').toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});}catch(e){}
    sec.innerHTML='<div class="bs-wrap"><span class="bs-eyebrow">BUKTI TERCATAT</span><span class="bs-live"><i></i>LIVE</span>'+
    '<h2>Hasil <em>Kamar Signal</em> tercatat apa adanya</h2>'+
    '<p class="bs-sub">Setiap zona entry, target, dan invalidasi dicatat otomatis oleh sistem Kamar AI sejak '+since+'. Angka di bawah dihitung langsung dari seluruh signal yang sudah selesai, bukan dipilih-pilih.</p>'+
    '<div class="bs-grid">'+
    '<div class="bs-card"><div class="bs-k">Winrate</div><div class="bs-v g"><span data-c="'+d.winrate+'" data-dec="1">0</span>%</div><div class="bs-d">'+fmt(d.profit)+' profit · '+fmt(d.loss)+' loss</div></div>'+
    '<div class="bs-card"><div class="bs-k">Signal Selesai</div><div class="bs-v"><span data-c="'+d.total_closed+'">0</span></div><div class="bs-d">dicatat tanpa dihapus</div></div>'+
    '<div class="bs-card"><div class="bs-k">Signal Profit</div><div class="bs-v g"><span data-c="'+d.profit+'">0</span></div><div class="bs-d">mencapai target TP</div></div>'+
    '<div class="bs-card"><div class="bs-k">Total Pips</div><div class="bs-v '+(d.total_pips<0?'r':'g')+'"><span data-c="'+Math.abs(d.total_pips)+'">0</span></div><div class="bs-d">akumulasi sejak '+since+'</div></div>'+
    '</div>'+
    '<div class="bs-chart"><div class="bs-k" style="margin-bottom:10px">Kurva akumulasi pips harian</div>'+spark(d.series)+'</div>'+
    '<div class="bs-note"><b>DISCLAIMER</b>Hasil historis dicatat otomatis oleh sistem dan bukan jaminan hasil di masa depan. Trading mengandung risiko; gunakan sebagai bahan kajian, bukan ajakan membeli atau menjual.</div>'+
    '<a class="bs-cta" href="/register.html">Daftar &amp; Lihat Signal Lengkap</a></div>';
    return sec;
  }
  var ph=null,stDone=false;
  function ensurePh(){
    if(ph)return ph;var anchor=document.getElementById('tentang')||document.querySelector('main section:nth-of-type(2)');if(!anchor)return null;
    if(!stDone){stDone=true;var st=document.createElement('style');st.textContent=css+'#bukti-signal.bs-skel{min-height:940px;background:linear-gradient(110deg,rgba(255,255,255,.02) 30%,rgba(255,255,255,.06) 50%,rgba(255,255,255,.02) 70%) 0 0/220% 100%,rgba(16,23,32,.88);animation:bsShim 1.8s linear infinite}@keyframes bsShim{to{background-position:-220% 0,0 0}}@media(max-width:860px){#bukti-signal.bs-skel{min-height:1240px}}';document.head.appendChild(st);}
    ph=document.createElement('section');ph.id='bukti-signal';ph.className='section-shell compact-section is-visible bs-skel';anchor.parentNode.insertBefore(ph,anchor);return ph;
  }
  function run(){
    var c=window.kamarSupabaseClient;if(!c||!c.rpc)return false;
    var p=ensurePh();if(!p)return false;
    c.rpc('public_signal_stats').then(function(r){
      if(r.error||!r.data||!r.data.total_closed){p.remove();return;}
      var sec=build(r.data);p.className='section-shell compact-section is-visible';p.innerHTML=sec.innerHTML;
      var done=false;function go(){if(done)return;done=true;p.classList.add('in');p.querySelectorAll('[data-c]').forEach(function(e){count(e,parseFloat(e.getAttribute('data-c')),e.getAttribute('data-dec')==='1');});}
      if('IntersectionObserver' in window){new IntersectionObserver(function(es,o){if(es[0].isIntersecting){go();o.disconnect();}},{threshold:.25}).observe(p);}else go();
    });
    return true;
  }
  ensurePh();
  var tries=0;(function w(){if(run())return;if(++tries<40)setTimeout(w,250);})();
})();
