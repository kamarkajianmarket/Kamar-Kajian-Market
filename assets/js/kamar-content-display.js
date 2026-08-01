(function(){
'use strict';
if(window.__KAMAR_CONTENT_DISPLAY__) return;
window.__KAMAR_CONTENT_DISPLAY__=true;

function file(){return (location.pathname.split('/').pop()||'index.html').toLowerCase().split('?')[0];}
var CTX=(function(){
  var f=file();
  if(f==='dashboard.html') return 'member';
  if(f==='affiliate-dashboard.html') return 'affiliate';
  return 'public';
})();

function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}

async function client(){
  try{
    if(window.KamarSupabase && window.KamarSupabase.ready){
      var c1=await window.KamarSupabase.ready();
      if(c1) return c1;
    }
  }catch(e){}
  if(window.kamarSupabaseClient) return window.kamarSupabaseClient;
  var start=Date.now();
  while(Date.now()-start<4000){
    await new Promise(function(r){setTimeout(r,150);});
    if(window.kamarSupabaseClient) return window.kamarSupabaseClient;
  }
  return null;
}

function bannerAreas(){
  if(CTX==='member') return ['member','global','both'];
  if(CTX==='affiliate') return ['affiliate','global','both'];
  return ['public','global','both'];
}

function memberAccessAllows(accessRequired, access){
  access=access||{};
  switch(accessRequired){
    case 'public': case 'member': return true;
    case 'materi_edukasi': return !!access.access_materi_edukasi;
    case 'kamar_study': return !!access.access_kamar_study;
    case 'kamar_private': return !!access.access_kamar_private;
    case 'kamar_indikator': return !!access.access_kamar_indikator;
    case 'kamar_robot': return !!access.access_kamar_robot;
    case 'all_paid': return !!(access.access_materi_edukasi||access.access_kamar_study||access.access_kamar_private||access.access_kamar_indikator||access.access_kamar_robot);
    default: return false;
  }
}
function accessAllowed(accessRequired, access){
  if(CTX==='public') return accessRequired==='public';
  if(CTX==='member') return memberAccessAllows(accessRequired, access);
  return false;
}

async function fetchMemberAccess(c){
  if(CTX!=='member') return {};
  try{
    var res=await c.from('member_access').select('*').limit(5);
    if(res.error||!res.data||!res.data.length) return {};
    return res.data[0];
  }catch(e){ return {}; }
}

// ---------------- Banner ----------------
async function renderBanner(c){
  var mount=document.getElementById('kamarBannerMount');
  if(!mount) return;
  try{
    var res=await c.from('banners').select('*').order('sort_order',{ascending:true});
    if(res.error) return;
    var areas=bannerAreas();
    var rows=(res.data||[]).filter(function(b){return areas.indexOf(b.display_area)>=0;});
    if(!rows.length) return;
    var dismissedKey='kamarDismissedBanners_'+CTX;
    var dismissed=[];
    try{dismissed=JSON.parse(sessionStorage.getItem(dismissedKey)||'[]');}catch(e){}
    rows=rows.filter(function(b){return dismissed.indexOf(b.id)<0;});
    if(!rows.length) return;
    var b=rows[0];
    var isTop=(b.display_style||'topbar')==='topbar';
    var wrap=document.createElement('div');
    wrap.className='kamar-banner '+(isTop?'kamar-banner-topbar':'kamar-banner-card');
    wrap.innerHTML='<div class="kamar-banner-inner"><div class="kamar-banner-text"><strong>'+esc(b.title)+'</strong>'+(b.body?'<span>'+esc(b.body)+'</span>':'')+'</div><div class="kamar-banner-actions">'+(b.cta_url?'<a class="kamar-banner-cta" href="'+esc(b.cta_url)+'" target="_blank" rel="noopener">'+esc(b.cta_label||'Selengkapnya')+'</a>':'')+'<button type="button" class="kamar-banner-close" aria-label="Tutup pengumuman">&times;</button></div></div>';
    mount.innerHTML='';
    mount.appendChild(wrap);
    var closeBtn=wrap.querySelector('.kamar-banner-close');
    if(closeBtn){
      closeBtn.addEventListener('click',function(){
        wrap.remove();
        dismissed.push(b.id);
        try{sessionStorage.setItem(dismissedKey,JSON.stringify(dismissed));}catch(e){}
      });
    }
  }catch(e){}
}

// ---------------- Videos ----------------
function extractYoutubeId(url,fallbackId){
  if(fallbackId) return fallbackId;
  url=String(url||'');
  var m=url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/);
  if(m) return m[1];
  m=url.match(/[?&]v=([A-Za-z0-9_-]{11})/);
  return m?m[1]:'';
}
async function renderVideos(c, access){
  var section=document.getElementById('kamarVideoSection');
  var mount=document.getElementById('kamarVideoGrid');
  if(!section||!mount) return;
  if(CTX==='affiliate') return;
  try{
    var res=await c.from('videos').select('*').eq('is_active',true).eq('publish_status','published').order('sort_order',{ascending:true});
    if(res.error) return;
    var areas=bannerAreas();
    var rows=(res.data||[]).filter(function(v){return areas.indexOf(v.display_area)>=0 && accessAllowed(v.access_required, access);});
    if(!rows.length) return;
    mount.innerHTML=rows.map(function(v){
      var yid=extractYoutubeId(v.youtube_url, v.youtube_video_id);
      var thumb=yid?('https://img.youtube.com/vi/'+yid+'/hqdefault.jpg'):'';
      return '<article class="kamar-content-card">'
        +(thumb?('<a class="kamar-content-thumb" href="'+esc(v.youtube_url||'#')+'" target="_blank" rel="noopener"><img src="'+esc(thumb)+'" alt="'+esc(v.title)+'" loading="lazy"/><span class="kamar-content-play">&#9654;</span></a>'):'<div class="kamar-content-thumb kamar-content-thumb-empty">&#9654;</div>')
        +'<div class="kamar-content-body">'
        +(v.category?('<span class="kamar-content-tag">'+esc(v.category)+'</span>'):'')
        +'<h3>'+esc(v.title)+'</h3>'
        +(v.description?('<p>'+esc(v.description)+'</p>'):'')
        +'<a class="btn btn-secondary" href="'+esc(v.youtube_url||'#')+'" target="_blank" rel="noopener">Tonton di YouTube</a>'
        +'</div></article>';
    }).join('');
    section.hidden=false;
    section.removeAttribute('style');
  }catch(e){}
}

// ---------------- Materials & Tools ----------------
var FILE_TYPE_LABEL={indicator:'Indikator',robot:'Robot EA',template:'Template',pdf:'PDF',other:'File'};
async function renderMaterials(c, access){
  var section=document.getElementById('kamarMaterialSection');
  var mount=document.getElementById('kamarMaterialGrid');
  if(!section||!mount) return;
  if(CTX==='affiliate') return;
  try{
    var matRes=await c.from('materials').select('*').eq('is_active',true).eq('publish_status','published').order('sort_order',{ascending:true});
    var toolRes=await c.from('tools_files').select('*').eq('is_active',true).eq('publish_status','published').order('sort_order',{ascending:true});
    var mats=((matRes && !matRes.error)?(matRes.data||[]):[]).filter(function(m){return accessAllowed(m.access_required, access);}).map(function(m){return {kind:'material', title:m.title, description:m.description, category:m.category, url:m.material_url, version:m.version_label};});
    var tools=((toolRes && !toolRes.error)?(toolRes.data||[]):[]).filter(function(t){return accessAllowed(t.access_required, access);}).map(function(t){return {kind:'tool', title:t.title, description:t.changelog, category:FILE_TYPE_LABEL[t.file_type]||'Tools', url:t.file_url, version:t.version_label};});
    var rows=mats.concat(tools);
    if(!rows.length) return;
    mount.innerHTML=rows.map(function(r){
      return '<article class="kamar-content-card kamar-material-card">'
        +'<div class="kamar-content-body">'
        +'<span class="kamar-content-tag">'+esc(r.category||(r.kind==='tool'?'Tools':'Materi'))+'</span>'
        +'<h3>'+esc(r.title)+'</h3>'
        +(r.description?('<p>'+esc(r.description)+'</p>'):'')
        +(r.version?('<small class="kamar-content-version">Versi '+esc(r.version)+'</small>'):'')
        +'<a class="btn btn-secondary" href="'+esc(r.url||'#')+'" target="_blank" rel="noopener">'+(r.kind==='tool'?'Unduh File':'Buka Materi')+'</a>'
        +'</div></article>';
    }).join('');
    section.hidden=false;
    section.removeAttribute('style');
  }catch(e){}
}

async function init(){
  var c=await client();
  if(!c) return;
  var access=await fetchMemberAccess(c);
  renderBanner(c);
  renderVideos(c, access);
  renderMaterials(c, access);
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
