/* FX fan v1 - carousel cover chapter 3D, tersinkron dengan penjelajah chapter (#privateCourseExplorer). Hanya menambah elemen. */
(function(){
  'use strict';
  function boot(){
    var ex=document.getElementById('privateCourseExplorer');
    if(!ex||ex.__fxFan) return;
    var tabs=ex.querySelector('.chapter-tabs');
    if(!tabs) return;
    var btns=tabs.querySelectorAll('button');
    if(!btns.length){ setTimeout(boot,200); if((boot.n=(boot.n||0)+1)>25) return; return; }
    ex.__fxFan=true;
    var N=btns.length, cur=0, REACH=3;
    var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches;
    var fan=document.createElement('div');
    fan.className='fx-fan';fan.tabIndex=0;fan.setAttribute('role','group');fan.setAttribute('aria-label','Cover chapter E-Book, gunakan panah kiri dan kanan');
    var cards=[];
    for(var i=0;i<N;i++){(function(i){
      var c=document.createElement('button');c.type='button';c.className='fx-fan-card';c.setAttribute('aria-label','Buka Chapter '+(i+1));c.hidden=true;
      c.addEventListener('click',function(){ if(drag.moved) return; go(i); });
      fan.appendChild(c);cards.push(c);
    })(i);}
    var count=document.createElement('span');count.className='fx-fan-count';count.setAttribute('aria-live','polite');
    var anchor=ex.querySelector('.chapter-tabs');
    anchor.parentNode.insertBefore(fan,anchor);
    anchor.parentNode.insertBefore(count,anchor);
    function src(i){return 'assets/facilities/private/chapters/chapter-'+String(i+1).padStart(2,'0')+'.png';}
    function layout(){
      var w=fan.clientWidth, step=Math.max(26,Math.min(w*.2,170));
      cards.forEach(function(c,i){
        var d=i-cur;
        if(Math.abs(d)>REACH){c.hidden=true;return;}
        if(c.hidden){c.hidden=false;}
        if(!c.firstChild){var im=document.createElement('img');im.alt='Chapter '+(i+1);im.decoding='async';im.src=src(i);c.appendChild(im);}
        var a=Math.abs(d);
        c.style.zIndex=String(20-a);
        c.style.opacity=String(1-a*.2);
        c.style.filter=a?'brightness('+(1-a*.2)+')':'none';
        c.style.transform='translateX(-50%) translateX('+(d*step)+'px) translateZ('+(-a*90)+'px) rotateY('+(-d*30)+'deg) scale('+(1-a*.07)+')';
        c.classList.toggle('is-active',d===0);
        c.tabIndex=d===0?0:-1;
        c.setAttribute('aria-current',d===0?'true':'false');
      });
      count.textContent='Chapter '+(cur+1)+' dari '+N;
    }
    function go(i){ i=(i+N)%N; if(btns[i]) btns[i].click(); }
    function sync(){
      var a=tabs.querySelector('button.active'); if(!a) return;
      var idx=[].indexOf.call(tabs.querySelectorAll('button'),a);
      if(idx>-1&&idx!==cur){cur=idx;layout();}
    }
    new MutationObserver(sync).observe(tabs,{attributes:true,subtree:true,attributeFilter:['class']});
    fan.addEventListener('keydown',function(e){
      if(e.key==='ArrowRight'){e.preventDefault();go(cur+1);}else if(e.key==='ArrowLeft'){e.preventDefault();go(cur-1);}
    });
    var drag={x:0,on:false,moved:false};
    fan.addEventListener('pointerdown',function(e){drag.x=e.clientX;drag.on=true;drag.moved=false;});
    fan.addEventListener('pointermove',function(e){if(drag.on&&Math.abs(e.clientX-drag.x)>8)drag.moved=true;});
    function end(e){
      if(!drag.on) return; drag.on=false;
      var dx=e.clientX-drag.x;
      if(Math.abs(dx)>40){go(cur+(dx<0?1:-1));}
      setTimeout(function(){drag.moved=false;},0);
    }
    fan.addEventListener('pointerup',end);
    fan.addEventListener('pointercancel',function(){drag.on=false;drag.moved=false;});
    window.addEventListener('resize',layout);
    if(window.ResizeObserver) new ResizeObserver(layout).observe(fan);
    sync();layout();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',function(){setTimeout(boot,0);}); else setTimeout(boot,0);
})();
