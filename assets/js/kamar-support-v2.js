/* KAMAR SUPPORT v2 - CSS loader, rapikan widget Tawk (bubble/badge), tombol Tutup, tidak auto-buka */
(function(){
  if(window.__KAMAR_SUPPORT_V2__) return; window.__KAMAR_SUPPORT_V2__=true;(function(){var w=window;w.Tawk_API=w.Tawk_API||{};var T=w.Tawk_API;var pl=T.onLoad,pm=T.onChatMaximized;function quiet(){try{if(!w.__kmrUserOpened){T.minimize();T.hideWidget()}}catch(e){}}T.onLoad=function(){try{pl&&pl()}catch(e){}quiet()};T.onChatMaximized=function(){try{pm&&pm()}catch(e){}quiet()};T.onChatMessageSystem=T.onChatMessageSystem||function(){};})();
  if(!document.querySelector('link[data-kmr-sup-v2]')){
    var l=document.createElement('link'); l.rel='stylesheet'; l.href='/assets/css/kamar-support-v2.css?v=4'; l.setAttribute('data-kmr-sup-v2','1');
    document.head.appendChild(l);
  }
  var root=document.documentElement, userOpened=false;
  document.addEventListener('click',function(e){
    if(e.target && e.target.closest && e.target.closest('[data-kmr-action="chat"]')) {userOpened=true;window.__kmrUserOpened=true;try{window.Tawk_API.showWidget()}catch(x){}}
  },true);

  var cb=document.createElement('button'); cb.type='button'; cb.className='kmr-chat-close'; cb.setAttribute('aria-label','Tutup chat');
  cb.innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg><span>Tutup</span>';
  function resetChat(){ userOpened=false; window.__kmrUserOpened=false; try{ window.Tawk_API.hideWidget(); }catch(e){} setTimeout(function(){try{window.Tawk_API.hideWidget()}catch(e){}},300); }
  function closeChat(){ try{ window.Tawk_API.minimize(); }catch(e){} root.classList.remove('kmr-chat-open'); resetChat(); }
  cb.addEventListener('click',closeChat);
  document.body.appendChild(cb);
  document.addEventListener('keydown',function(e){ if(e.key==='Escape' && root.classList.contains('kmr-chat-open')) closeChat(); });

  function hide(f){
    var s=f.style;
    s.setProperty('display','none','important'); s.setProperty('visibility','hidden','important');
    s.setProperty('opacity','0','important'); s.setProperty('pointer-events','none','important');
  }
  function hideBubble(f){
    hide(f);
    if(!f.__kmrObs && window.MutationObserver){
      f.__kmrObs=new MutationObserver(function(){ if(f.style.getPropertyValue('display')!=='none' || f.style.getPropertyValue('visibility')!=='hidden') hide(f); });
      f.__kmrObs.observe(f,{attributes:true,attributeFilter:['style']});
    }
  }
  function sweep(){
    var win=null, open=false, ifr=document.querySelectorAll('iframe'), badge=[];
    for(var i=0;i<ifr.length;i++){
      var f=ifr[i], t=(f.title||'').toLowerCase();
      var isTawk=(t.indexOf('widget chat')>=0 || t.indexOf('chat widget')>=0);
      var isBadge=(t.indexOf('tawk')>=0);
      if(!isTawk && !isBadge) continue;
      var r=f.getBoundingClientRect();
      if(isBadge){ badge.push(f); continue; }
      if(f.classList.contains('kmr-tawk-bubble')) continue;
      if(r.width>0 && r.width<=90 && r.height<=90){ f.classList.add('kmr-tawk-bubble'); hideBubble(f); }
      else if(r.width>=280 && r.height>=300){ open=true; win=r; }
    }
    root.classList.toggle('kmr-chat-open',open);
    for(var j=0;j<badge.length;j++){
      if(open){ badge[j].style.removeProperty('display'); } else { badge[j].style.setProperty('display','none','important'); }
    }
    if(open && win){ var tp=win.top>64?win.top-50:10; cb.style.top=tp+'px'; cb.style.left=Math.max(8,Math.min(innerWidth-100,win.right-96))+'px'; }
  }
  setInterval(sweep,400); sweep();

  function hook(){
    var T=window.Tawk_API; if(!T) return false;
    var prevMax=T.onChatMaximized, prevMin=T.onChatMinimized, prevLoad=T.onLoad;
    T.onChatMaximized=function(){ root.classList.add('kmr-chat-open'); sweep(); if(typeof prevMax==='function') prevMax(); };
    T.onChatMinimized=function(){ root.classList.remove('kmr-chat-open'); resetChat(); sweep(); if(typeof prevMin==='function') prevMin(); };
    function calm(){ try{ if(!userOpened && typeof T.minimize==='function' && typeof T.isChatMaximized==='function' && T.isChatMaximized()) T.minimize(); if(typeof T.hideWidget==='function') T.hideWidget(); }catch(e){} }
    T.onLoad=function(){ if(typeof prevLoad==='function') prevLoad(); setTimeout(calm,600); setTimeout(calm,1800); };
    if(typeof T.isChatMaximized==='function'){ setTimeout(calm,600); setTimeout(calm,1800); }
    return true;
  }
  var n=0; (function wait(){ if(!hook() && n++<40) setTimeout(wait,250); })();
})();

/* Sapu bersih: sembunyikan bubble/greeting "We Are Here" Tawk (iframe kecil) kecuali pengguna membuka chat sendiri */
(function(){
  function isTawk(f){var t=(f.title||'').toLowerCase();return t.indexOf('widget chat')>-1||t.indexOf('chat widget')>-1||t.indexOf('tawk')>-1||(f.src||'').indexOf('tawk.to')>-1;}
  function sweep(){
    if(window.__kmrUserOpened) return;
    var all=document.querySelectorAll('iframe');
    for(var i=0;i<all.length;i++){
      var f=all[i]; if(!isTawk(f)) continue;
      var r=f.getBoundingClientRect();
      if(r.width>0&&r.height>0&&r.width<320&&r.height<280){
        var s=f.style;
        s.setProperty('display','none','important');s.setProperty('visibility','hidden','important');
        s.setProperty('opacity','0','important');s.setProperty('pointer-events','none','important');
        f.setAttribute('data-kmr-hidden','1');
      }
    }
  }
  setInterval(sweep,250);
  try{ new MutationObserver(sweep).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['style','class']}); }catch(e){}
  sweep();
})();
