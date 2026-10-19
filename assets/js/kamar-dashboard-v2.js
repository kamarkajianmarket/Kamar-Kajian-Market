/* KAMAR DASHBOARD V2 - tampilan baru dashboard member (hero, status fasilitas, aksi cepat, layout grid) */
(function(){
  'use strict';
  if(window.__KD2__) return; window.__KD2__=true;
  if(!/dashboard\.html$|\/dashboard$/.test(location.pathname)) return;
  document.documentElement.classList.add('kd2');

  var CSS=[
  '.kd2 .kamar-title-card,.kd2 #memberFacilityGuideCard{display:none!important}',
  '.kd2 .split-main>section.split-card:not([id]):not(.kamar-profile-access-card){display:none!important}',
  '.kd2 .split-main{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:18px!important;align-items:start}',
  '.kd2 .split-main>*{grid-column:span 1}',
  '.kd2 #kd2Hero,.kd2 #kd2Fac,.kd2 #kd2Quick,.kd2 #kamarVideoSection,.kd2 #kamarMaterialSection{grid-column:1/-1}',
  '.kd2 #kd2Hero{order:0}.kd2 #kd2Fac{order:1}.kd2 #kd2Quick{order:2}.kd2 #kamarRecapDashboardCard{order:3}.kd2 #kamarSignalFreeDashboardCard{order:4}.kd2 #fasilitasKhususTeaser{order:5}.kd2 .kamar-profile-access-card{order:6}.kd2 #kamarVideoSection{order:7}.kd2 #kamarMaterialSection{order:8}',
  '.kd2 .split-main>.split-card{border-radius:24px!important;padding:20px 22px!important}',
  '.kd2 .kd-hero{position:relative;overflow:hidden;border:1px solid rgba(244,223,144,.28);border-radius:30px;padding:30px 32px;background:radial-gradient(900px 300px at 100% 0%,rgba(212,166,63,.20),transparent 60%),linear-gradient(135deg,rgba(255,255,255,.05),rgba(255,255,255,.015))}',
  '.kd2 .kd-hero-top{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;flex-wrap:wrap}',
  '.kd2 .kd-eyebrow{font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:#d8cda9;font-weight:900}',
  '.kd2 h1.kd-name,.kd2 .kd-name{color:#fff3d8!important;-webkit-text-fill-color:#fff3d8!important;background:none!important;margin:6px 0 10px;font-size:clamp(26px,3.4vw,40px);line-height:1.1;color:#fff3d8;font-weight:1000;letter-spacing:.01em}',
  '.kd2 .kd-chips{display:flex;flex-wrap:wrap;gap:8px}',
  '.kd2 .kd-chip{display:inline-flex;align-items:center;gap:6px;border:1px solid rgba(238,206,122,.22);background:rgba(0,0,0,.25);border-radius:999px;padding:7px 13px;font-size:12.5px;font-weight:800;color:#e8dfc9}',
  '.kd2 .kd-chip.ok{color:#9effca;border-color:rgba(158,255,202,.3);background:rgba(28,97,65,.14)}',
  '.kd2 .kd-chip.warn{color:#ffd582;border-color:rgba(255,213,130,.35);background:rgba(255,198,86,.08)}',
  '.kd2 .kd-chip.off{color:#aaa393}',
  '.kd2 .kd-btns{display:flex;gap:10px;flex-wrap:wrap}',
  '.kd2 .kd-btn{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 20px;border-radius:999px;font-weight:900;font-size:14px;text-decoration:none;border:1px solid rgba(238,206,122,.3);color:#f4df90;background:rgba(255,255,255,.05);white-space:nowrap}',
  '.kd2 .kd-btn.pri{background:linear-gradient(135deg,#f4df90,#c69a39);color:#171108;border:0}',
  '.kd2 .kd-btn:hover{filter:brightness(1.1)}',
  '.kd2 .kd-sec-title{display:flex;justify-content:space-between;align-items:baseline;margin:2px 4px 12px}.kd2 .kd-sec-title h2{margin:0;font-size:18px;color:#fff3d8!important;-webkit-text-fill-color:#fff3d8!important;letter-spacing:.02em}.kd2 .kd-sec-title a{font-size:13px;font-weight:800;color:#f4df90;text-decoration:none}',
  '.kd2 .kd-facs{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}',
  '.kd2 .kd-fac{display:flex;flex-direction:column;gap:8px;border:1px solid rgba(238,206,122,.16);border-radius:20px;padding:16px;background:rgba(255,255,255,.025);text-decoration:none;color:inherit;transition:.2s}',
  '.kd2 .kd-fac:hover{transform:translateY(-2px);border-color:rgba(244,223,144,.45)}',
  '.kd2 .kd-fac.on{border-color:rgba(244,223,144,.34);background:linear-gradient(160deg,rgba(212,166,63,.12),rgba(255,255,255,.02))}',
  '.kd2 .kd-ic{width:40px;height:40px;border-radius:13px;display:grid;place-items:center;background:rgba(244,223,144,.12);color:#f4df90}.kd2 .kd-fac:not(.on) .kd-ic{background:rgba(255,255,255,.06);color:#8d8473}',
  '.kd2 .kd-ic svg{width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}',
  '.kd2 .kd-fn{font-weight:900;color:#fff3d8;font-size:15px;line-height:1.25}',
  '.kd2 .kd-fs{font-size:12.5px;color:#a99d82;line-height:1.4;min-height:34px}',
  '.kd2 .kd-fs b{color:#9effca}.kd2 .kd-fs b.w{color:#ffd582}.kd2 .kd-fs b.x{color:#ffb4b4}',
  '.kd2 .kd-fa{margin-top:auto;font-size:12.5px;font-weight:900;color:#f4df90}',
  '.kd2 .kd-fac:not(.on) .kd-fa{color:#171108;background:linear-gradient(135deg,#f4df90,#c69a39);border-radius:999px;text-align:center;padding:8px 10px}',
  '.kd2 .kd-quick{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}',
  '.kd2 .kd-q{display:flex;flex-direction:column;gap:3px;border:1px solid rgba(238,206,122,.16);border-radius:18px;padding:14px 16px;background:rgba(255,255,255,.025);text-decoration:none;transition:.2s}.kd2 .kd-q:hover{border-color:rgba(244,223,144,.45);transform:translateY(-2px)}',
  '.kd2 .kd-q b{color:#fff3d8;font-size:14.5px}.kd2 .kd-q span{color:#a99d82;font-size:12.5px;line-height:1.4}',
  '.kd2 .split-sidebar{padding:16px!important}',
  '.kd2 .split-sidebar>a,.kd2 .split-sidebar summary{border-radius:14px!important}',
  '@media(max-width:1100px){.kd2 .kd-facs{grid-template-columns:repeat(3,minmax(0,1fr))}.kd2 .kd-quick{grid-template-columns:repeat(2,minmax(0,1fr))}}',
  '@media(max-width:900px){.kd2 .split-main{grid-template-columns:1fr!important}.kd2 .split-main>*{grid-column:1/-1}.kd2 .kd-hero{padding:22px 18px;border-radius:24px}.kd2 .kd-btns{width:100%}.kd2 .kd-btn{flex:1}}',
  '@media(max-width:640px){.kd2 .kd-facs{display:flex;overflow-x:auto;gap:10px;padding-bottom:6px;scroll-snap-type:x mandatory}.kd2 .kd-fac{min-width:168px;scroll-snap-align:start}.kd2 .kd-quick{grid-template-columns:1fr 1fr}}'
  ].join('\n');

  var ICON={
    book:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    pulse:'<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
    cpu:'<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3"/>',
    radio:'<path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/>',
    cap:'<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>'
  };
  var FACS=[
    {k:'materi_edukasi',n:'Kamar Edukasi',ic:'cap',page:'member-materials.html',buy:'member-renewal.html'},
    {k:'kamar_study',n:'Kamar Signal',ic:'radio',page:'member-study.html',buy:'member-renewal.html'},
    {k:'kamar_private',n:'Kamar E-Book',ic:'book',page:'member-private.html',buy:'member-checkout.html?facility=ebook'},
    {k:'kamar_indikator',n:'Kamar Indikator',ic:'pulse',page:'member-indicator.html',buy:'member-checkout.html?facility=indikator'},
    {k:'kamar_robot',n:'Kamar Robot',ic:'cpu',page:'member-robot.html',buy:'member-checkout.html?facility=robot'}
  ];
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function fmt(d){try{return new Date(d).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'});}catch(e){return '';}}
  function client(){
    if(window.KamarSupabase&&window.KamarSupabase.ready) return window.KamarSupabase.ready();
    return Promise.resolve(window.kamarSupabaseClient||null);
  }
  function css(){var s=document.createElement('style');s.id='kd2-css';s.textContent=CSS;document.head.appendChild(s);}

  function build(){
    var main=document.querySelector('.split-main'); if(!main||document.getElementById('kd2Hero')) return null;
    var hero=document.createElement('section');hero.id='kd2Hero';hero.className='kd-hero';
    hero.innerHTML='<div class="kd-hero-top"><div><div class="kd-eyebrow">Dashboard Member</div><h1 class="kd-name" id="kd2Name">Selamat datang</h1><div class="kd-chips" id="kd2Chips"><span class="kd-chip off">Memuat…</span></div></div><div class="kd-btns"><a class="kd-btn pri" href="member-catalog.html">Katalog Produk</a><a class="kd-btn" href="member-renewal.html">Perpanjang / Tambah</a></div></div>';
    var fac=document.createElement('section');fac.id='kd2Fac';
    fac.innerHTML='<div class="kd-sec-title"><h2>Status Fasilitas</h2><a href="member-renewal.html">Kelola →</a></div><div class="kd-facs" id="kd2Facs"></div>';
    var q=document.createElement('section');q.id='kd2Quick';
    q.innerHTML='<div class="kd-sec-title"><h2>Aksi Cepat</h2></div><div class="kd-quick"><a class="kd-q" href="member-catalog.html"><b>Katalog Produk</b><span>Lihat semua paket dan harga.</span></a><a class="kd-q" href="member-orders.html"><b>Riwayat Pembayaran</b><span>Status pesanan dan invoice.</span></a><a class="kd-q" href="member-fasilitas-khusus.html"><b>Fasilitas Khusus</b><span>Kelas dan fasilitas eksklusif.</span></a><a class="kd-q" href="member-profile.html"><b>Profil Akun</b><span>Data akun dan koneksi Telegram.</span></a></div>';
    main.insertBefore(q,main.firstChild);main.insertBefore(fac,main.firstChild);main.insertBefore(hero,main.firstChild);
    return true;
  }

  async function fill(){
    try{
      var c=await client(); if(!c) return;
      var s=await c.auth.getSession(); var u=s&&s.data&&s.data.session&&s.data.session.user; if(!u) return;
      var p=(await c.from('member_profiles').select('id,full_name,member_id,referral_code,account_status,role').eq('user_id',u.id).maybeSingle()).data;
      if(!p) return;
      var a=(await c.from('member_access').select('*').eq('profile_id',p.id).maybeSingle()).data||{};
      var nm=document.getElementById('kd2Name'); if(nm) nm.textContent='Halo, '+(p.full_name||'Kawan Kamar');
      var now=Date.now(),act=0,chips='';
      var html=FACS.map(function(f){
        var on=!!a['access_'+f.k], ex=a['expires_'+f.k], st='';
        if(on){
          if(ex){var d=Math.ceil((new Date(ex).getTime()-now)/86400000);
            if(d<0){on=false;st='<b class="x">Berakhir</b> '+fmt(ex);}
            else if(d<=7){st='<b class="w">Sisa '+d+' hari</b> · s.d. '+fmt(ex);}
            else{st='<b>Aktif</b> · s.d. '+fmt(ex);}
          }else{st='<b>Aktif</b> · Selamanya';}
        } else {st='Belum aktif';}
        if(on) act++;
        if(on&&f.k==='kamar_private'&&a.ebook_chapter_max) st='<b>Aktif</b> · Chapter 1–'+a.ebook_chapter_max;
        var href=on?f.page:f.buy;
        return '<a class="kd-fac'+(on?' on':'')+'" href="'+href+'"><span class="kd-ic"><svg viewBox="0 0 24 24">'+ICON[f.ic]+'</svg></span><span class="kd-fn">'+f.n+'</span><span class="kd-fs">'+st+'</span><span class="kd-fa">'+(on?'Buka →':(f.k==='materi_edukasi'||f.k==='kamar_study'?'Aktifkan':'Beli Paket'))+'</span></a>';
      }).join('');
      var box=document.getElementById('kd2Facs'); if(box) box.innerHTML=html;
      var chipsEl=document.getElementById('kd2Chips');
      if(chipsEl){
        chips='<span class="kd-chip">ID '+esc(p.member_id||'-')+'</span>';
        chips+='<span class="kd-chip '+(act?'ok':'off')+'">'+(act?act+' fasilitas aktif':'Belum ada fasilitas berbayar')+'</span>';
        chips+='<span class="kd-chip">Referral: '+esc(p.referral_code||'Tidak ada')+'</span>';
        chipsEl.innerHTML=chips;
      }
    }catch(e){var ch=document.getElementById('kd2Chips'); if(ch) ch.innerHTML='<span class="kd-chip warn">Data belum dapat dimuat</span>';}
  }

  function init(){css(); if(build()) fill();}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
