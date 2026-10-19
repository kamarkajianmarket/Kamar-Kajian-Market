/* KAMAR PREVIEW v1 — komponen preview reusable (gambar, PDF, link).
   Pakai: <a href="#" data-kamar-preview="URL" data-title="Judul" data-type="image|pdf|link">Nama file</a>
   atau KamarPreview.open({title, url, type}) / KamarPreview.open({title, getUrl: async()=>url, type}) */
(function(){
  if(window.KamarPreview) return;
  var st=document.createElement('style');
  st.textContent='.kp-ov{position:fixed;inset:0;z-index:100000;background:rgba(4,4,3,.88);display:none;align-items:center;justify-content:center;padding:18px;backdrop-filter:blur(4px)}.kp-ov.show{display:flex}.kp-box{width:min(1000px,100%);max-height:94vh;display:flex;flex-direction:column;border:1px solid rgba(238,206,122,.3);border-radius:22px;background:#0b0f14;box-shadow:0 30px 90px rgba(0,0,0,.6);overflow:hidden}.kp-head{display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid rgba(238,206,122,.16)}.kp-title{flex:1;min-width:0;color:#fff3d8;font-weight:900;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.kp-btn{border:1px solid rgba(238,206,122,.3);background:rgba(255,255,255,.06);color:#f4df90;border-radius:999px;padding:7px 14px;font-weight:900;font-size:12px;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center}.kp-btn:hover{background:rgba(244,223,144,.16)}.kp-body{flex:1;min-height:200px;overflow:auto;display:flex;align-items:flex-start;justify-content:center;background:#05070a}.kp-body img{max-width:100%;height:auto;cursor:zoom-in;display:block;margin:auto}.kp-body img.full{max-width:none;cursor:zoom-out}.kp-body iframe{width:100%;height:78vh;border:0;background:#fff}.kp-msg{color:#d8cda9;padding:40px 20px;text-align:center;line-height:1.6}';
  document.head.appendChild(st);
  var ov=document.createElement('div');ov.className='kp-ov';
  ov.innerHTML='<div class="kp-box" role="dialog" aria-modal="true"><div class="kp-head"><div class="kp-title"></div><a class="kp-btn kp-open" target="_blank" rel="noopener">Buka di tab baru</a><button type="button" class="kp-btn kp-close">Tutup ✕</button></div><div class="kp-body"></div></div>';
  function mount(){document.body.appendChild(ov);}
  if(document.body)mount();else document.addEventListener('DOMContentLoaded',mount);
  var body=function(){return ov.querySelector('.kp-body')};
  function guess(u,t){
    if(t&&t!=='auto')return t;
    var s=String(u||'').split('?')[0].toLowerCase();
    if(/\.(png|jpe?g|webp|gif|avif|bmp)$/.test(s))return 'image';
    if(/\.pdf$/.test(s))return 'pdf';
    return 'link';
  }
  function close(){ov.classList.remove('show');body().innerHTML='';}
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  async function open(o){
    o=o||{};
    ov.querySelector('.kp-title').textContent=o.title||'Preview';
    var b=body();b.innerHTML='<div class="kp-msg">Memuat…</div>';
    ov.classList.add('show');
    var url=o.url;
    try{if(!url&&o.getUrl)url=await o.getUrl();}catch(e){b.innerHTML='<div class="kp-msg">Gagal memuat file.</div>';return;}
    if(!url){b.innerHTML='<div class="kp-msg">File tidak tersedia.</div>';return;}
    var op=ov.querySelector('.kp-open');op.href=url;
    var t=guess(url,o.type);
    if(t==='image'){
      b.innerHTML='<img alt="'+esc(o.title||'')+'">';
      var im=b.firstChild;im.onerror=function(){b.innerHTML='<div class="kp-msg">Gambar tidak dapat ditampilkan. Gunakan tombol "Buka di tab baru".</div>';};
      im.onclick=function(){im.classList.toggle('full');};
      im.src=url;
    }else if(t==='pdf'){
      b.innerHTML='<iframe title="'+esc(o.title||'PDF')+'"></iframe>';b.firstChild.src=url;
    }else{
      var embed=url;
      var m=String(url).match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,})/);
      if(m)embed='https://www.youtube.com/embed/'+m[1];
      b.innerHTML='<iframe title="'+esc(o.title||'Link')+'" allowfullscreen></iframe><div class="kp-msg" style="padding:10px 14px;font-size:12px">Bila halaman tidak tampil, situs tersebut memblokir tampilan di dalam halaman. Gunakan "Buka di tab baru".</div>';
      b.firstChild.src=embed;
      b.style.flexDirection='column';
    }
  }
  ov.addEventListener('click',function(e){if(e.target===ov||e.target.closest('.kp-close'))close();});
  document.addEventListener('keydown',function(e){if(e.key==='Escape')close();});
  document.addEventListener('click',function(e){
    var a=e.target.closest&&e.target.closest('[data-kamar-preview]');
    if(!a)return;
    e.preventDefault();
    open({title:a.getAttribute('data-title')||a.textContent.trim(),url:a.getAttribute('data-kamar-preview'),type:a.getAttribute('data-type')||'auto'});
  });
  window.KamarPreview={open:open,close:close};
})();
