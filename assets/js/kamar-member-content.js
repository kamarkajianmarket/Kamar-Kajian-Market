
(function(){
  "use strict";
  function client(){ if(!window.kamarSupabase) throw new Error(window.KAMAR_SUPABASE_ERROR||"Supabase belum siap."); return window.kamarSupabase; }
  function page(){ return location.pathname.split('/').pop()||'dashboard.html'; }
  function esc(v){ return String(v??'').replace(/[&<>'"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[m])); }
  function fmtDate(v){ if(!v) return '-'; try{return new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(v));}catch(e){return String(v);} }
  function pretty(v){ const map={kamar_study:'Kamar Study',materi_edukasi:'Materi Edukasi',kamar_private:'Kamar Private',kamar_indikator:'Kamar Indikator',kamar_robot:'Kamar Robot',indicator:'Indikator',indikator:'Indikator',robot:'Robot',public:'Publik',member:'Member'}; const key=String(v||'').toLowerCase(); return map[key] || String(v||'').replace(/_/g,' ').replace(/\b\w/g,function(c){return c.toUpperCase();}); }
  function main(){ return document.querySelector('.split-main')||document.querySelector('main')||document.body; }
  function contentBox(){ let box=document.getElementById('memberContentList'); if(box) return box; const m=main(); const sec=document.createElement('section'); sec.className='split-card'; sec.innerHTML='<div id="memberContentList" class="kamar-empty">Memuat konten...</div>'; m.appendChild(sec); return sec.querySelector('#memberContentList'); }
  function card(x,type){ const url=x.material_url||x.file_url||x.youtube_url||x.cta_url||''; return `<article class="kamar-data-card"><h3>${esc(x.title||'Konten Kamar')}</h3><p class="kamar-muted">${esc(x.description||x.changelog||x.category||'')}</p><div class="meta"><span class="kamar-pill on">${esc(pretty(x.category||x.file_type||x.access_required||type))}</span><span class="kamar-pill off">${fmtDate(x.updated_at||x.created_at)}</span></div>${url?`<div class="kamar-actions"><a class="btn" href="${esc(url)}" target="_blank" rel="noopener">Buka</a></div>`:''}</article>`; }
  function render(items,title,empty){ const box=contentBox(); box.className=''; box.innerHTML=(items&&items.length)?`<div class="kamar-card-grid">${items.map(x=>card(x,title)).join('')}</div>`:`<div class="kamar-empty">${esc(empty||'Belum ada konten yang tersedia untuk akun ini.')}</div>`; }
  async function rpc(name,args){ const {data,error}=await client().rpc(name,args||{}); if(error) throw error; return data||[]; }
  async function boot(){
    const p=page();
    try{
      if(p==='member-materials.html'){
        const data=await rpc('get_member_materials'); render(data,'Materi','Belum ada materi edukasi yang tersedia untuk akses akun ini.');
      } else if(p==='member-private.html'){
        let data=[]; try{data=await rpc('get_member_videos');}catch(e){data=[];} data=(data||[]).filter(x=>String(x.access_required||x.category||'').toLowerCase().includes('private'));
        render(data,'Private','Belum ada konten private yang tersedia untuk akses akun ini.');
      } else if(p==='member-indicator.html'){
        const data=(await rpc('get_member_tools_files')).filter(x=>String(x.access_required||x.file_type||'').toLowerCase().includes('indikator')||String(x.title||'').toLowerCase().includes('indikator'));
        render(data,'Indikator','Belum ada file indikator yang tersedia untuk akses akun ini.');
      } else if(p==='member-robot.html'){
        const data=(await rpc('get_member_tools_files')).filter(x=>String(x.access_required||x.file_type||'').toLowerCase().includes('robot')||String(x.title||'').toLowerCase().includes('robot'));
        render(data,'Robot','Belum ada file robot yang tersedia untuk akses akun ini.');
      }
    }catch(e){ contentBox().innerHTML=`<div class="expired-note"><strong>Gagal Membaca Data</strong><br/>${esc(e.message)}</div>`; }
  }
  document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,450));
})();
