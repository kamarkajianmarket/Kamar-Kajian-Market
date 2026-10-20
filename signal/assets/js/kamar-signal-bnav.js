(function(){
  var css='.ksig-bn{display:none}'
  +'@media(max-width:760px){.ksig-bn{display:flex;position:fixed;left:12px;right:12px;bottom:calc(10px + env(safe-area-inset-bottom));z-index:60;padding:6px;border-radius:24px;background:rgba(12,16,24,.72);-webkit-backdrop-filter:blur(22px) saturate(1.7);backdrop-filter:blur(22px) saturate(1.7);border:1px solid rgba(232,199,119,.24);box-shadow:0 16px 44px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.08)}'
  +'.ksig-bn a{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;padding:8px 2px;border-radius:18px;color:#a9b3c4;text-decoration:none;font-size:10px;font-weight:700;letter-spacing:.04em;-webkit-tap-highlight-color:transparent;transition:background .3s,color .3s}'
  +'.ksig-bn a svg{width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}'
  +'.ksig-bn a.on{color:#1a1204;background:linear-gradient(180deg,#f3d98d,#c79a3d);box-shadow:0 6px 18px rgba(232,199,119,.35)}'
  +'body.ksig-body{padding-bottom:calc(96px + env(safe-area-inset-bottom))!important}}';
  function ic(p){return '<svg viewBox="0 0 24 24">'+p+'</svg>';}
  var items=[
    {l:'Performa',t:'.ksig-perf',i:ic('<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>')},
    {l:'Kurva',t:'.ksig-eq',i:ic('<path d="M3 17l6-6 4 4 8-9"/>')},
    {l:'Rekap',t:'.ksig-block:nth-of-type(2)',i:ic('<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 12h8M8 16h5"/>')},
    {l:'Aktivitas',t:'.ksig-block:nth-of-type(3)',i:ic('<path d="M3 12h4l3-8 4 16 3-8h4"/>')},
    {l:'Dashboard',h:'/dashboard.html',i:ic('<path d="M3 11l9-8 9 8v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z"/>')}
  ];
  function init(){
    if(!document.querySelector('.ksig-dashboard')||document.querySelector('.ksig-bn'))return;
    var st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
    var nav=document.createElement('nav');nav.className='ksig-bn';
    nav.innerHTML=items.map(function(x,n){return '<a '+(x.h?'href="'+x.h+'"':'href="#" data-n="'+n+'"')+'>'+x.i+'<span>'+x.l+'</span></a>';}).join('');
    document.body.appendChild(nav);
    function target(x){return document.querySelector('.ksig-dashboard '+x.t)||document.querySelector(x.t);}
    nav.addEventListener('click',function(e){var a=e.target.closest('a[data-n]');if(!a)return;e.preventDefault();var t=target(items[+a.dataset.n]);if(t)t.scrollIntoView({behavior:'smooth',block:'start'});});
    var links=nav.querySelectorAll('a[data-n]');
    function mark(){var y=innerHeight*0.4,best=0;items.forEach(function(x,n){if(x.h)return;var t=target(x);if(t&&t.getBoundingClientRect().top<y)best=n;});links.forEach(function(a){a.classList.toggle('on',+a.dataset.n===best);});}
    addEventListener('scroll',mark,{passive:true});mark();
  }
  var n=0;(function w(){init();if(!document.querySelector('.ksig-bn')&&++n<40)setTimeout(w,300);})();
})();
