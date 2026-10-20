(function(){
  var css=''
+'.kd-hero{position:relative;overflow:hidden;background:radial-gradient(900px 260px at 85% -20%,rgba(232,199,119,.18),transparent 60%),linear-gradient(165deg,rgba(24,30,43,.95),rgba(8,11,17,.97))!important;border:1px solid rgba(232,199,119,.26)!important;box-shadow:0 22px 60px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.08)!important}'
+'.kd-hero::after{content:"";position:absolute;inset:0;background:linear-gradient(115deg,transparent 40%,rgba(255,246,223,.06) 50%,transparent 60%);transform:translateX(-120%);animation:kdSheen 5.5s 1s ease-in-out infinite;pointer-events:none}'
+'@keyframes kdSheen{to{transform:translateX(120%)}}'
+'.kd-name{background:linear-gradient(180deg,#fff9e8,#e8c777);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}'
+'.kd-fac,.kd-q{transition:transform .35s cubic-bezier(.2,.8,.2,1),border-color .35s,box-shadow .35s;background:linear-gradient(165deg,rgba(24,30,43,.9),rgba(9,12,19,.95))!important;border:1px solid rgba(232,199,119,.16)!important;box-shadow:0 10px 28px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.05)}'
+'.kd-fac:hover,.kd-q:hover{transform:translateY(-4px);border-color:rgba(232,199,119,.5)!important;box-shadow:0 18px 40px rgba(0,0,0,.55),0 0 28px rgba(232,199,119,.12)}'
+'.kd-fac.on .kd-ic{background:linear-gradient(160deg,rgba(232,199,119,.28),rgba(232,199,119,.06))!important;box-shadow:0 0 18px rgba(232,199,119,.25)}'
+'.kd-fac.kd-sig{border-color:rgba(47,230,164,.5)!important;box-shadow:0 14px 36px rgba(0,0,0,.5),0 0 30px rgba(47,230,164,.18)}'
+'.kd-sec-title h2{letter-spacing:.14em;text-transform:uppercase;font-size:12px!important;color:#e8c777!important}'
+'.kd-sigcta{display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding:16px 20px;margin:14px 0;border-radius:22px;background:linear-gradient(120deg,rgba(47,230,164,.14),rgba(232,199,119,.1));border:1px solid rgba(47,230,164,.4);box-shadow:0 14px 40px rgba(0,0,0,.4),0 0 34px rgba(47,230,164,.12);box-sizing:border-box}'
+'.split-main>.kd-sigcta{grid-column:1/-1!important;width:auto!important}'
+'.kd-sigcta b{font-size:16px;color:#fff6df}.kd-sigcta span.t{flex:1;min-width:180px;font-size:12.5px;color:#b4bece}'
+'.kd-sigcta a{padding:10px 18px;border-radius:14px;background:linear-gradient(180deg,#f3d98d,#c79a3d);color:#1a1204;font-weight:800;font-size:13px;text-decoration:none}'
+'.kd-sigcta .kmr-free-pill{display:inline-flex;align-items:center;margin-left:6px;padding:2px 9px;border-radius:999px;font-size:10px;font-weight:900;letter-spacing:.14em;color:#04170f;background:linear-gradient(180deg,#7dffcb,#2fe6a4);box-shadow:0 0 14px rgba(47,230,164,.5);-webkit-text-fill-color:#04170f}';
  var s=document.createElement('style');s.id='kd-v5';s.textContent=css;document.head.appendChild(s);
  function run(){
    var fac=document.getElementById('kd2Fac');if(!fac)return;
    [].slice.call(document.querySelectorAll('.kd-fac')).forEach(function(a){if(/Signal/.test(a.innerText))a.classList.add('kd-sig');});
    if(!document.querySelector('.kd-sigcta')){var d=document.createElement('div');d.className='kd-sigcta';
      d.innerHTML='<b>Kamar Signal <span class="kmr-free-pill">GRATIS</span></b><span class="t">Pantau signal terbuka setiap hari, lengkap dengan performa dan kurva.</span><a href="/signal/">Buka Kamar Signal</a>';
      fac.insertAdjacentElement('beforebegin',d);}
  }
  var q=0;function sched(){if(q)return;q=requestAnimationFrame(function(){q=0;run();});}
  new MutationObserver(sched).observe(document.body,{childList:true,subtree:true});sched();
})();
