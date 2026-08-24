(function(){
  'use strict';
  if(window.__KAMAR_DATA_ONLINE_25E__) return;
  window.__KAMAR_DATA_ONLINE_25E__ = true;
  var VERSION='30G';
  var FAC=['Kamar Edukasi','Kamar Signal','Kamar Private','Kamar Indikator','Kamar Robot'];
    var FAC_PAGES={'Kamar Edukasi':'member-materials.html','Kamar Signal':'member-study.html','Kamar Private':'member-private.html','Kamar Indikator':'member-indicator.html','Kamar Robot':'member-robot.html'};
    function unlockSidebarFacilities(){var f=(location.pathname.split('/').pop()||'').toLowerCase(); if(!/^(dashboard\.html$|member-)/.test(f))return; var m=findCurrentMember(); if(!m||!isActive(m)||m.locked_by_expired||m.is_expired_by_date)return; var fac=facilitiesOf(m).map(function(x){return norm(x)}); Object.keys(FAC_PAGES).forEach(function(name){ if(fac.indexOf(norm(name))<0)return; var href=FAC_PAGES[name]; qsa('a.disabled[href="'+href+'"]').forEach(function(a){ a.classList.remove('disabled'); a.removeAttribute('aria-disabled'); a.classList.add('kamar-facility-unlocked'); a.innerHTML=a.innerHTML.replace(/\s*🔒\s*$/,' <span class="kamar-unlock-badge">Aktif</span>'); }); }); }
    var FACILITY_ACCESS_COL={'member-materials.html':'access_materi_edukasi','member-study.html':'access_kamar_study','member-private.html':'access_kamar_private'};
    var FACILITY_DB_KEY={'member-materials.html':'materi_edukasi','member-study.html':'kamar_study','member-private.html':'kamar_private'};
    function facilityCardHTML(it,url){var ver=it.version_label?(' &middot; v'+esc(it.version_label)):''; var desc=it.description||it.changelog||''; return '<article class="facility-content-card"><h3>'+esc(it.title)+ver+'</h3>'+(desc?('<p>'+esc(desc)+'</p>'):'')+'<div class="button-row"><a class="btn mini" href="'+esc(url||'#')+'" target="_blank" rel="noopener">Download</a></div></article>';}
    async function fillFacilityContent(){
          var f=(location.pathname.split('/').pop()||'').toLowerCase();
          var accessCol=FACILITY_ACCESS_COL[f]; if(!accessCol)return;
          var box=el('memberContentList'); if(!box)return;
          var m=findCurrentMember();
          var unlocked=!!(m&&isActive(m)&&m[accessCol]===true&&!m.locked_by_expired&&!m.is_expired_by_date);
          if(!unlocked){ box.innerHTML='<div class="facility-locked-box"><span>Kamu belum memiliki akses ke fasilitas ini. Aktifkan dulu supaya bisa membuka materi dan tools di halaman ini.</span><a class="btn mini" href="member-renewal.html">Aktifkan Fasilitas</a></div>'; return; }
          if (f === 'member-study.html'){
            box.outerHTML = '<div class="split-card"><span class="eyebrow">Kamar Signal</span><h2>Kenapa Kamar Signal?</h2>'+
              '<div class="facility-content-grid">'+
              '<article class="facility-content-card"><h3>Real-time ke HP</h3><p>Signal terkirim otomatis dari EA ke dashboard dan notifikasi kamu \u2014 tidak perlu pantau chart manual sepanjang hari.</p></article>'+
              '<article class="facility-content-card"><h3>Status Signal Lengkap</h3><p>Setiap signal punya status jelas: FRESH \u2192 AKTIF \u2192 PROFIT/LOSS, lengkap dengan rekap performa per timeframe dan arsip otomatis untuk signal yang sudah selesai.</p></article>'+
              '<article class="facility-content-card"><h3>Notifikasi dan Telegram</h3><p>Push notification dan DM Telegram supaya kamu tahu begitu ada Signal Fresh baru. Integrasi Telegram sedang kami siapkan.</p><div class="button-row"><span class="btn mini disabled" aria-disabled="true">Segera Hadir</span></div></article>'+
              '</div></div>';
            return;
          }
          var dbKey=FACILITY_DB_KEY[f];
          var okAccess=['public','member',dbKey,'all_paid'];
          box.innerHTML='<div class="admin-empty-state">Memuat konten fasilitas...</div>';
          try{
                  var mats=await query('materials');
                  var tools=await query('tools_files');
                  var matList=mats.filter(function(x){return x.is_active&&x.publish_status==='published'&&okAccess.indexOf(x.access_required)>=0}).sort(function(a,b){return (a.sort_order||0)-(b.sort_order||0)});
                  var toolList=tools.filter(function(x){return x.is_active&&x.publish_status==='published'&&okAccess.indexOf(x.access_required)>=0}).sort(function(a,b){return (a.sort_order||0)-(b.sort_order||0)});
                  var html='<div class="facility-guide-box">Semua materi dan file di bawah ini bisa langsung diunduh. Kalau file tidak bisa dibuka, hubungi admin lewat menu Profil Akun.</div>';
                  html+='<div class="split-card"><span class="eyebrow">Download</span><h2>Materi &amp; Dokumen</h2><p>Materi, panduan, dan dokumen untuk fasilitas ini.</p>'+(matList.length?('<div class="facility-content-grid">'+matList.map(function(it){return facilityCardHTML(it,it.material_url)}).join('')+'</div>'):'<div class="admin-empty-state">Belum ada materi tersedia. Cek lagi nanti.</div>')+'</div>';
                  html+='<div class="split-card"><span class="eyebrow">Tools</span><h2>File Tools</h2><p>Indikator, robot/EA, template, dan file tools pendukung fasilitas ini.</p>'+(toolList.length?('<div class="facility-content-grid">'+toolList.map(function(it){return facilityCardHTML(it,it.file_url)}).join('')+'</div>'):'<div class="admin-empty-state">Belum ada file tools tersedia. Cek lagi nanti.</div>')+'</div>';
                  box.outerHTML=html;
          }catch(e){ box.innerHTML='<div class="expired-note">Gagal memuat konten: '+esc(e.message||String(e))+'</div>'; }
    }
  var state={client:null, viewRows:[], profileRows:[], accessRows:[], affiliateRows:[], members:[], internal:[], source:'init', error:''};

 function qs(s,r){return (r||document).querySelector(s)}
  function qsa(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
  function el(id){return document.getElementById(id)}
  function esc(v){return String(v==null?'':v).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  function norm(v){return String(v||'').trim().toLowerCase()}
  function getJSON(k,d){try{var r=localStorage.getItem(k); return r?JSON.parse(r):d}catch(e){return d}}
  function setJSON(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
  function pick(o,keys){o=o||{}; for(var i=0;i<keys.length;i++){var k=keys[i]; if(o[k]!==undefined&&o[k]!==null&&String(o[k]).trim()!=='')return o[k]} return ''}
  function emailOf(o){return String(pick(o,['email','member_email','user_email','account_email','login_email'])||'').trim()}
  function nameOf(o){return String(pick(o,['full_name','fullName','name','nama','display_name','member_name','username'])||emailOf(o)||'Member Kamar').trim()}
  function idOf(o){return String(pick(o,['member_id','memberId','member_code','memberCode','code','id','user_id','userId','profile_id','profileId'])||emailOf(o)||'').trim()}
  function waOf(o){return String(pick(o,['whatsapp','wa','phone','phone_number','nomor_wa','nomorWhatsapp'])||'-').trim()}
  function tgOf(o){return String(pick(o,['telegram','telegram_username','tg','username_telegram'])||'-').trim()}
  function brokerOf(o){var b=String(pick(o,['broker_name','brokerName'])||'').trim(); if(!b)return ''; if(norm(b)==='lainnya'){var other=String(pick(o,['broker_name_other','brokerNameOther'])||'').trim(); return other?('Lainnya - '+other):'Lainnya'} return b}
  function capitalOf(o){return String(pick(o,['capital_range','capitalRange'])||'').trim()}
  function statusRaw(o){return String([pick(o,['status','account_status','status_key','statusKey','approval_status','member_status','access_status']),pick(o,['is_active','active','confirmed','accountActive','account_active','isActive'])].join(' ')).toLowerCase()}
  function roleRaw(o){return String([pick(o,['role','user_role','account_role','type','account_type','member_type','category','level']),pick(o,['is_admin','admin','is_internal','internal']),emailOf(o),nameOf(o)].join(' ')).toLowerCase()}
  function looksUuid(v){return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v||'').trim())}
  function hasIdentity(o){var e=emailOf(o), n=norm(nameOf(o)), id=idOf(o); return !!(e||(n&&n!=='member kamar'&&!looksUuid(n)&&!looksUuid(id))||waOf(o)!=='-'||tgOf(o)!=='-')}
  function isGhost(o){var e=emailOf(o), n=norm(nameOf(o)), id=idOf(o); return !e && (n==='member kamar'&&looksUuid(id) || !hasIdentity(o))}
  function isInternal(o){var r=roleRaw(o); return /admin|internal|owner|superadmin|staff|team/.test(r)||norm(emailOf(o))==='kamarkajianmarket@gmail.com'||norm(nameOf(o))==='kamarkajianmarket'||norm(idOf(o))==='kamarkajianmarket'}
  function isActive(o){return /active|aktif|approved|confirm|confirmed|true|1|gratis|paid|lunas/.test(statusRaw(o))}
  function isPending(o){var s=statusRaw(o); return !isActive(o)&&(/pending|menunggu|wait|unconfirm|false|0/.test(s)||!s.trim())}
  function expiryOf(o){return pick(o,['access_end_date','access_until','expired_at','expires_at','access_expired_at','valid_until','end_date','expiry_date'])||'-'}
  function fmtAccessDate(iso){if(!iso||iso==='-')return '-';var d=new Date(iso);if(isNaN(d.getTime()))return '-';var bulan=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];return d.getDate()+' '+bulan[d.getMonth()]+' '+d.getFullYear();}
  function referralOf(o){return String(pick(o,['referral_code','referralCode','used_referral_code','usedReferralCode','affiliate_code','affiliateCode','kode_referral','kodeReferral','referred_by_code','referredByCode'])||'').trim()}
  function facilitiesOf(o){
    var v=pick(o,['facilities','facility','active_facilities','facility_names','access_names','access']);
    if(Array.isArray(v)) return v.filter(Boolean);
    if(typeof v==='string'&&v.trim()){
      try{var j=JSON.parse(v); if(Array.isArray(j)) return j.filter(Boolean); if(j&&typeof j==='object') return Object.keys(j).filter(function(k){return !!j[k]}).map(function(k){return k.replace(/_/g,' ')})}catch(e){}
      return v.split(',').map(function(x){return x.trim()}).filter(Boolean);
    }
    var out=[];
    [['access_materi_edukasi','Kamar Edukasi'],['access_kamar_study','Kamar Signal'],['access_kamar_private','Kamar Private'],['access_kamar_indikator','Kamar Indikator'],['access_kamar_robot','Kamar Robot']].forEach(function(p){var val=o[p[0]]; if(val===true||val==='true'||val===1||val==='1'||norm(val)==='active'||norm(val)==='aktif')out.push(p[1])});    return out;
  }
  function cfg(){var c=window.KAMAR_CONFIG||window.KamarConfig||window.kamarConfig||window.kamarConfigPublic||{};return {url:c.supabaseUrl||c.SUPABASE_URL||c.url||window.KAMAR_SUPABASE_URL||window.SUPABASE_URL||'',key:c.supabaseAnonKey||c.SUPABASE_ANON_KEY||c.anonKey||c.key||window.KAMAR_SUPABASE_ANON_KEY||window.SUPABASE_ANON_KEY||''}}
  function existingClient(){return window.kamarSupabaseClient||window.KamarSupabaseClient||(window.KamarSupabase&&window.KamarSupabase.client)||(window.KamarSB&&window.KamarSB.client)||(window.kamarSupabase&&window.kamarSupabase.client)||(window.KAMAR_SUPABASE&&window.KAMAR_SUPABASE.client)||null}
  function client(){if(state.client)return state.client; var ex=existingClient(); if(ex){state.client=ex; return ex} var c=cfg(); if(window.supabase&&window.supabase.createClient&&c.url&&c.key){try{state.client=window.supabase.createClient(c.url.replace(/\/rest\/v1\/?$/,''),c.key); window.kamarSupabaseClient=state.client; return state.client}catch(e){state.error='Gagal membuat Supabase client: '+e.message}} if(!c.url||!c.key) state.error='Supabase config tidak terbaca di browser.'; return null}
  async function clientReady(){try{if(window.KAMAR_CONFIG_READY) await window.KAMAR_CONFIG_READY;}catch(e){} try{if(window.KamarSupabase&&window.KamarSupabase.ready){var c=await window.KamarSupabase.ready(); if(c){state.client=c; return c;}}}catch(e){state.error='KamarSupabase.ready gagal: '+(e.message||e)} return client();}
  function timeout(p,ms){return Promise.race([Promise.resolve(p),new Promise(function(_,rej){setTimeout(function(){rej(new Error('timeout'))},ms||12000)})])}
  async function query(table){var c=await clientReady(); if(!c) throw new Error(state.error||'Supabase client tidak tersedia'); var res=await timeout(c.from(table).select('*').limit(1000),14000); if(res.error) throw res.error; return res.data||[]}
  function rowKey(r){return norm(emailOf(r)||pick(r,['user_id','profile_id','id','member_id','memberId'])||idOf(r))}
  function merge(){var map={}; function add(r,src){if(!r)return; var k=rowKey(r); if(!k)return; if(!map[k])map[k]=Object.assign({_sources:[]},r); else Object.assign(map[k],r); map[k]._sources.push(src)}; Array.prototype.slice.call(arguments).forEach(function(arg){(arg.rows||[]).forEach(function(r){add(r,arg.src)})}); return Object.keys(map).map(function(k){var m=map[k]; m._merge_key=k; return m})}
  async function loadAll(){
    state.error=''; state.source='Supabase';
    try{ state.viewRows=await query('admin_member_overview'); }catch(e){state.viewRows=[]; state.error+=' admin_member_overview: '+e.message+';'}
    try{ state.profileRows=await query('member_profiles'); }catch(e){state.profileRows=[]; state.error+=' member_profiles: '+e.message+';'}
    try{ state.accessRows=await query('member_access'); }catch(e){state.accessRows=[];}
    try{ state.affiliateRows=await query('affiliates'); }catch(e){state.affiliateRows=getJSON('kamarAffiliateList',[]);}
    var merged=merge({rows:state.viewRows,src:'view'},{rows:state.profileRows,src:'profile'},{rows:state.accessRows,src:'access'});
        state.accessRows.forEach(function(a){var pid=norm(a.profile_id||''); if(!pid)return; var m=merged.find(function(x){return norm(pick(x,['profile_id','id']))===pid}); if(m) Object.assign(m,a);});
    if(!merged.length){ merged=getJSON('kamarRegisteredMembers',[]); state.source='localStorage'; }
    state.members=merged.filter(function(m){return !isInternal(m)&&!isGhost(m)&&hasIdentity(m)});
    state.internal=merged.filter(function(m){return isInternal(m)&&!isGhost(m)});
    return state;
  }
  function statusBadge(){var ok=(state.viewRows.length||state.profileRows.length); if(ok)return '<span class="status-pill on">Terhubung</span>'; if(state.error)return '<span class="status-pill warn">Belum terhubung</span>'; return '<span class="status-pill off">Data lokal</span>'}
  function dbLine(){return statusBadge()+(state.error?'<div class="admin-empty-state" style="margin-top:10px">'+esc(state.error)+'</div>':'')}
  function session(role){var keys=role==='admin'?['kamarAdminSession','KAMAR_ADMIN_SESSION','kamarCurrentAdmin','kamarCurrentUser']:['kamarMemberSession','KAMAR_MEMBER_SESSION','kamarCurrentMember','kamarCurrentUser']; for(var i=0;i<keys.length;i++){var s=getJSON(keys[i],null); if(s&&(role!=='admin'||norm(s.role||'admin').indexOf('member')<0))return s} return null}
  function findCurrentMember(){var s=session('member')||{}; var em=norm(emailOf(s)||s.email); var mid=norm(idOf(s)||s.memberId||s.id); var row=state.members.find(function(m){return (em&&norm(emailOf(m))===em)||(mid&&norm(idOf(m))===mid)||(mid&&norm(pick(m,['user_id','profile_id','id']))===mid)}) || s; if(row&&emailOf(row)){var newS=Object.assign({},s,row,{fullName:nameOf(row),email:emailOf(row),memberId:idOf(row)}); setJSON('kamarMemberSession',newS); setJSON('KAMAR_MEMBER_SESSION',newS)} return row; }
  function setText(id,v){var x=el(id); if(x)x.textContent=v===''?'-':String(v||'-')}
  function memberDetailsHTML(m){var fac=facilitiesOf(m); return '<div class="admin-detail-panel">'+
    '<div class="setting-card"><span>Nama</span><strong>'+esc(nameOf(m))+'</strong></div>'+
    '<div class="setting-card"><span>Email</span><strong>'+esc(emailOf(m)||'-')+'</strong></div>'+
    '<div class="setting-card"><span>Member ID</span><strong>'+esc(idOf(m)||'-')+'</strong></div>'+
    '<div class="setting-card"><span>WhatsApp</span><strong>'+esc(waOf(m))+'</strong></div>'+
    '<div class="setting-card"><span>Telegram</span><strong>'+esc(tgOf(m))+'</strong></div>'+
    '<div class="setting-card"><span>Status</span><strong>'+(isActive(m)?'Aktif':isPending(m)?'Pending':'Belum Aktif')+'</strong></div>'+
    '<div class="setting-card"><span>Masa Akses</span><strong>'+esc(expiryOf(m))+'</strong></div>'+
    '<div class="setting-card"><span>Referral</span><strong>'+esc(referralOf(m)||'-')+'</strong></div>'+
    '<div class="setting-card"><span>Broker</span><strong>'+esc(brokerOf(m)||'-')+'</strong></div>'+
    '<div class="setting-card"><span>Modal</span><strong>'+esc(capitalOf(m)||'-')+'</strong></div>'+
    '<div class="setting-card" style="grid-column:1/-1"><span>Fasilitas Aktif</span><strong>'+esc(fac.length?fac.join(', '):'Belum ada fasilitas aktif')+'</strong></div>'+
    '</div>'; }
  function fillMemberDashboard(){
if((location.pathname.split('/').pop()||'').toLowerCase()!=='dashboard.html')return;
var m=findCurrentMember(); if(!m)return;
var __isMaster=(emailOf(m)||'').toLowerCase()==='supermaster@akun.kamar';
setText('memberWelcomeTitle', __isMaster ? 'SELAMAT DATANG MASTER' : ('Selamat datang, '+nameOf(m)+'.'));
setText('memberWelcomeText','ID: '+(idOf(m)||'-'));
var ref=referralOf(m)||'Tidak ada';
var refLine=el('memberReferralLine'); if(refLine)refLine.textContent='Referral: '+ref;
var status=el('memberStatusBox');
if(status){
var fac=facilitiesOf(m);
var facText=fac.length?fac.join(', '):'Belum ada fasilitas berbayar aktif.';
var active=isActive(m), pending=isPending(m);
var title=active?'Member Aktif':pending?'Menunggu Persetujuan Admin':'Akun Belum Aktif';
var extra=active?('Fasilitas aktif: '+facText):(pending?'Akun kamu sudah terdaftar, tetapi belum disetujui admin.':'Akun kamu belum aktif. Hubungi admin jika ini tidak sesuai.');
status.innerHTML='<strong>'+esc(title)+'</strong><br/>'+esc(extra)+'<br/>Kode referral: '+esc(ref);
}
var line=el('memberSessionLine'); if(line)line.innerHTML='Login sebagai: '+esc(emailOf(m)||'-')+'<br>'+dbLine();
var hero=qs('.hero')||qs('.split-main'); if(hero&&!el('memberOnlineDetailCard')){var d=document.createElement('div');d.className='card';d.id='memberOnlineDetailCard';d.innerHTML='<span class="eyebrow">Detail Akun Online</span>'+memberDetailsHTML(m);(hero.classList.contains('split-main')?hero.appendChild(d):hero.insertAdjacentElement('afterend',d))}
}
  function fillMemberProfile(){if(!/member-profile\.html$/i.test(location.pathname))return; var m=findCurrentMember(); if(!m)return; setText('profileFullName',nameOf(m)); setText('profileMemberId',idOf(m)); setText('profileEmail',emailOf(m)); setText('profileWhatsapp',waOf(m)); setText('profileTelegram',tgOf(m)); setText('profileStatus',isActive(m)?'Aktif':isPending(m)?'Pending Aktivasi':'Belum Aktif'); setText('profileAccessDate',fmtAccessDate(expiryOf(m))); setText('profileFacilities',facilitiesOf(m).join(', ')||'Belum ada fasilitas aktif'); setText('profileReferralCode',referralOf(m)||'-'); setText('profileBroker',brokerOf(m)||'-'); setText('profileModal',capitalOf(m)||'-'); var cur=el('profileReferralCurrentCode'); if(cur)cur.textContent='REFERRAL: '+(referralOf(m)||'-'); var input=el('memberReferralInput'); if(input&&referralOf(m))input.value=referralOf(m); try{document.dispatchEvent(new CustomEvent('kamarProfileLoaded',{detail:{member:m}}))}catch(e){} var title=qs('.kamar-title-card'); if(title&&!el('memberOnlineStatus25e')){var p=document.createElement('div');p.id='memberOnlineStatus25e';p.className='button-row';p.innerHTML=dbLine();title.appendChild(p)} }
  function fillAdminDashboard(){if(!/admin\.html$/i.test(location.pathname))return; setText('totalMember',state.members.length); setText('internalAccount',state.internal.length); setText('totalAffiliate',state.affiliateRows.length||0); var line=el('adminSessionLine'); if(line)line.innerHTML=(line.textContent||'')+'<br>'+dbLine(); var main=qs('.main')||qs('.split-main'); if(main&&!el('adminRecentMembers25e')){var recent=state.members.slice(0,6); var h='<div class="card" id="adminRecentMembers25e"><span class="eyebrow">Member Terbaru / Terbaca Database</span><div class="admin-member-list">'; if(!recent.length)h+='<div class="admin-empty-state">Belum ada data member terbaca. Cek koneksi DB melalui menu Cek Koneksi DB.</div>'; recent.forEach(function(m){h+='<div class="admin-member-card"><div><h3>'+esc(nameOf(m))+'</h3><p>'+esc(emailOf(m)||'-')+'</p><div class="member-meta"><span class="kamar-chip">'+esc(idOf(m)||'-')+'</span>'+(isActive(m)?'<span class="kamar-chip on">Aktif</span>':'<span class="kamar-chip warn">Pending/Belum Aktif</span>')+'</div></div><div><p>WA: '+esc(waOf(m))+'</p><p>Fasilitas: '+esc(facilitiesOf(m).join(', ')||'-')+'</p></div><div class="admin-member-actions"><a class="btn mini" href="admin-members.html?v='+VERSION+'">Detail</a></div></div>'}); h+='</div></div>'; main.insertAdjacentHTML('beforeend',h)} }
  function statusLabel(m){return isActive(m)?'<span class="status-pill on">Aktif</span>':isPending(m)?'<span class="status-pill warn">Pending</span>':'<span class="status-pill off">Belum Aktif</span>'}
  function fillAdminMembers(){if(!/(admin-members|admin-internal)\.html$/i.test(location.pathname))return; var isInt=/admin-internal\.html$/i.test(location.pathname); var rows=isInt?state.internal:state.members; var list=rows.slice(); var wrap=el('adminMembersList'); var count=el('adminMemberCount'); var pending=el('adminPendingCount'); if(count)count.textContent=(isInt?'Akun Internal: ':'Total Member: ')+rows.length; if(pending)pending.textContent='Pending: '+rows.filter(isPending).length; if(!wrap)return; function render(){var q=norm(el('adminMemberSearch')&&el('adminMemberSearch').value); var st=(el('adminMemberStatusFilter')||{}).value||'all'; var ff=(el('adminMemberFacilityFilter')||{}).value||'all'; var arr=rows.filter(function(m){var txt=norm([nameOf(m),emailOf(m),idOf(m),waOf(m),tgOf(m),referralOf(m)].join(' ')); var ok=!q||txt.indexOf(q)>=0; if(st==='active')ok=ok&&isActive(m); if(st==='pending')ok=ok&&isPending(m); if(st==='suspended')ok=ok&&!isActive(m)&&!isPending(m); var fac=facilitiesOf(m); if(ff==='none')ok=ok&&!fac.length; else if(ff!=='all')ok=ok&&fac.indexOf(ff)>=0; return ok}); if(count)count.textContent=(isInt?'Akun Internal: ':'Total Member: ')+rows.length+' | Tampil: '+arr.length; var h='<div class="button-row" style="margin-bottom:14px">'+dbLine()+'</div><div class="admin-row header"><div>'+(isInt?'Akun Internal':'Member')+'</div><div>Kontak</div><div>Status</div><div>Akses Sampai</div><div>Fasilitas</div><div>Aksi</div></div>'; if(!arr.length)h+='<div class="admin-empty-state">Tidak ada data member sesuai filter. '+esc(state.error||'')+'</div>'; arr.forEach(function(m,i){var key=esc(rowKey(m)); h+='<div class="admin-row row-collapsed" data-toggle-row><div><strong>'+esc(nameOf(m))+'</strong><small>'+esc(idOf(m)||'-')+'</small></div><div>'+esc(emailOf(m)||'-')+'<small class="admin-row-hide">WA: '+esc(waOf(m))+' · TG: '+esc(tgOf(m))+'</small></div><div>'+statusLabel(m)+'</div><div class="admin-row-hide">'+esc(expiryOf(m))+'</div><div class="admin-row-hide">'+esc(facilitiesOf(m).join(', ')||'Belum ada fasilitas aktif')+'</div><div class="admin-row-actions"><button class="btn mini secondary" data-detail-key="'+key+'" type="button">Detail</button><a class="btn mini" href="admin-activation.html?email='+encodeURIComponent(emailOf(m)||'')+'&member='+encodeURIComponent(idOf(m)||'')+'&v='+VERSION+'">Kelola</a></div></div>'; }); wrap.innerHTML=h; qsa('[data-toggle-row]',wrap).forEach(function(row){row.addEventListener('click',function(e){if(e.target.closest('a,button'))return;row.classList.toggle('row-collapsed')})}); qsa('[data-detail-key]',wrap).forEach(function(b){b.onclick=function(){showDetail(b.getAttribute('data-detail-key'))}})} function showDetail(k){var m=rows.find(function(r){return rowKey(r)===k}); if(!m)return; var w=el('adminMemberDetailWrap'), t=el('adminMemberDetailTitle'), d=el('adminMemberDetail'); if(t)t.textContent='Detail Member — '+nameOf(m); if(d)d.innerHTML=memberDetailsHTML(m)+'<div class="button-row"><a class="btn" href="admin-activation.html?email='+encodeURIComponent(emailOf(m)||'')+'&member='+encodeURIComponent(idOf(m)||'')+'&v='+VERSION+'">Kelola Akses</a><button class="btn secondary" id="closeMemberDetail25e" type="button">Tutup Detail</button></div>'; if(w){w.classList.remove('hidden'); w.scrollIntoView({behavior:'smooth',block:'start'})} var c=el('closeMemberDetail25e'); if(c)c.onclick=function(){if(w)w.classList.add('hidden')}} ['adminMemberSearch','adminMemberStatusFilter','adminMemberFacilityFilter'].forEach(function(id){var x=el(id); if(x)x.addEventListener(id==='adminMemberSearch'?'input':'change',render)}); var r=el('adminMemberRefresh'); if(r)r.onclick=function(){location.reload()}; render(); var ref=el('adminMemberReferralBody'); if(ref){if(isInt){ref.innerHTML='<div class="admin-empty-state">Akun internal dipisahkan dari statistik member dan referral.</div>';return;} var refs=rows.filter(referralOf); ref.innerHTML=refs.length?refs.map(function(m){return '<div class="admin-row"><div><strong>'+esc(nameOf(m))+'</strong><small>'+esc(emailOf(m))+'</small></div><div>Kode Referral</div><div>'+esc(referralOf(m))+'</div></div>'}).join(''):'<div class="admin-empty-state">Belum ada member dengan kode referral terbaca.</div>'} }
  function affiliateMenuPage(){var p=(location.pathname.split('/').pop()||'').toLowerCase(); return p==='dashboard.html'||/^member-/.test(p)||p==='affiliate-dashboard.html';}
  async function injectAffiliateMenu(){
    try{
      if(!affiliateMenuPage()) return;
      var sidebar=qs('.split-sidebar');
      if(!sidebar) return;
      if(sidebar.querySelector('[data-kamar-affiliate-menu]')) return;
      var c=await clientReady();
      if(!c) return;
      var res=await timeout(c.from('affiliates').select('approval_status,is_active').limit(1),10000);
      var row=(res&&res.data&&res.data[0])||null;
      var anchor=sidebar.querySelector('a[href="member-profile.html"]');
      if(!anchor) return;
      var p=(location.pathname.split('/').pop()||'').toLowerCase();
      var link=document.createElement('a');
      link.setAttribute('data-kamar-affiliate-menu','1');
      if(row&&row.approval_status==='APPROVED'&&row.is_active){
        link.href='affiliate-dashboard.html';
        link.textContent='Affiliate Program';
        if(p==='affiliate-dashboard.html') link.className='active';
      } else if(row&&row.approval_status==='PENDING_APPROVAL'){
        link.href='member-affiliate-activate.html';
        link.textContent='Affiliate (Menunggu)';
        if(p==='member-affiliate-activate.html') link.className='active';
      } else {
        link.href='member-affiliate-activate.html';
        link.textContent='Aktifkan Affiliate';
        if(p==='member-affiliate-activate.html') link.className='active';
      }
      anchor.parentNode.insertBefore(link,anchor);
    }catch(e){}
  }
  function injectMasterDualSidebar(){
try{
var sess=session('member')||session('admin')||{};
var email=(emailOf(sess)||'').toLowerCase();
if(email!=='supermaster@akun.kamar')return;
var sidebar=document.querySelector('.split-sidebar');
if(!sidebar||sidebar.hasAttribute('data-kamar-dual-sidebar'))return;
sidebar.setAttribute('data-kamar-dual-sidebar','1');
var path=(location.pathname.split('/').pop()||'').toLowerCase();
var isAdminPage=path.indexOf('admin')===0&&path!=='admin-login.html';
if(!document.getElementById('kamarMasterSidebarStyle')){
var st=document.createElement('style'); st.id='kamarMasterSidebarStyle';
st.textContent='.kamar-master-sidebar-divider{border:none;border-top:1px dashed rgba(184,138,61,.35);margin:14px 0}';
document.head.appendChild(st);
}
function appendHtml(html){
var div=document.createElement('div');
div.innerHTML='<hr class="kamar-master-sidebar-divider">'+html;
while(div.firstChild)sidebar.appendChild(div.firstChild);
}
if(isAdminPage){
fetch('/dashboard.html').then(function(r){return r.text();}).then(function(html){
var m=html.match(/<aside class="split-sidebar">([\s\S]*?)<\/aside>/);
if(!m)return;
var inner=m[1];
inner=inner.replace(/ class="disabled"/g,'').replace(/ aria-disabled="true"/g,'').replace(/\s*\uD83D\uDD12/g,'');
inner=inner.replace(' class="active"','');
inner=inner.replace(/<div class="brand-small">[^<]*<\/div>/,'<div class="brand-small">MENU MEMBER</div>');
inner=inner.replace(/<a[^>]*data-kamar-logout[^>]*>[\s\S]*?<\/a>/,'');
appendHtml(inner);
}).catch(function(){});
}else{
fetch('/assets/js/kamar-admin-online-29f.js').then(function(r){return r.text();}).then(function(js){
var marker='var SIDEBAR_SECTIONS =';
var start=js.indexOf(marker); if(start===-1)return;
start+=marker.length;
var i=js.indexOf('[',start),depth=0,end=-1;
for(var j=i;j<js.length;j++){var c=js[j]; if(c==='[')depth++; else if(c===']'){depth--; if(depth===0){end=j+1;break;}}}
var sections;
try{sections=new Function('return '+js.slice(i,end))();}catch(e){return;}
var html='<div class="brand-small">MENU ADMIN</div>';
sections.forEach(function(sec){
var items=sec.items.filter(function(it){return it[1]!=='Logout';});
if(!items.length)return;
var links=items.map(function(it){return '<a href="'+esc(it[0])+'">'+esc(it[1])+'</a>';}).join('');
if(items.length<=1){html+='<div class="admin-menu-section">'+esc(sec.label)+'</div>'+links;}
else{html+='<details><summary>'+esc(sec.label)+'</summary>'+links+'</details>';}
});
appendHtml(html);
}).catch(function(){});
}
}catch(e){}
}
  function attachLogoutOnly(){document.addEventListener('click',function(e){var a=e.target&&e.target.closest&&e.target.closest('[data-kamar-logout],a[href*="logout=1"]'); if(!a)return; e.preventDefault(); ['kamarMemberSession','KAMAR_MEMBER_SESSION','kamarAdminSession','KAMAR_ADMIN_SESSION','kamarCurrentUser'].forEach(function(k){try{localStorage.removeItem(k)}catch(x){}}); location.href='index.html?v='+VERSION;},true)}
  function showSkeletons(){
    var barIds=['memberWelcomeText','memberReferralLine'];
    barIds.forEach(function(id){ var x=el(id); if(x) x.innerHTML='<span class="kamar-skel-bar inline"></span>'; });
    var boxIds=['memberStatusBox','memberContentList'];
    boxIds.forEach(function(id){ var x=el(id); if(x) x.innerHTML='<div class="kamar-skel"><div class="kamar-skel-bar" style="width:70%"></div><div class="kamar-skel-bar" style="width:45%"></div></div>'; });
    var profileIds=['profileFullName','profileMemberId','profileEmail','profileWhatsapp','profileTelegram','profileStatus','profileAccessDate','profileFacilities','profileReferralCode','profileBroker','profileModal'];
    profileIds.forEach(function(id){ var x=el(id); if(x) x.innerHTML='<span class="kamar-skel-bar inline"></span>'; });
  }
  async function run(){attachLogoutOnly(); injectMasterDualSidebar(); var protectedPage=/admin|dashboard|member-/i.test(location.pathname); if(protectedPage){ showSkeletons(); try{await loadAll()}catch(e){state.error=e.message; state.source='error'} fillMemberDashboard(); fillMemberProfile(); fillAdminDashboard(); fillAdminMembers(); unlockSidebarFacilities(); fillFacilityContent(); injectAffiliateMenu(); } }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run); else run();
})();
