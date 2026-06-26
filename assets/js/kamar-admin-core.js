
(function(){
  "use strict";
  const FACILITIES=[
    ["access_kamar_study","Kamar Study"],["access_materi_edukasi","Materi Edukasi"],["access_kamar_private","Kamar Private"],["access_kamar_indikator","Kamar Indikator"],["access_kamar_robot","Kamar Robot"]
  ];
  const STATUS={active:"Aktif",pending_activation:"Pending Aktivasi",expired:"Expired",suspended:"Suspended",confirmed:"Confirmed",pending:"Pending",rejected:"Rejected",done:"Done",new:"New",processing:"Processing"};
  function client(){ if(!window.kamarSupabase) throw new Error(window.KAMAR_SUPABASE_ERROR||"Supabase belum siap."); return window.kamarSupabase; }
  function page(){ return (location.pathname.split('/').pop()||'admin.html'); }
  function esc(v){ return String(v??'').replace(/[&<>'"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[m])); }
  function fmtDate(v){ if(!v) return '-'; try{return new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(v));}catch(e){return String(v);} }
  function fmtMoney(v){ if(v===null||v===undefined||v==='') return '-'; try{return new Intl.NumberFormat('id-ID').format(Number(v));}catch(e){return esc(v);} }
  function toast(m){ if(window.toast) window.toast(m); else console.log(m); }
  function pill(v){ const key=String(v||'').toLowerCase(); const cls=key==='active'||key==='confirmed'||key==='done'||key==='published'?'on':(key.includes('pending')||key==='new'||key==='draft'?'warn':'off'); return `<span class="kamar-pill ${cls}">${esc(STATUS[key]||v||'-')}</span>`; }
  function activeFacilities(a){ if(!a) return '-'; return FACILITIES.filter(([k])=>a[k]).map(([,l])=>l).join(', ')||'-'; }
  function statusBox(msg,type='info'){ return `<div class="${type==='error'?'expired-note':'page-note'}"><strong>${type==='error'?'Perlu Dicek':'Status'}</strong><br/>${esc(msg)}</div>`; }
  function main(){ return document.querySelector('.split-main')||document.querySelector('main')||document.body; }
  function setLoading(el,msg){ if(el) el.innerHTML=`<section class="split-card">${statusBox(msg||'Memuat data Supabase...')}</section>`; }
  async function myAdminEmail(){ try{ const p=await window.KamarAuth.getMyProfile(); return p && p.email || 'kamarkajianmarket@gmail.com'; }catch(e){return 'kamarkajianmarket@gmail.com';} }
  async function count(table, filter){ let q=client().from(table).select('*',{count:'exact',head:true}); if(filter) q=filter(q); const {count,error}=await q; if(error) throw error; return count||0; }
  async function getMembers(){
    const {data:profiles,error}=await client().from('member_profiles').select('id,member_id,full_name,email,whatsapp,telegram_username,role,account_status,payment_status,access_start_date,access_end_date,created_at').order('created_at',{ascending:false}).limit(500);
    if(error) throw error;
    const ids=(profiles||[]).map(x=>x.id);
    let access=[]; if(ids.length){ const r=await client().from('member_access').select('profile_id,access_kamar_study,access_materi_edukasi,access_kamar_private,access_kamar_indikator,access_kamar_robot,locked_by_expired,locked_reason').in('profile_id',ids); if(r.error) throw r.error; access=r.data||[]; }
    const map=Object.fromEntries(access.map(a=>[a.profile_id,a]));
    return (profiles||[]).map(p=>({...p,access:map[p.id]||{}}));
  }
  async function loadDashboard(){
    const el=main(); setLoading(el,'Membaca ringkasan admin...');
    try{
      const [total,active,pending,todos]=await Promise.all([
        count('member_profiles'), count('member_profiles',q=>q.eq('account_status','active')), count('member_profiles',q=>q.eq('account_status','pending_activation')), client().from('admin_todos').select('id,todo_type,todo_status,title,description,created_at').order('created_at',{ascending:false}).limit(8)
      ]);
      const todoRows=(todos.data||[]).map(t=>`<div class="todo-item"><span>${esc(t.todo_type)}</span><h3>${esc(t.title)}</h3><p>${esc(t.description||'')}</p><small>${fmtDate(t.created_at)} · ${esc(t.todo_status)}</small></div>`).join('')||`<div class="kamar-empty">Belum ada To-Do admin.</div>`;
      el.innerHTML=`<section class="split-card"><span class="eyebrow">Dashboard Admin</span><h1>Dashboard Admin</h1><p>Ringkasan real dari Supabase untuk member, aktivasi, dan To-Do admin.</p></section><section class="grid-3"><div class="stat-card"><span>Total Member</span><strong>${total}</strong><small>Semua akun terdaftar</small></div><div class="stat-card"><span>Member Aktif</span><strong>${active}</strong><small>Status active</small></div><div class="stat-card"><span>Pending Aktivasi</span><strong>${pending}</strong><small>Menunggu admin</small></div></section><section class="split-card"><div class="kamar-section-head"><div><h2>To-Do Terbaru</h2><p>Data real dari admin_todos.</p></div><a class="btn secondary" href="admin-members.html">Lihat Member</a></div><div class="grid-2">${todoRows}</div></section>`;
    }catch(e){ el.innerHTML=`<section class="split-card">${statusBox(e.message,'error')}</section>`; }
  }
  function renderMemberTable(members, mount){
    const rows=members.map(m=>`<tr><td><strong>${esc(m.full_name||'-')}</strong><div class="kamar-muted">${esc(m.member_id||'-')}</div></td><td>${esc(m.email||'-')}<div class="kamar-muted">WA: ${esc(m.whatsapp||'-')} · TG: ${esc(m.telegram_username||'-')}</div></td><td>${pill(m.account_status)}<br/>${pill(m.payment_status)}</td><td>${fmtDate(m.access_end_date)}</td><td>${esc(activeFacilities(m.access))}</td><td><button class="btn mini secondary" data-admin-detail="${esc(m.id)}">Detail</button></td></tr>`).join('')||`<tr><td colspan="6"><div class="kamar-empty">Belum ada data member yang dapat dibaca.</div></td></tr>`;
    mount.innerHTML=`<table class="kamar-table"><thead><tr><th>Member</th><th>Kontak</th><th>Status</th><th>Akses Sampai</th><th>Fasilitas</th><th>Aksi</th></tr></thead><tbody>${rows}</tbody></table>`;
  }
  async function loadMembersPage(){
    const list=document.getElementById('adminMembersList')||main();
    const status=document.getElementById('adminMembersStatus');
    try{ const members=await getMembers(); if(status) status.innerHTML=`Member terbaca: ${members.length}`; renderMemberTable(members,list); document.addEventListener('click',e=>{ const id=e.target && e.target.dataset.adminDetail; if(!id) return; const m=members.find(x=>x.id===id); showMemberDetail(m); }); }
    catch(e){ list.innerHTML=statusBox(e.message,'error'); }
  }
  function showMemberDetail(m){
    const box=document.getElementById('adminMemberDetail'); if(!box||!m) return;
    box.innerHTML=`<div class="admin-detail-panel"><div class="setting-card"><span>Nama</span><strong>${esc(m.full_name)}</strong></div><div class="setting-card"><span>Member ID</span><strong>${esc(m.member_id)}</strong></div><div class="setting-card"><span>Email</span><strong>${esc(m.email)}</strong></div><div class="setting-card"><span>WhatsApp</span><strong>${esc(m.whatsapp||'-')}</strong></div><div class="setting-card"><span>Status</span><strong>${esc(m.account_status)} / ${esc(m.payment_status)}</strong></div><div class="setting-card"><span>Masa Akses</span><strong>${fmtDate(m.access_start_date)} - ${fmtDate(m.access_end_date)}</strong></div><div class="setting-card kamar-wide"><span>Fasilitas</span><strong>${esc(activeFacilities(m.access))}</strong><small>${esc(m.access.locked_reason||'')}</small></div></div>`;
  }
  async function updateMemberAccessFromForm(form){
    const email=form.querySelector('[name="target_email"]').value.trim();
    const days=parseInt(form.querySelector('[name="duration_days"]').value||'30',10);
    const note=(form.querySelector('[name="admin_note"]')||{}).value||'';
    const vals={}; FACILITIES.forEach(([k])=>{ vals[k]=!!form.querySelector(`[name="${k}"]`)?.checked; });
    if(!email) throw new Error('Email member wajib diisi.');
    const {data:profile,error:pErr}=await client().from('member_profiles').select('id,email').eq('email',email).maybeSingle(); if(pErr) throw pErr; if(!profile) throw new Error('Member tidak ditemukan.');
    const start=new Date(); const end=new Date(start.getTime()+days*86400000);
    const up1=await client().from('member_profiles').update({account_status:'active',payment_status:'confirmed',access_start_date:start.toISOString(),access_end_date:end.toISOString(),updated_at:new Date().toISOString()}).eq('id',profile.id); if(up1.error) throw up1.error;
    const accessPayload={profile_id:profile.id,...vals,locked_by_expired:false,locked_reason:null,updated_at:new Date().toISOString()};
    let up2=await client().from('member_access').update(accessPayload).eq('profile_id',profile.id); if(up2.error) throw up2.error;
    await client().from('admin_todos').update({todo_status:'done',admin_notes:note||'Diproses dari admin website.',updated_at:new Date().toISOString()}).eq('profile_id',profile.id).in('todo_status',['new','processing']);
    return {profile,start,end};
  }
  async function renderActivation(kind){
    const el=main();
    el.innerHTML=`<section class="split-card"><span class="eyebrow">${kind==='renewal'?'Renewal Member':'Aktivasi Akses'}</span><h1>${kind==='renewal'?'Renewal Member':'Aktivasi Akses'}</h1><p>Aktifkan status, masa akses, dan fasilitas member langsung dari database Supabase.</p></section><section class="split-card"><div id="adminActionStatus" class="page-note">Isi email member, durasi, dan fasilitas yang akan diaktifkan.</div><form id="adminAccessForm" class="admin-form-grid"><label class="field">Email Member<input name="target_email" placeholder="email member" required></label><label class="field">Durasi Hari<input name="duration_days" type="number" min="1" value="30" required></label><label class="field kamar-wide">Catatan Admin<textarea name="admin_note" placeholder="Catatan aktivasi/renewal"></textarea></label><div class="kamar-wide grid-3">${FACILITIES.map(([k,l])=>`<label class="checkbox-line"><input type="checkbox" name="${k}" ${k==='access_kamar_study'?'checked':''}> <span>${l}</span></label>`).join('')}</div><div class="button-row kamar-wide"><button class="btn" type="submit">Simpan Aktivasi</button><a class="btn secondary" href="admin-members.html">Data Member</a></div></form></section><section class="split-card"><div class="kamar-section-head"><div><h2>Member Pending</h2><p>Daftar pendaftar yang belum aktif.</p></div></div><div id="pendingMembersBox">Memuat...</div></section>`;
    const form=document.getElementById('adminAccessForm'), st=document.getElementById('adminActionStatus');
    form.addEventListener('submit',async e=>{e.preventDefault(); st.className='page-note'; st.textContent='Memproses aktivasi...'; try{ const r=await updateMemberAccessFromForm(form); st.innerHTML=`<strong>Berhasil</strong><br/>Member ${esc(r.profile.email)} aktif sampai ${fmtDate(r.end)}.`; }catch(err){st.className='expired-note'; st.innerHTML=`<strong>Gagal</strong><br/>${esc(err.message)}`;} });
    try{ const members=(await getMembers()).filter(m=>m.account_status==='pending_activation'||m.payment_status==='pending'); renderMemberTable(members,document.getElementById('pendingMembersBox')); }catch(e){document.getElementById('pendingMembersBox').innerHTML=statusBox(e.message,'error');}
  }
  async function renderMaintenance(){
    const el=main(); el.innerHTML=`<section class="split-card"><span class="eyebrow">Maintenance</span><h1>Maintenance Fasilitas</h1><p>ON/OFF status maintenance berdasarkan tabel maintenance_settings.</p></section><section class="split-card" id="maintenanceBox">Memuat...</section>`;
    const box=document.getElementById('maintenanceBox');
    try{ const {data,error}=await client().from('maintenance_settings').select('*').order('maintenance_key'); if(error) throw error; box.innerHTML=(data||[]).map(x=>`<div class="toggle-row"><div><span>${esc(x.title||x.maintenance_key)}</span><small>${esc(x.description||x.message||'')}</small></div><input type="checkbox" data-maintenance="${esc(x.maintenance_key)}" ${x.is_active?'checked':''}></div>`).join('')||`<div class="kamar-empty">Belum ada data maintenance.</div>`; box.querySelectorAll('[data-maintenance]').forEach(inp=>inp.addEventListener('change',async()=>{const {error}=await client().from('maintenance_settings').update({is_active:inp.checked,updated_at:new Date().toISOString()}).eq('maintenance_key',inp.dataset.maintenance); if(error){toast(error.message); inp.checked=!inp.checked;} else toast('Maintenance diperbarui.');})); }catch(e){box.innerHTML=statusBox(e.message,'error');}
  }
  async function renderSiteSettings(type){
    const map={links:['social_links','Link Resmi'],payment:['payment_links','Payment Gateway'],settings:['brand','Pengaturan Umum'],page:['brand','Kontrol Halaman Utama'],dash:['study_rules','Kontrol Dashboard Member']}; const [key,title]=map[type]||map.settings;
    const el=main(); el.innerHTML=`<section class="split-card"><span class="eyebrow">${esc(title)}</span><h1>${esc(title)}</h1><p>Data membaca dan menyimpan ke tabel site_settings.</p></section><section class="split-card"><div id="settingsStatus" class="page-note">Memuat setting ${esc(key)}...</div><label class="field">JSON Setting<textarea id="settingJson" spellcheck="false"></textarea></label><div class="button-row"><button id="saveSettingBtn" class="btn">Simpan Setting</button></div></section>`;
    const ta=document.getElementById('settingJson'), st=document.getElementById('settingsStatus');
    try{ const {data,error}=await client().from('site_settings').select('*').eq('setting_key',key).maybeSingle(); if(error) throw error; ta.value=JSON.stringify((data&&data.setting_value)||{},null,2); st.innerHTML=`<strong>Setting terbaca:</strong> ${esc(key)}`; }catch(e){st.className='expired-note'; st.innerHTML=`<strong>Gagal Membaca</strong><br/>${esc(e.message)}`;}
    document.getElementById('saveSettingBtn').onclick=async()=>{try{const val=JSON.parse(ta.value||'{}'); let r=await client().from('site_settings').update({setting_value:val,updated_at:new Date().toISOString(),is_active:true}).eq('setting_key',key); if(r.error) throw r.error; st.className='page-note'; st.innerHTML='<strong>Berhasil</strong><br/>Setting disimpan.';}catch(e){st.className='expired-note'; st.innerHTML=`<strong>Gagal</strong><br/>${esc(e.message)}`;}};
  }
  async function renderContentPage(kind){
    const cfg={banner:['banners','Banner Pengumuman'],video:['videos','Konten Video'],materials:['materials','Konten & Materi'],tools:['tools_files','File Tools'],study:['signals','Kamar Study Control']}; const [table,title]=cfg[kind];
    const el=main(); el.innerHTML=`<section class="split-card"><span class="eyebrow">${esc(title)}</span><h1>${esc(title)}</h1><p>Membaca data real dari tabel ${esc(table)}. Form tambah/edit detail akan dirapikan pada fase final setelah semua alur stabil.</p></section><section class="split-card"><div class="kamar-section-head"><div><h2>Data Tersimpan</h2><p>Daftar terakhir dari Supabase.</p></div><button id="refreshContent" class="btn secondary">Refresh</button></div><div id="contentList">Memuat...</div></section>`;
    async function load(){ const box=document.getElementById('contentList'); try{ const {data,error}=await client().from(table).select('*').order('created_at',{ascending:false}).limit(50); if(error) throw error; box.innerHTML=`<table class="kamar-table"><thead><tr><th>Judul/Key</th><th>Status</th><th>Area/Akses</th><th>Update</th></tr></thead><tbody>${(data||[]).map(x=>`<tr><td><strong>${esc(x.title||x.setting_key||x.id_zona||x.id||'-')}</strong><div class="kamar-muted">${esc(x.description||x.body||x.category||x.pair||'')}</div></td><td>${pill(x.publish_status||x.status||x.is_active===false?'inactive':'active')}</td><td>${esc(x.display_area||x.access_required||x.timeframe||'-')}</td><td>${fmtDate(x.updated_at||x.created_at)}</td></tr>`).join('')||'<tr><td colspan="4"><div class="kamar-empty">Belum ada data.</div></td></tr>'}</tbody></table>`; }catch(e){box.innerHTML=statusBox(e.message,'error');} }
    document.getElementById('refreshContent').onclick=load; load();
  }
  async function boot(){
    const p=page();
    if(p==='admin.html') return loadDashboard();
    if(p==='admin-members.html') return loadMembersPage();
    if(p==='admin-activation.html') return renderActivation('activation');
    if(p==='admin-renewal.html') return renderActivation('renewal');
    if(p==='admin-maintenance.html') return renderMaintenance();
    if(p==='admin-links.html') return renderSiteSettings('links');
    if(p==='admin-payment.html') return renderSiteSettings('payment');
    if(p==='admin-settings.html') return renderSiteSettings('settings');
    if(p==='admin-page-control.html') return renderSiteSettings('page');
    if(p==='admin-dashboard-control.html') return renderSiteSettings('dash');
    if(p==='admin-banner.html') return renderContentPage('banner');
    if(p==='admin-video.html') return renderContentPage('video');
    if(p==='admin-materials.html') return renderContentPage('materials');
    if(p==='admin-tools.html') return renderContentPage('tools');
    if(p==='admin-study-control.html') return renderContentPage('study');
  }
  document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>boot().catch(e=>{main().innerHTML=`<section class="split-card">${statusBox(e.message,'error')}</section>`;}),250));
})();
