/* KAMAR SUPPORT v2 - CSS loader, rapikan widget Tawk (bubble/badge), tidak auto-buka */
(function(){
  if(window.__KAMAR_SUPPORT_V2__) return; window.__KAMAR_SUPPORT_V2__=true;
  if(!document.querySelector('link[data-kmr-sup-v2]')){
    var l=document.createElement('link'); l.rel='stylesheet'; l.href='/assets/css/kamar-support-v2.css?v=2'; l.setAttribute('data-kmr-sup-v2','1');
    document.head.appendChild(l);
  }
  var root=document.documentElement, userOpened=false;
  document.addEventListener('click',function(e){
    if(e.target && e.target.closest && e.target.closest('[data-kmr-action="chat"]')) userOpened=true;
  },true);
  function sweep(){
    var open=false, ifr=document.querySelectorAll('iframe');
    for(var i=0;i<ifr.length;i++){
      var f=ifr[i], t=(f.title||'').toLowerCase();
      if(t.indexOf('widget chat')<0 && t.indexOf('chat widget')<0 && t.indexOf('tawk')<0) continue;
      var r=f.getBoundingClientRect();
      if(t.indexOf('tawk')>=0){ if(open||root.classList.contains('kmr-chat-open')){ f.style.removeProperty('display'); } else { f.style.setProperty('display','none','important'); } continue; }
      if(r.width>0 && r.width<=90 && r.height<=90){ f.classList.add('kmr-tawk-bubble'); f.style.setProperty('display','none','important'); }
      else if(r.width>=280 && r.height>=300){ open=true; }
    }
    root.classList.toggle('kmr-chat-open',open);
  }
  setInterval(sweep,500); sweep();
  function hook(){
    var T=window.Tawk_API; if(!T) return false;
    var prevMax=T.onChatMaximized, prevMin=T.onChatMinimized, prevLoad=T.onLoad;
    T.onChatMaximized=function(){ root.classList.add('kmr-chat-open'); if(typeof prevMax==='function') prevMax(); };
    T.onChatMinimized=function(){ root.classList.remove('kmr-chat-open'); if(typeof prevMin==='function') prevMin(); };
    function calm(){ try{ if(!userOpened && typeof T.minimize==='function' && typeof T.isChatMaximized==='function' && T.isChatMaximized()) T.minimize(); if(typeof T.hideWidget==='function') T.hideWidget(); }catch(e){} }
    T.onLoad=function(){ if(typeof prevLoad==='function') prevLoad(); setTimeout(calm,600); setTimeout(calm,1800); };
    if(T.onLoaded || (typeof T.isChatMaximized==='function')){ setTimeout(calm,600); setTimeout(calm,1800); }
    return true;
  }
  var n=0; (function wait(){ if(!hook() && n++<40) setTimeout(wait,250); })();
})();
