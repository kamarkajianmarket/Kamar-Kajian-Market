/* KAMAR MEMBER PAGES V2 - halaman Perpanjang/Tambah Fasilitas + Profil Akun (tampilan modern) */
(function(){
  'use strict';
  if(window.__KMP2__) return; window.__KMP2__=true;
  var P=(location.pathname.split('/').pop()||'').toLowerCase();
  if(P!=='member-renewal.html'&&P!=='member-profile.html') return;

  var CSS=[
  '@keyframes kmShimmer{0%{background-position:0 0}100%{background-position:-220% 0}}@keyframes kmPulse{0%,100%{box-shadow:0 0 0 1px rgba(255,170,140,.55),0 6px 20px rgba(255,70,90,.35)}50%{box-shadow:0 0 0 1px rgba(255,170,140,.8),0 8px 28px rgba(255,70,90,.6)}}',
  '.kx-sec-title{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin:2px 4px 14px}.kx-sec-title h2{margin:0!important;font-size:20px;color:#fff3d8!important;-webkit-text-fill-color:#fff3d8!important}.kx-sec-title p{margin:0!important;font-size:13px;color:#a99d82!important}',
  '.kx-facs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}',
  '.kx-fac{position:relative;display:flex;flex-direction:column;gap:8px;border:1px solid rgba(238,206,122,.18);border-radius:24px;padding:20px;background:linear-gradient(160deg,rgba(255,255,255,.05),rgba(255,255,255,.015));text-decoration:none!important;color:inherit;transition:.22s;overflow:hidden;min-height:210px}',
  '.kx-fac:before{content:"";position:absolute;inset:0;background:radial-gradient(420px 160px at 100% 0%,rgba(212,166,63,.14),transparent 60%);pointer-events:none}',
  '.kx-fac:hover{transform:translateY(-4px);border-color:rgba(244,223,144,.6);box-shadow:0 18px 40px rgba(0,0,0,.35),0 0 0 1px rgba(244,223,144,.2)}',
  '.kx-fac.on{border-color:rgba(158,255,202,.35)}',
  '.kx-ic{width:46px;height:46px;border-radius:15px;display:grid;place-items:center;background:rgba(244,223,144,.12);color:#f4df90;position:relative}.kx-ic svg{width:23px;height:23px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}',
  '.kx-nm{font-size:19px;font-weight:1000;color:#fff3d8;line-height:1.2;position:relative}',
  '.kx-ds{font-size:13px;color:#a99d82;line-height:1.5;position:relative;flex:1}',
  '.kx-st{font-size:12.5px;font-weight:800;color:#a99d82;position:relative}.kx-st b{color:#9effca}.kx-st b.w{color:#ffd582}.kx-st b.x{color:#ffb4b4}',
  '.kx-pr{font-size:13px;color:#d8cda9;position:relative}.kx-pr b{font-size:17px;color:#f4df90}',
  '.kx-go{display:flex;align-items:center;justify-content:space-between;margin-top:4px;padding:11px 14px;border-radius:999px;background:linear-gradient(135deg,#f4df90,#c69a39);color:#171108;font-weight:900;font-size:13.5px;position:relative}',
  '.kx-fac.on .kx-go{background:rgba(255,255,255,.06);color:#f4df90;border:1px solid rgba(238,206,122,.3)}',
  '.kx-hot{position:absolute;top:14px;right:14px;z-index:3;display:inline-flex;align-items:center;padding:6px 13px;border-radius:999px;font-size:11px;font-weight:900;letter-spacing:.09em;text-transform:uppercase;color:#fff;background:linear-gradient(110deg,#ff6a3d 0%,#ff2e63 45%,#ff9a3d 55%,#ff2e63 100%);background-size:220% 100%;box-shadow:0 0 0 1px rgba(255,170,140,.55),0 6px 20px rgba(255,70,90,.45);animation:kmShimmer 2.4s linear infinite,kmPulse 1.8s ease-in-out infinite}',
  '.kx-feat{position:absolute;top:14px;right:14px;z-index:3;display:inline-flex;align-items:center;padding:6px 13px;border-radius:999px;font-size:11px;font-weight:900;letter-spacing:.09em;text-transform:uppercase;color:#171108;background:linear-gradient(135deg,#f4df90,#d4a63f);box-shadow:0 6px 18px rgba(212,166,63,.35)}',
  '.kx-prem{position:absolute;top:14px;right:14px;z-index:3;display:inline-flex;align-items:center;padding:6px 13px;border-radius:999px;font-size:11px;font-weight:900;letter-spacing:.09em;text-transform:uppercase;color:#fff;background:linear-gradient(135deg,#8a5bd0,#5b34a3);box-shadow:0 6px 18px rgba(123,79,179,.45)}',
  '.kx-chip{display:inline-flex;align-self:flex-start;padding:4px 11px;border-radius:999px;font-size:11px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;color:#f4df90;border:1px solid rgba(244,223,144,.45);background:rgba(244,223,144,.08);position:relative}',
  '.kx-note{margin-top:14px;color:#a99d82;font-size:13px;line-height:1.55;text-align:center}',
  '#payment-mayar>.mini-label,#payment-mayar>h2,#payment-mayar>p,#payment-mayar .facility-guide-box,#payment-mayar .payment-note-box,#payment-mayar .member-payment-grid{display:none!important}',
  '.kx-hero{position:relative;overflow:hidden;border:1px solid rgba(244,223,144,.3);border-radius:30px;padding:28px 32px;background:radial-gradient(900px 300px at 100% 0%,rgba(212,166,63,.2),transparent 60%),linear-gradient(135deg,rgba(255,255,255,.05),rgba(255,255,255,.015));display:flex;gap:22px;align-items:center;flex-wrap:wrap}',
  '.kx-av{width:84px;height:84px;border-radius:26px;display:grid;place-items:center;font-size:34px;font-weight:1000;color:#171108;background:linear-gradient(135deg,#f4df90,#c69a39);box-shadow:0 12px 30px rgba(212,166,63,.3);flex:0 0 84px}',
  '.kx-hn{font-size:clamp(24px,3vw,34px);font-weight:1000;color:#fff3d8;line-height:1.1}.kx-hs{color:#a99d82;margin-top:4px;font-size:14px}',
  '.kx-pills{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.kx-pill{display:inline-flex;padding:6px 13px;border-radius:999px;border:1px solid rgba(238,206,122,.25);background:rgba(0,0,0,.25);font-size:12.5px;font-weight:800;color:#e8dfc9}.kx-pill.ok{color:#9effca;border-color:rgba(158,255,202,.3);background:rgba(28,97,65,.14)}.kx-pill.warn{color:#ffd582;border-color:rgba(255,213,130,.35)}',
  '.kx-info{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}',
  '.kx-card{border:1px solid rgba(238,206,122,.18);border-radius:24px;padding:20px 22px;background:linear-gradient(135deg,rgba(255,255,255,.04),rgba(255,255,255,.015))}.kx-card h3{margin:0 0 12px!important;font-size:12px!important;letter-spacing:.18em;text-transform:uppercase;color:#d8cda9!important;-webkit-text-fill-color:#d8cda9!important}',
  '.kx-row{display:flex;justify-content:space-between;gap:14px;padding:10px 0;border-bottom:1px dashed rgba(238,206,122,.14);font-size:14px}.kx-row:last-child{border:0}.kx-row span{color:#a99d82}.kx-row b{color:#fff3d8;text-align:right;word-break:break-word}',
  '@media(max-width:980px){.kx-facs{grid-template-columns:repeat(2,minmax(0,1fr))}.kx-info{grid-template-columns:1fr}}',
  '@media(max-width:620px){.kx-facs{grid-template-columns:1fr}.kx-hero{padding:20px 18px;border-radius:24px}.kx-av{width:64px;height:64px;flex-basis:64px;font-size:26px;border-radius:20px}}'
  ].join('\n');

  var ICON={
    book:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    pulse:'<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
    cpu:'<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3"/>',
    radio:'<path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/>',
    cap:'<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>'
  };
  var FACS=[
    {k:'materi_edukasi',n:'Kamar Edukasi',ic:'cap',d:'Materi dan panduan edukasi dasar trading dan investasi.',href:'member-edukasi-daftar.html',free:1,chip:'Gratis · Selamanya',page:'member-materials.html'},
    {k:'kamar_study',n:'Kamar Signal',ic:'radio',d:'Signal trading dengan penjelasan zona dan area penting.',href:'member-signal-activate-select.html',page:'member-study.html',badge:'feat',bt:'Populer'},
    {k:'kamar_private',n:'Kamar E-Book',ic:'book',d:'E-Book 20 chapter terstruktur plus Free Mentoring. Akses selamanya.',href:'member-checkout.html?facility=ebook',page:'member-private.html',badge:'prem',bt:'Premium',pk:'kamar_private',chip:'Free Mentoring'},
    {k:'kamar_indikator',n:'Kamar Indikator',ic:'pulse',d:'Indikator zona Kamar untuk membaca struktur dan area penting market.',href:'member-checkout.html?facility=indikator',page:'member-indicator.html',pk:'kamar_indikator'},
    {k:'kamar_robot',n:'Kamar Robot',ic:'cpu',d:'Trading otomatis berbasis logika Kamar, siap bekerja mengikuti market.',href:'member-checkout.html?facility=robot',page:'member-robot.html',badge:'hot',bt:'Paling Dicari',pk:'kamar_robot',chip:'Trading Otomatis'}
  ];
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function rp(n){return 'Rp'+Number(n||0).toLocaleString('id-ID');}
  function fmt(d){try{return new Date(d).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'});}catch(e){return '-';}}
  function client(){return (window.KamarSupabase&&window.KamarSupabase.ready)?window.KamarSupabase.ready():Promise.resolve(window.kamarSupabaseClient||null);}
  async function ctx(){
    var c=await client(); if(!c) return null;
    var s=await c.auth.getSession(); var u=s&&s.data&&s.data.session&&s.data.session.user; if(!u) return null;
    var p=(await c.from('member_profiles').select('*').eq('user_id',u.id).maybeSingle()).data;
    var a=p?((await c.from('member_access').select('*').eq('profile_id',p.id).maybeSingle()).data||{}):{};
    return {c:c,u:u,p:p||{},a:a};
  }
  function css(){var s=document.createElement('style');s.id='kmp2-css';s.textContent=CSS;document.head.appendChild(s);}
  function facStatus(a,k){
    var on=!!a['access_'+k], ex=a['expires_'+k];
    if(!on) return {on:false,t:'Belum aktif'};
    if(!ex) return {on:true,t:'<b>Aktif</b> · Selamanya'};
    var d=Math.ceil((new Date(ex).getTime()-Date.now())/86400000);
    if(d<0) return {on:false,t:'<b class="x">Berakhir</b> '+fmt(ex)};
    if(d<=7) return {on:true,t:'<b class="w">Sisa '+d+' hari</b> · s.d. '+fmt(ex)};
    return {on:true,t:'<b>Aktif</b> · s.d. '+fmt(ex)};
  }

  async function renewal(){
    var sec=document.getElementById('payment-mayar'); if(!sec) return;
    var x=await ctx(); if(!x) return; var a=x.a;
    var prices={};
    try{
      var r=await x.c.from('payment_products').select('facility_key,promo_price,base_price,is_active').eq('is_active',true).eq('product_type','facility_access');
      (r.data||[]).forEach(function(p){var v=Number(p.promo_price||p.base_price);if(!prices[p.facility_key]||v<prices[p.facility_key]) prices[p.facility_key]=v;});
    }catch(e){}
    var hidden={};
    try{var ds=await x.c.from('dashboard_settings').select('key,is_active');(ds.data||[]).forEach(function(r){if(r.is_active===false) hidden[r.key]=1;});}catch(e){}
    var h='<div class="kx-sec-title"><h2>Pilih Fasilitas</h2><p>Klik kartu untuk membeli atau memperpanjang.</p></div><div class="kx-facs">';
    FACS.forEach(function(f){
      if(hidden[f.k]) return;
      var st=facStatus(a,f.k); if(f.free){st=a['access_'+f.k]?{on:true,t:'<b>Aktif</b> · Selamanya'}:{on:false,t:'Belum aktif'};}
      var badge=f.badge==='hot'?'<span class="kx-hot">'+f.bt+'</span>':(f.badge==='feat'?'<span class="kx-feat">'+f.bt+'</span>':(f.badge==='prem'?'<span class="kx-prem">'+f.bt+'</span>':''));
      h+='<a class="kx-fac'+(st.on?' on':'')+'" href="'+((f.free&&st.on)?f.page:f.href)+'">'+badge+'<span class="kx-ic"><svg viewBox="0 0 24 24">'+ICON[f.ic]+'</svg></span><span class="kx-nm">'+f.n+'</span>'+(f.chip?'<span class="kx-chip">'+f.chip+'</span>':'')+'<span class="kx-ds">'+f.d+'</span><span class="kx-st">'+st.t+'</span>'+(f.pk&&prices[f.pk]?'<span class="kx-pr">Mulai <b>'+rp(prices[f.pk])+'</b></span>':'')+'<span class="kx-go"><span>'+(f.free?(st.on?'Buka':'Daftar Gratis'):(st.on?'Perpanjang':'Aktifkan'))+'</span><span>→</span></span></a>';
    });
    h+='</div><div class="kx-note">Harga fasilitas Kamar dapat naik sewaktu-waktu. Jangan lewatkan kesempatan Anda! Akses aktif setelah pembayaran terkonfirmasi.</div>';
    var box=document.createElement('div');box.id='kxFacBox';box.innerHTML=h;
    var old=document.getElementById('kxFacBox'); if(old) old.remove();
    sec.appendChild(box);
  }

  async function profile(){
    var main=document.querySelector('.split-main'); if(!main||document.getElementById('kxHero')) return;
    var x=await ctx(); if(!x||!x.p||!x.p.id) return;
    var p=x.p,a=x.a;
    var name=p.full_name||'Member';
    var active=['materi_edukasi','kamar_study','kamar_private','kamar_indikator','kamar_robot'].filter(function(k){return facStatus(a,k).on;});
    var hero=document.createElement('section');hero.id='kxHero';hero.className='kx-hero';
    var stt=String(p.account_status||'').toLowerCase();
    hero.innerHTML='<div class="kx-av">'+esc(name.trim().charAt(0).toUpperCase())+'</div><div><div class="kx-hn">'+esc(name)+'</div><div class="kx-hs">'+esc(p.email||'')+'</div><div class="kx-pills"><span class="kx-pill">ID '+esc(p.member_id||'-')+'</span><span class="kx-pill ok">'+(stt.indexOf('aktif')>=0||stt==='active'?'Akun Aktif':esc(p.account_status||'Akun'))+'</span><span class="kx-pill '+(p.telegram_chat_id?'ok':'warn')+'">Telegram '+(p.telegram_chat_id?'Terhubung':'Belum terhubung')+'</span></div></div>';
    var info=document.createElement('section');info.id='kxInfo';info.className='kx-info';
    function row(l,v){return '<div class="kx-row"><span>'+l+'</span><b>'+(v==null||v===''?'-':esc(v))+'</b></div>';}
    info.innerHTML=
      '<div class="kx-card"><h3>Identitas</h3>'+row('Nama lengkap',p.full_name)+row('ID Member',p.member_id)+row('Bergabung',p.created_at?fmt(p.created_at):'-')+row('Kode referral',p.referral_code||'Tidak ada')+'</div>'+
      '<div class="kx-card"><h3>Kontak</h3>'+row('Email',p.email)+row('WhatsApp',p.whatsapp)+row('Telegram',p.telegram_username?('@'+String(p.telegram_username).replace(/^@/,'')):'-')+'</div>'+
      '<div class="kx-card"><h3>Membership</h3>'+row('Status akun',p.account_status)+row('Fasilitas aktif',active.length?active.length+' dari 5':'Belum ada')+row('Akses sampai',p.access_end_date?fmt(p.access_end_date):'-')+'</div>'+
      '<div class="kx-card"><h3>Trading Profile</h3>'+row('Broker',p.broker_name_other||p.broker_name)+row('Kisaran modal',p.capital_range)+'</div>';
    var first=main.firstElementChild;
    main.insertBefore(info,first&&first.nextSibling);
    main.insertBefore(hero,main.firstChild);
    var st=document.createElement('style');st.id='kmp2-prof-hide';
    st.textContent='body .split-main>.kd-pagehero{display:none!important}body .split-main .kamar-rc[data-kcr-key="identitas"],body .split-main .kamar-rc[data-kcr-key="kontak"],body .split-main .kamar-rc[data-kcr-key="membership"],body .split-main .kamar-rc[data-kcr-key="trading profile"]{display:none!important}';
    document.head.appendChild(st);
  }

  function init(){
    css();
    if(P==='member-renewal.html') renewal().catch(function(){});
    else profile().catch(function(){});
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',function(){setTimeout(init,300);}); else setTimeout(init,300);
})();
