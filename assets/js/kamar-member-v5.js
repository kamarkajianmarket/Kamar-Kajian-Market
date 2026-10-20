(function(){
  var css=''
+'.kd-hero{position:relative;overflow:hidden;background:radial-gradient(900px 260px at 85% -20%,rgba(232,199,119,.18),transparent 60%),linear-gradient(165deg,rgba(24,30,43,.95),rgba(8,11,17,.97))!important;border:1px solid rgba(232,199,119,.26)!important;box-shadow:0 22px 60px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.08)!important}'
+'.kd-hero::after{content:"";position:absolute;inset:0;background:linear-gradient(115deg,transparent 40%,rgba(255,246,223,.06) 50%,transparent 60%);transform:translateX(-120%);animation:kdSheen 5.5s 1s ease-in-out infinite;pointer-events:none}'
+'@keyframes kdSheen{to{transform:translateX(120%)}}'
+'.kd-name{background:linear-gradient(180deg,#fff9e8,#e8c777);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}'
+'.kd-fac,.kd-q{transition:transform .35s cubic-bezier(.2,.8,.2,1),border-color .35s,box-shadow .35s;background:linear-gradient(165deg,rgba(24,30,43,.9),rgba(9,12,19,.95))!important;border:1px solid rgba(232,199,119,.16)!important;box-shadow:0 10px 28px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.05)}'
+'.kd-fac:hover,.kd-q:hover{transform:translateY(-4px);border-color:rgba(232,199,119,.5)!important;box-shadow:0 18px 40px rgba(0,0,0,.55),0 0 28px rgba(232,199,119,.12)}'
+'.kd-fac.on .kd-ic{background:linear-gradient(160deg,rgba(232,199,119,.28),rgba(232,199,119,.06))!important;box-shadow:0 0 18px rgba(232,199,119,.25)}'
+'.kd-sec-title h2{letter-spacing:.14em;text-transform:uppercase;font-size:12px!important;color:#e8c777!important}';
  var s=document.createElement('style');s.id='kd-v5';s.textContent=css;document.head.appendChild(s);
})();
