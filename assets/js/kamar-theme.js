/* Kamar tema: auto | dark | light. Dimuat sinkron di <head> agar tanpa kedipan. */
(function(){
  var KEY='kamarThemeMode',root=document.documentElement,mq=window.matchMedia?window.matchMedia('(prefers-color-scheme: light)'):null;
  function get(){try{var v=localStorage.getItem(KEY);if(v==='dark'||v==='light'||v==='auto')return v;}catch(e){}return 'dark';}
  function eff(m){return m==='auto'?((mq&&mq.matches)?'light':'dark'):m;}
  function apply(m){root.setAttribute('data-theme',eff(m));root.setAttribute('data-theme-mode',m);try{var mt=document.querySelector('meta[name=theme-color]');if(mt)mt.setAttribute('content',eff(m)==='light'?'#f9f8f5':'#06070a');}catch(e){}}
  function set(m){try{localStorage.setItem(KEY,m);}catch(e){}apply(m);paint();}
  apply(get());
  var DK='kamarDensity';function dens(){try{return localStorage.getItem(DK)==='compact'?'compact':'normal';}catch(e){return 'normal';}}
  function setDens(v){try{localStorage.setItem(DK,v);}catch(e){}root.setAttribute('data-density',v);}
  root.setAttribute('data-density',dens());
  if(mq){var h=function(){if(get()==='auto')apply('auto');};if(mq.addEventListener)mq.addEventListener('change',h);else if(mq.addListener)mq.addListener(h);}
  window.addEventListener('storage',function(e){if(e.key===KEY)apply(get());if(e.key===DK)root.setAttribute('data-density',dens());});
  var ICON={dark:'<svg viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',light:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',auto:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 3v18" /><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/></svg>'};
  var LAB={auto:'Otomatis (ikut HP)',dark:'Gelap',light:'Terang'};
  var btns=[];
  function paint(){var m=get();btns.forEach(function(b){b.innerHTML=ICON[m]+'<span class="kt-l">'+(b.classList.contains('kt-drawer')?'Mode tampilan: ':'')+LAB[m]+'</span>';b.setAttribute('aria-label','Mode tampilan: '+LAB[m]);b.title='Mode tampilan: '+LAB[m];});}
  var menu=null;
  function closeMenu(){if(menu){menu.remove();menu=null;}}
  function openMenu(btn){
    closeMenu();menu=document.createElement('div');menu.className='kt-menu';menu.setAttribute('role','menu');
    var m=get();['auto','dark','light'].forEach(function(k){var o=document.createElement('button');o.type='button';o.setAttribute('role','menuitemradio');o.setAttribute('aria-checked',String(m===k));o.innerHTML=ICON[k]+'<span>'+LAB[k]+'</span>';o.onclick=function(){set(k);closeMenu();};menu.appendChild(o);});
    if(document.body.classList.contains('kamar-member-desktop-v2')){var sep=document.createElement('div');sep.style.cssText='height:1px;margin:6px 4px;background:rgba(232,199,119,.25)';menu.appendChild(sep);var c=document.createElement('button');c.type='button';c.setAttribute('role','menuitemcheckbox');c.setAttribute('aria-checked',String(dens()==='compact'));c.innerHTML='<svg viewBox="0 0 24 24"><path d="M4 8h16M4 12h16M4 16h16"/></svg><span>Mode ringkas</span>';c.onclick=function(){setDens(dens()==='compact'?'normal':'compact');closeMenu();};menu.appendChild(c);}
    document.body.appendChild(menu);
    var r=btn.getBoundingClientRect(),w=menu.offsetWidth,h=menu.offsetHeight;
    var left=Math.max(8,Math.min(innerWidth-w-8,r.right-w)),top=r.bottom+8;if(top+h>innerHeight-8)top=Math.max(8,r.top-h-8);
    menu.style.left=left+'px';menu.style.top=top+'px';
    var f=menu.querySelector('[aria-checked=true]');if(f)f.focus();
  }
  function mk(cls){var b=document.createElement('button');b.type='button';b.className='kt-btn '+(cls||'');b.setAttribute('aria-haspopup','menu');b.onclick=function(e){e.stopPropagation();if(menu)closeMenu();else openMenu(b);};btns.push(b);return b;}
  function mount(last){
    var hosts=document.querySelectorAll('.header-actions,.ksig-topnav,.kamar-global-actions'),n=0;
    hosts.forEach(function(h){if(h.querySelector('.kt-btn'))return;var r=h.getBoundingClientRect();if(!r.width||!r.height)return;h.appendChild(mk());n++;});
    var d=document.querySelector('.split-sidebar');if(last&&n===0&&!document.querySelector('.kt-btn:not(.kt-float):not(.kt-drawer)')&&d&&!d.querySelector('.kt-btn')){var b=mk('kt-drawer');var lb=b.querySelector('.kt-l');d.appendChild(b);n++;}
    var have=document.querySelectorAll('.kt-btn:not(.kt-float)').length;
    var fl=document.querySelector('.kt-float');
    if(have&&fl){var i=btns.indexOf(fl);if(i>=0)btns.splice(i,1);fl.remove();}
    else if(!have&&last&&!fl){document.body.appendChild(mk('kt-float'));}
    paint();
  }
  document.addEventListener('click',function(e){if(menu&&!menu.contains(e.target))closeMenu();});
  document.addEventListener('keydown',function(e){if(e.key==='Escape')closeMenu();});
  window.kamarTheme={set:set,get:get};
  function init(){mount();setTimeout(mount,700);setTimeout(mount,1800);setTimeout(function(){mount(true)},3500);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
