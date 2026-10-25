/* Menu cepat (Ctrl/Cmd+K): pencarian menu member. Hanya navigasi, tidak menyentuh data/auth. */
(function(){
  'use strict';
  if(window.__kamarQuickMenu) return; window.__kamarQuickMenu = true;
  var ov=null, input=null, list=null, items=[], sel=0;
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function collect(){
    var seen={},out=[];
    document.querySelectorAll('.split-sidebar a[href], .kamar-bottom-nav a[href]').forEach(function(a){
      var t=(a.textContent||'').replace(/\s+/g,' ').trim(), h=a.getAttribute('href');
      if(!t||!h||h.charAt(0)==='#'||/logout/i.test(h+t)||seen[h]) return;
      seen[h]=1; out.push({t:t,h:h});
    });
    return out;
  }
  function render(){
    var q=input.value.trim().toLowerCase();
    var f=items.filter(function(x){return !q||x.t.toLowerCase().indexOf(q)>=0;});
    if(sel>=f.length) sel=Math.max(0,f.length-1);
    list.innerHTML=f.length?f.map(function(x,i){return '<a class="kqm-item'+(i===sel?' on':'')+'" role="option" href="'+esc(x.h)+'"><span>'+esc(x.t)+'</span><i>↵</i></a>';}).join(''):'<div class="kqm-none">Menu tidak ditemukan.</div>';
    list._f=f;
  }
  function open(){
    items=collect(); if(!items.length) return;
    if(!ov){
      ov=document.createElement('div'); ov.className='kqm-ov'; ov.hidden=true;
      ov.innerHTML='<div class="kqm-box" role="dialog" aria-modal="true" aria-label="Menu cepat"><input class="kqm-in" type="text" placeholder="Cari menu… (Esc untuk menutup)" aria-label="Cari menu" autocomplete="off"/><div class="kqm-list" role="listbox"></div><div class="kqm-hint">↑ ↓ pilih · Enter buka · Esc tutup</div></div>';
      document.body.appendChild(ov); input=ov.querySelector('.kqm-in'); list=ov.querySelector('.kqm-list');
      input.addEventListener('input',function(){sel=0;render();});
      ov.addEventListener('mousedown',function(e){if(e.target===ov) close();});
      input.addEventListener('keydown',function(e){
        var f=list._f||[];
        if(e.key==='ArrowDown'){e.preventDefault();sel=Math.min(f.length-1,sel+1);render();}
        else if(e.key==='ArrowUp'){e.preventDefault();sel=Math.max(0,sel-1);render();}
        else if(e.key==='Enter'){e.preventDefault();if(f[sel]) location.href=f[sel].h;}
      });
    }
    input.value=''; sel=0; ov.hidden=false; render(); setTimeout(function(){input.focus();},0);
  }
  function close(){ if(ov) ov.hidden=true; }
  document.addEventListener('keydown',function(e){
    if((e.ctrlKey||e.metaKey)&&String(e.key).toLowerCase()==='k'){e.preventDefault(); if(ov&&!ov.hidden) close(); else open();}
    else if(e.key==='Escape'&&ov&&!ov.hidden) close();
  });
})();
