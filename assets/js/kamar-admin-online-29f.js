(function(){
  'use strict';
  if(window.__KAMAR_ADMIN_ONLINE_29F__) return; window.kamarFriendlyError=window.kamarFriendlyError||function(e){var raw=String((e&&e.message)||e||'');var low=raw.toLowerCase();if(!raw) return 'Terjadi kesalahan. Silakan coba lagi.';if(low.indexOf('duplicate key')>-1||low.indexOf('unique constraint')>-1) return 'Data ini sepertinya sudah pernah dikirim sebelumnya. Muat ulang halaman lalu coba lagi, atau hubungi admin bila masalah berlanjut.';if(low.indexOf('foreign key')>-1) return 'Data terkait tidak ditemukan. Muat ulang halaman lalu coba lagi.';if(low.indexOf('permission denied')>-1||low.indexOf('row-level security')>-1||low.indexOf(' rls')>-1) return 'Anda tidak memiliki izin untuk melakukan aksi ini. Hubungi admin bila ini seharusnya diizinkan.';if(low.indexOf('not-null')>-1) return 'Ada data wajib yang belum terisi. Periksa kembali formulir Anda.';if(low.indexOf('failed to fetch')>-1||low.indexOf('network')>-1||low.indexOf('load failed')>-1) return 'Koneksi internet bermasalah. Periksa koneksi Anda lalu coba lagi.';if(low.indexOf('jwt')>-1||low.indexOf('unauthorized')>-1||low.indexOf('401')>-1||low.indexOf('session')>-1) return 'Sesi login Anda sudah berakhir. Muat ulang halaman dan login kembali.';if(low.indexOf('timeout')>-1) return 'Permintaan memakan waktu terlalu lama. Coba lagi beberapa saat.';return 'Terjadi kesalahan saat memproses permintaan Anda. Coba lagi, atau hubungi admin bila masalah berlanjut.';};
  window.__KAMAR_ADMIN_ONLINE_29F__ = true;

  // FIXED (2026-08-08): window.toast used to silently resolve to the <div id="toast">
  // element itself (every admin page has one, e.g. admin.html's <div class="toast" id="toast">),
  // NOT a function. The old check below was `if(window.toast) return window.toast(msg)`,
  // and since a DOM element is truthy, that check passed and then crashed with
  // "window.toast is not a function" the instant it tried to call the div as a function.
  // That crash happened AFTER the real database update (Setujui/Tolak/Verifikasi etc.
  // already succeeded), but BEFORE renderActionCenter() could re-run - so the action
  // center looked "stuck"/unresponsive even though the change was really saved.
  // Fix: define a real window.toast function (only if one doesn't already exist) that
  // fills the existing #toast div and shows/hides it, and change every local toast()
  // helper below to check `typeof window.toast === 'function'` instead of truthiness.
  if(typeof window.toast !== 'function'){
    window.toast = function(msg){
      try{
        var el = document.getElementById('toast');
        if(!el){ alert(msg); return; }
        el.textContent = String(msg == null ? '' : msg);
        el.classList.add('show');
        clearTimeout(window.__kamarToastTimer29F);
        window.__kamarToastTimer29F = setTimeout(function(){ el.classList.remove('show'); }, 2600);
      }catch(e){ try{ alert(msg); }catch(e2){} }
    };
  }

  var PAGE = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  var VERSION = '29G';
  // NOTE (2026-08-01): admin-banner.html, admin-video.html, admin-materials.html
  // and admin-tools.html used to be empty placeholders, so this generic
  // "auto CRUD panel" was injected as a stopgap. All four now have their own
  // full, schema-accurate admin pages (correct field names, enums, guidance
  // text) built directly into the HTML, so this generic panel is removed for
  // them to avoid showing a second, incorrect, duplicate form on the page.
  var MAP = {
    'admin-payment.html': { table:'payment_gateways', title:'Payment Gateway Online', fields:['name','bank_name','account_name','account_number','instructions','is_active'] },
    'admin-links.html': { table:'link_settings', title:'Link Official Online', fields:['key','label','url','is_active'] },
    'admin-settings.html': { table:'app_settings', title:'Pengaturan Umum Online', fields:['key','value','description'] },
    'admin-maintenance.html': { table:'maintenance_settings', title:'Maintenance Online', fields:['key','enabled','message'] },
    'admin-page-control.html': { table:'homepage_settings', title:'Kontrol Halaman Utama Online', fields:['key','value','is_active'] },
    'admin-dashboard-control.html': { table:'dashboard_settings', title:'Kontrol Dashboard Member Online', fields:['key','value','is_active'] }
  };
  var CRITICAL_TABLES = ['admin_member_overview','member_profiles','member_access','payments','affiliates','affiliate_referrals','affiliate_commissions','banners','videos','materials','tools_files','homepage_settings','dashboard_settings','maintenance_settings','payment_gateways','link_settings','app_settings','admin_pending_todos'];

  // NEW (2026-08-01, konsistensi sidebar): setiap admin-*.html dulu punya
  // markup <aside class="split-sidebar"> hasil copy-paste sendiri-sendiri,
  // sehingga lama-lama isinya beda-beda antar halaman (link mati, urutan
  // beda, item hilang) - inilah sumber komplain "tampilan admin kacau/tidak
  // konsisten". SIDEBAR_SECTIONS ini SATU-SATUNYA sumber kebenaran menu admin.
  // rebuildSidebar() menimpa isi sidebar di SEMUA halaman admin dengan menu
  // yang identik, jadi tidak mungkin lagi beda antar halaman.
  var SIDEBAR_SECTIONS = [
    { label:'Utama', items:[ ['admin.html','Dashboard Admin'] ] },
    { label:'Member & Akses', items:[
      ['admin-members.html','Data Member'],
      ['admin-internal.html','Data Internal'],
      ['admin-activation.html','Aktivasi Akun & Fasilitas'],
            ['admin-license-requests.html','Request License']
      ] },
    { label:'Affiliate', items:[
      ['admin-affiliate-overview.html','Data Affiliate'],
      ['admin-affiliate-list.html','Daftar Affiliator'],
      ['admin-affiliate-payment.html','Pencairan Komisi'],
      ['admin-affiliate-commission-rate.html','Pengaturan Komisi'],
      ['admin-affiliate-reward.html','Reward / Komisi (Lama)']
      ] },
    { label:'Konten Website', items:[
      ['admin-banner.html','Banner Pengumuman'],
      ['admin-video.html','Konten Video'],
      ['admin-materials.html','Konten & Materi'],
      ['admin-tools.html','File Tools']
      ] },
    { label:'Kontrol Sistem', items:[
      ['admin-maintenance.html','Maintenance Fasilitas'],
      ['admin-page-control.html','Kontrol Halaman Utama'],
      ['admin-dashboard-control.html','Kontrol Dashboard Member'],
      ['admin-payment.html','Payment Gateway'],
      ['admin-payment-products.html','Katalog Harga & Produk'],
      ['admin-links.html','Pengaturan Link'],
      ['admin-settings.html','Pengaturan Umum']
      ] },
    { label:'Akun', items:[ ['index.html','Logout'] ] }
  ];

  function qs(s,r){ return (r||document).querySelector(s); }
  function esc(v){ return String(v == null ? '' : v).replace(/[&<>\"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]||c;}); }
  function bool(v){ return v === true || v === 'true' || v === 1 || v === '1' || /aktif|active|on|yes/i.test(String(v||'')); }
  function toast(msg){ if(typeof window.toast === 'function') return window.toast(msg); try{ alert(msg); }catch(e){} }

  // NEW (2026-08-01): satu blok CSS yang dulunya hilang (kamar-full-online.css
  // ternyata kosong), sehingga kartu Data Member/Data Internal tampil sebagai
  // teks mentah tanpa border/card. Class-class di bawah ini disuntikkan
  // langsung dari sini (satu tempat, semua halaman admin) supaya tidak perlu
  // lagi bergantung ke file CSS terpisah yang gampang lupa diisi.
  function injectSharedStyles(){
    if(qs('#kamarAdminSharedStyle29F')) return;
    var style = document.createElement('style');
    style.id = 'kamarAdminSharedStyle29F';
    style.textContent =
      '.split-sidebar details,.admin-sidebar details{margin:4px 0}'+
      '.split-sidebar summary,.admin-sidebar summary{list-style:none;cursor:pointer;padding:12px 14px;border-radius:16px;font-weight:1000;color:#f1dda2;font-size:11px;letter-spacing:.16em;text-transform:uppercase;display:flex;align-items:center;justify-content:space-between;opacity:.9}'+
      '.split-sidebar summary::-webkit-details-marker,.admin-sidebar summary::-webkit-details-marker{display:none}'+
      '.split-sidebar summary:after,.admin-sidebar summary:after{content:"\\25BE";font-size:11px;opacity:.7;transition:.2s ease}'+
      '.split-sidebar details[open] summary:after,.admin-sidebar details[open] summary:after{content:"\\25B4"}'+
      '.split-sidebar summary:hover,.admin-sidebar summary:hover{background:rgba(212,166,63,.10);color:#f4df90}'+
      '.admin-toolbar-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;align-items:end}'+
      '.admin-toolbar-grid label{display:flex;flex-direction:column;gap:8px;font-weight:900;color:#d8d0bd;font-size:13px}'+
      '.admin-table-card{display:grid;gap:12px}'+
      '.admin-row{display:grid;grid-template-columns:1.3fr 1.3fr .8fr 1fr 1.4fr auto;gap:14px;align-items:center;border:1px solid rgba(238,206,122,.14);border-radius:22px;background:rgba(255,255,255,.025);padding:16px}'+
      '.admin-row.header{border:0;background:transparent;padding:6px 16px;color:#e7d391;text-transform:uppercase;letter-spacing:.14em;font-size:11px;font-weight:1000}'+
      '.admin-row[data-toggle-row]{cursor:pointer}.admin-row.row-collapsed{grid-template-columns:1.4fr 1.6fr .8fr auto}.admin-row.row-collapsed .admin-row-hide{display:none}'+
      '.admin-row strong{display:block;color:#fff3d8;overflow-wrap:anywhere;word-break:break-word;white-space:normal}'+
      '.admin-row small{display:block;color:rgba(245,240,230,.62);margin-top:4px;line-height:1.4}'+
      '.admin-row-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}'+
      '.admin-empty,.admin-empty-state{border:1px dashed rgba(238,206,122,.25);border-radius:22px;padding:20px;color:#d8d0bd;background:rgba(255,255,255,.02);line-height:1.6}'+
      '.admin-note-soft{color:#d8cda9;font-size:13px;line-height:1.6}'+
      '.admin-detail-card-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px}'+
      '.admin-detail-box{border:1px solid rgba(238,206,122,.14);border-radius:20px;background:rgba(255,255,255,.025);padding:16px}'+
      '.admin-detail-box span{display:block;text-transform:uppercase;letter-spacing:.12em;font-size:11px;font-weight:1000;color:#e7d391}'+
      '.admin-detail-box strong{display:block;margin-top:7px;color:#fff4db;overflow-wrap:anywhere;word-break:break-word}'+
      '.admin-detail-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}'+
      '.kamar-title-card{padding:22px!important}'+
      '.status-pill{display:inline-flex;align-items:center;border:1px solid rgba(238,206,122,.18);border-radius:999px;padding:6px 12px;color:#d8cda9;font-size:12px;font-weight:1000;text-transform:uppercase;letter-spacing:.12em}'+
      '.status-pill.on,.status-pill.ok{color:#9effca;background:rgba(28,97,65,.12);border-color:rgba(158,255,202,.25)}'+
      '.status-pill.warn{color:#ffd582;background:rgba(255,198,86,.08)}'+
      '.status-pill.off,.status-pill.bad{color:#aaa}'+
      '@media(max-width:900px){.admin-row{grid-template-columns:1fr}.admin-row.header{display:none}.admin-toolbar-grid{grid-template-columns:1fr}}';
    document.head.appendChild(style);
  }

  function sidebarLinkHtml(item){
    var href = item[0], label = item[1];
    var file = href.split('?')[0].toLowerCase();
    var isActive = (file === PAGE);
    var isLogout = (label === 'Logout');
    return '<a'+(isActive?' class="active"':'')+(isLogout?' data-kamar-logout':'')+' href="'+esc(href)+'">'+esc(label)+'</a>';
  }
  function rebuildSidebar(){
    var sidebar = qs('.split-sidebar, .admin-sidebar');
    if(!sidebar || sidebar.getAttribute('data-kamar-sidebar-online-29h')) return;
    sidebar.setAttribute('data-kamar-sidebar-online-29h','1');
    var html = '<div class="brand-small">ADMIN KAMAR</div>';
    SIDEBAR_SECTIONS.forEach(function(sec){
      if(sec.items.length <= 1){
        html += '<div class="admin-menu-section">'+esc(sec.label)+'</div>';
        html += sec.items.map(sidebarLinkHtml).join('');
      } else {
        var hasActive = sec.items.some(function(item){ return item[0].split('?')[0].toLowerCase() === PAGE; });
        html += '<details'+(hasActive?' open':'')+'><summary>'+esc(sec.label)+'</summary>'+sec.items.map(sidebarLinkHtml).join('')+'</details>';
      }
    });
    sidebar.innerHTML = html;
  }

  async function ready(){
    try{ if(window.KAMAR_CONFIG_READY) await window.KAMAR_CONFIG_READY; }catch(e){}
    try{ if(window.KamarSupabase && window.KamarSupabase.ready) return await window.KamarSupabase.ready(); }catch(e){}
    return window.kamarSupabaseClient || null;
  }
  async function select(table, limit){
    var c = await ready();
    if(!c) throw new Error('Client Supabase tidak terbaca.');
    var res = await c.from(table).select('*',{count:'exact'}).limit(limit || 200);
    if(res.error) throw res.error;
    return res;
  }
  async function insert(table, row){
    var c = await ready(); if(!c) throw new Error('Client Supabase tidak terbaca.');
    var res = await c.from(table).insert(row).select();
    if(res.error) throw res.error;
    return res.data || [];
  }
  async function update(table, id, row){
    var c = await ready(); if(!c) throw new Error('Client Supabase tidak terbaca.');
    var q = c.from(table).update(row);
    if(id) q = q.eq('id', id);
    var res = await q.select();
    if(res.error) throw res.error;
    return res.data || [];
  }
  async function remove(table, id){
    var c = await ready(); if(!c) throw new Error('Client Supabase tidak terbaca.');
    var res = await c.from(table).delete().eq('id', id);
    if(res.error) throw res.error;
    return true;
  }
  function getMain(){ return qs('.split-main') || qs('main') || document.body; }
  function fieldInput(name){
    var type = /url|link|file|image|youtube/i.test(name) ? 'url' : /enabled|is_active|active/i.test(name) ? 'checkbox' : 'text';
    if(/message|description|instructions|value/i.test(name)) type='textarea';
    if(type==='textarea') return '<label class="field"><span>'+esc(name)+'</span><textarea name="'+esc(name)+'" placeholder="'+esc(name)+'"></textarea></label>';
    if(type==='checkbox') return '<label class="toggle-row"><span><strong>'+esc(name)+'</strong><small>Aktif / nonaktif</small></span><input type="checkbox" name="'+esc(name)+'"></label>';
    return '<label class="field"><span>'+esc(name)+'</span><input type="'+type+'" name="'+esc(name)+'" placeholder="'+esc(name)+'"></label>';
  }
  function rowValue(v){
    if(v == null) return '-';
    if(typeof v === 'object') return esc(JSON.stringify(v)).slice(0,180);
    return esc(v).slice(0,180);
  }
  function renderRows(rows, table, fields){
    if(!rows.length) return '<div class="admin-empty-state">Belum ada data di tabel <code>'+esc(table)+'</code>. Tambahkan data pertama melalui form di atas.</div>';
    var cols = Array.from(new Set(['id'].concat(fields || [], Object.keys(rows[0]||{})))).slice(0,8);
    return '<div class="table-box"><table><thead><tr>'+cols.map(function(c){return '<th>'+esc(c)+'</th>';}).join('')+'<th>Aksi</th></tr></thead><tbody>'+rows.map(function(r){return '<tr>'+cols.map(function(c){return '<td>'+rowValue(r[c])+'</td>';}).join('')+'<td><button class="btn mini danger" data-online-delete="'+esc(r.id||'')+'" '+(!r.id?'disabled':'')+'>Hapus</button></td></tr>';}).join('')+'</tbody></table></div>';
  }
  async function renderManager(cfg){
    var main = getMain();
    if(!main || qs('#kamarOnlineManager29F')) return;
    var box = document.createElement('section');
    box.className = 'split-card';
    box.id = 'kamarOnlineManager29F';
    box.innerHTML = '<span class="mini-label">Supabase Online</span><h2>'+esc(cfg.title)+'</h2><p>Halaman ini membaca dan menulis ke tabel <code>'+esc(cfg.table)+'</code>. Jika tombol simpan error, cek nama kolom tabel atau RLS policy INSERT/UPDATE.</p><form id="onlineForm29F" class="grid-2 kamar-form-grid">'+cfg.fields.map(fieldInput).join('')+'<div class="button-row full"><button class="btn" type="submit">Simpan ke Supabase</button><button class="btn secondary" type="button" id="reloadOnline29F">Refresh Data</button></div></form><div id="onlineData29F" class="preview-box">Memuat data online...</div>';
    main.appendChild(box);
    async function reload(){
      var target = qs('#onlineData29F', box);
      target.innerHTML = 'Membaca tabel <code>'+esc(cfg.table)+'</code>...';
      try{
        var res = await select(cfg.table, 200);
        target.innerHTML = '<div class="button-row"><span class="status-pill on">Supabase OK</span><span class="status-pill">Jumlah: '+(res.count != null ? res.count : (res.data||[]).length)+'</span></div>'+renderRows(res.data||[], cfg.table, cfg.fields);
      }catch(e){
        target.innerHTML = '<div class="expired-note"><strong>Belum bisa membaca tabel '+esc(cfg.table)+'</strong><br>'+esc(window.kamarFriendlyError(e))+'<br><br>Jika tabel ada, aktifkan RLS SELECT/INSERT/UPDATE untuk akun auth/admin atau anon sesuai kebutuhan.</div>';
      }
    }
    qs('#onlineForm29F', box).addEventListener('submit', async function(e){
      e.preventDefault();
      var row = {};
      cfg.fields.forEach(function(f){
        var input = e.target.elements[f];
        if(!input) return;
        if(input.type === 'checkbox') row[f] = input.checked;
        else row[f] = String(input.value||'').trim();
      });
      if(!('created_at' in row)) row.created_at = new Date().toISOString();
      if(!('updated_at' in row)) row.updated_at = new Date().toISOString();
      try{ await insert(cfg.table, row); toast('Tersimpan ke Supabase: '+cfg.table); e.target.reset(); await reload(); }
      catch(err){ toast(window.kamarFriendlyError(err)); }
    });
    qs('#reloadOnline29F', box).onclick = reload;
    box.addEventListener('click', async function(e){
      var id = e.target && e.target.getAttribute('data-online-delete');
      if(!id) return;
      if(!confirm('Hapus data ID '+id+' dari '+cfg.table+'?')) return;
      try{ await remove(cfg.table, id); toast('Data dihapus.'); await reload(); }catch(err){ toast(window.kamarFriendlyError(err)); }
    });
    await reload();
  }
  async function patchKamarAdminLocal(){
    await ready();
    var K = window.KamarAdminLocal;
    if(!K || K.__online29F) return;
    K.__online29F = true;
    var oldActivate = K.activateMember;
    var oldSuspend = K.suspendMember;
    var oldToggle = K.toggleFacility;
    K.activateMember = async function(id){
      try{
        await update('member_profiles', id, { status:'active', account_status:'active', updated_at:new Date().toISOString() });
        toast('Member diupdate online.'); document.dispatchEvent(new Event('kamarAdminDataChanged')); return true;
      }catch(e){ toast(window.kamarFriendlyError(e)); return oldActivate ? oldActivate(id) : false; }
    };
    K.suspendMember = async function(id){
      try{ await update('member_profiles', id, { status:'suspended', account_status:'suspended', updated_at:new Date().toISOString() }); toast('Member disuspend online.'); return true; }
      catch(e){ toast(window.kamarFriendlyError(e)); return oldSuspend ? oldSuspend(id) : false; }
    };
    K.toggleFacility = async function(id,fac,on,duration,note){
      try{
        var row = { member_id:id, facility_name:fac, is_active:!!on, duration:String(duration||''), note:String(note||''), updated_at:new Date().toISOString() };
        await insert('member_access', row);
        toast((on?'Fasilitas aktif online: ':'Fasilitas nonaktif online: ')+fac); return true;
      }catch(e){ toast(window.kamarFriendlyError(e)); return oldToggle ? oldToggle(id,fac,on,duration,note) : false; }
    };
  }

  function genericTodoCard(todo){
    var title = esc(todo.title || todo.todo_type || 'Tugas Admin');
    var desc = esc(todo.description || '');
    var payload = todo.action_payload || {};
    var name = esc(payload.full_name || payload.email || '-');
    return '<div class="todo-row"><div><strong>'+title+'</strong><small>'+name+'</small></div><div>'+desc+'</div><div></div><div><button class="btn mini secondary" type="button" data-todo-action="review" data-todo-id="'+esc(todo.id)+'">Tinjau</button> <button class="btn" type="button" data-todo-action="dismiss" data-todo-id="'+esc(todo.id)+'">Tandai Selesai</button></div></div>';
  }

  var TODO_LABELS = {
    new_registration: 'Pendaftaran Baru',
    new_payment: 'Pembayaran Baru',
    renewal_request: 'Perpanjangan',
    upgrade_request: 'Upgrade Fasilitas',
    access_expiring: 'Akses Akan Berakhir',
    access_expired: 'Akses Berakhir',
    profile_change: 'Perubahan Profil',
    support_request: 'Permintaan Bantuan',
    manual_note: 'Catatan Admin',
    license_request: 'Pengajuan Lisensi',
    affiliate_payout_change: 'Perubahan Rekening Affiliate',
    ib_kamar_activation: 'Pengajuan IB Kamar'
  };
  function fmtMoney(n){ try{ return 'Rp '+Number(n).toLocaleString('id-ID'); }catch(e){ return String(n); } }
  async function resolveProfileId(todo){
    if(todo.profile_id) return todo.profile_id;
    var email = todo.action_payload && todo.action_payload.email;
    if(!email) return null;
    var c = await ready(); if(!c) return null;
    var res = await c.from('member_profiles').select('id').eq('email', email).limit(1);
    if(res.error || !res.data || !res.data.length) return null;
    return res.data[0].id;
  }
  async function markTodoDone(todoId, statusVal){
    await update('admin_todos', todoId, { todo_status: statusVal || 'done', completed_at: new Date().toISOString() });
  }
  async function actionActivateRegistration(todo){
    var pid = await resolveProfileId(todo);
    if(!pid){ toast('Tidak menemukan profil member untuk diaktifkan.'); return; }
    await update('member_profiles', pid, { account_status:'active', updated_at:new Date().toISOString() });
    await markTodoDone(todo.id);
    toast('Member diaktifkan.');
  }
  async function actionConfirmPayment(todo){
    var payload = todo.action_payload || {};
    var pid = await resolveProfileId(todo);
    if(!pid){ toast('Tidak menemukan profil member untuk pembayaran ini.'); return; }
    var days = Number(payload.duration_days || 30) || 30;
    var endDate = new Date(Date.now() + days*24*60*60*1000).toISOString();
    if(payload.payment_id){
      try{ await update('payments', payload.payment_id, { payment_status:'confirmed', confirmed_at:new Date().toISOString() }); }catch(e){}
    }
    await update('member_profiles', pid, { account_status:'active', payment_status:'confirmed', access_start_date:new Date().toISOString(), access_end_date:endDate, updated_at:new Date().toISOString() });
    var facilities = payload.selected_facilities || [];
    if(facilities.length){
      var accessRow = { profile_id: pid, updated_at:new Date().toISOString() };
      facilities.forEach(function(f){ if(FACILITY_COLUMN[f]) accessRow[FACILITY_COLUMN[f]] = true; });
      var c = await ready();
      if(c) await c.from('member_access').upsert(accessRow, { onConflict:'profile_id' });
    }
    await markTodoDone(todo.id);
    toast('Pembayaran dikonfirmasi & fasilitas diaktifkan.');
  }
  async function actionProfileChange(todo, approve){
    var payload = todo.action_payload || {};
    var pid = await resolveProfileId(todo);
    if(approve && pid && payload.new_data){
      await update('member_profiles', pid, Object.assign({}, payload.new_data, { updated_at:new Date().toISOString() }));
    }
    if(payload.profile_change_request_id){
      await update('profile_change_requests', payload.profile_change_request_id, { status: approve?'approved':'rejected', reviewed_at:new Date().toISOString() });
    }
    await markTodoDone(todo.id, approve?'done':'rejected');
    toast(approve?'Perubahan profil disetujui.':'Perubahan profil ditolak.');
  }
  async function actionDismiss(todo){
    await markTodoDone(todo.id);
    toast('Ditandai selesai.');
  }
  async function actionLicenseRequest(todo, approve){
    var payload = todo.action_payload || {};
    var pid = todo.profile_id || await resolveProfileId(todo);
    if(pid && payload.facility_key){
      var c2 = await ready();
      if(c2){
        var res2 = await c2.from('kamar_licenses').select('id').eq('member_profile_id', pid).eq('facility_key', payload.facility_key).eq('request_status', 'pending').limit(1);
        if(res2.error) throw res2.error;
        if(res2.data && res2.data.length){
          var licenseId = res2.data[0].id;
          if(approve){
            await update('kamar_licenses', licenseId, { request_status:'active', status:'active', reviewed_at:new Date().toISOString() });
          } else {
            await update('kamar_licenses', licenseId, { request_status:'rejected', status:'suspended', reviewed_at:new Date().toISOString() });
          }
        }
      }
    }
    await markTodoDone(todo.id, approve?'done':'rejected');
    toast(approve?'License disetujui.':'Pengajuan license ditolak.');
  }
  async function actionIbKamarApplication(todo, approve){
    var payload = todo.action_payload || {};
    var appId = payload.application_id;
    if(appId){
      var c = await ready();
      if(c){
        var res = await c.rpc('admin_review_ib_kamar_application', { p_application_id: appId, p_action: approve?'approve':'reject' });
        if(res.error) throw res.error;
      }
    }
    await markTodoDone(todo.id, approve?'done':'rejected');
    toast(approve?'IB Kamar disetujui, akses Kamar Signal diaktifkan.':'Pengajuan IB Kamar ditolak.');
  }
  async function actionAffiliatePayoutChange(todo, approve){
    var payload = todo.action_payload || {};
    if(approve && payload.affiliate_id){
      await update('affiliates', payload.affiliate_id, {
        payment_account_name: payload.new_payment_account_name,
        payment_account_number: payload.new_payment_account_number,
        payment_bank_name: payload.new_payment_bank_name,
        payment_verified: false,
        payment_verified_at: null,
        updated_at: new Date().toISOString()
      });
    }
    await markTodoDone(todo.id, approve?'done':'rejected');
    toast(approve?'Perubahan rekening affiliate disetujui.':'Perubahan rekening affiliate ditolak.');
  }
  function todoCard(todo){
    var label = TODO_LABELS[todo.todo_type] || todo.todo_type;
    var p = todo.action_payload || {};
    var subBits = [];
    if(p.member_id) subBits.push(p.member_id);
    if(p.whatsapp) subBits.push('WA '+p.whatsapp);
    if(p.amount) subBits.push(fmtMoney(p.amount));
    if(p.selected_facilities && p.selected_facilities.length) subBits.push(p.selected_facilities.map(function(f){ return FACILITY_LABEL[f] || f; }).join(', '));
    if(p.duration_days) subBits.push(p.duration_days+' hari');
    if(p.broker_name) subBits.push(p.broker_name);
    if(p.account_id) subBits.push('Akun '+p.account_id);
    if(p.new_payment_bank_name) subBits.push('Bank baru: '+p.new_payment_bank_name);
    if(p.new_payment_account_number) subBits.push('No. Rek baru: '+p.new_payment_account_number);
    // NEW (2026-08-06): tombol "Tinjau" di setiap baris supaya admin bisa lihat detail
    // lengkap isi permintaan (field yang diubah, nilai lama -> baru, dsb) SEBELUM
    // menekan Setujui/Tolak. Sebelumnya admin harus memutuskan tanpa detail karena
    // kolom kedua menampilkan email (kalau ada) padahal payload sudah punya
    // field_label/old_value/new_value yang siap ditampilkan via openReviewModal().
    var reviewBtn = '<button class="btn mini secondary" type="button" data-todo-action="review" data-todo-id="'+esc(todo.id)+'">Tinjau</button> ';
    var actionsHtml;
    if(todo.todo_type === 'new_registration'){
      actionsHtml = reviewBtn+'<button class="btn mini" type="button" data-todo-action="activate" data-todo-id="'+esc(todo.id)+'">Aktivasi</button>';
    } else if(todo.todo_type === 'new_payment' || todo.todo_type === 'upgrade_request' || todo.todo_type === 'renewal_request'){
      actionsHtml = reviewBtn+'<button class="btn mini" type="button" data-todo-action="confirm_payment" data-todo-id="'+esc(todo.id)+'">Verifikasi</button>';
    } else if(todo.todo_type === 'profile_change'){
      actionsHtml = reviewBtn+'<button class="btn mini" type="button" data-todo-action="approve_profile" data-todo-id="'+esc(todo.id)+'">Setujui</button> <button class="btn mini secondary" type="button" data-todo-action="reject_profile" data-todo-id="'+esc(todo.id)+'">Tolak</button>';
    } else if(todo.todo_type === 'license_request'){
      actionsHtml = reviewBtn+'<button class="btn mini" type="button" data-todo-action="approve_license" data-todo-id="'+esc(todo.id)+'">Setujui</button> <button class="btn mini secondary" type="button" data-todo-action="reject_license" data-todo-id="'+esc(todo.id)+'">Tolak</button>';
    } else if(todo.todo_type === 'affiliate_payout_change'){
      actionsHtml = reviewBtn+'<button class="btn mini" type="button" data-todo-action="approve_affiliate_payout" data-todo-id="'+esc(todo.id)+'">Setujui</button> <button class="btn mini secondary" type="button" data-todo-action="reject_affiliate_payout" data-todo-id="'+esc(todo.id)+'">Tolak</button>';
    } else if(todo.todo_type === 'ib_kamar_activation'){
      actionsHtml = reviewBtn+'<button class="btn mini" type="button" data-todo-action="approve_ib_kamar" data-todo-id="'+esc(todo.id)+'">Setujui</button> <button class="btn mini secondary" type="button" data-todo-action="reject_ib_kamar" data-todo-id="'+esc(todo.id)+'">Tolak</button>';
    } else {
      actionsHtml = reviewBtn+'<button class="btn mini secondary" type="button" data-todo-action="dismiss" data-todo-id="'+esc(todo.id)+'">Selesai</button>';
    }
    return '<div class="todo-row">'
    +'<div><strong>'+esc(todo.title || label)+'</strong><small>'+esc(p.full_name || '')+(subBits.length ? ' &middot; '+esc(subBits.join(' &middot; ')) : '')+'</small></div>'
    +'<div>'+esc(todo.description || p.email || '-')+'</div>'
    +'<div><span class="chip">'+esc(label)+'</span></div>'
    +'<div>'+actionsHtml+'</div>'
    +'</div>';
  }
  // NEW (2026-08-06): modal "Tinjau" generik. Dibangun dari action_payload yang
  // SUDAH berisi field_label/old_value/new_value (diisi backend saat member submit
  // perubahan), jadi tidak perlu query tambahan ke member_profiles untuk kasus
  // profile_change. Untuk tipe todo lain, sisa key di action_payload ditampilkan
  // apa adanya sebagai daftar "Data Tambahan" supaya tetap berguna secara umum.
  var TODO_FIELD_SKIP = { field:1, new_data:1, field_label:1, old_value:1, new_value:1, full_name:1, email:1, profile_id:1, payment_id:1, affiliate_id:1, facility_key:1 };
  function fmtFieldKey(k){
    return String(k||'').replace(/_/g,' ').replace(/\b\w/g,function(c){return c.toUpperCase();});
  }
  function fmtFieldVal(v){
    if(v == null || v === '') return '-';
    if(typeof v === 'object') return esc(JSON.stringify(v));
    return esc(String(v));
  }
  function fmtRelativeSafe(iso){
    try{
      var d = new Date(iso); var diff = Math.floor((Date.now()-d.getTime())/1000);
      if(diff < 60) return 'baru saja';
      if(diff < 3600) return Math.floor(diff/60)+' menit lalu';
      if(diff < 86400) return Math.floor(diff/3600)+' jam lalu';
      return Math.floor(diff/86400)+' hari lalu';
    }catch(e){ return ''; }
  }
  function injectReviewModal(){
    if(qs('#kamarTodoReviewModal29F')) return;
    injectSharedStyles();
    var style = document.createElement('style');
    style.textContent =
      '.kamar-review-backdrop{position:fixed;inset:0;background:rgba(6,6,5,.62);z-index:9998;display:none;align-items:center;justify-content:center;padding:20px}'+
      '.kamar-review-backdrop.open{display:flex}'+
      '.kamar-review-box{width:100%;max-width:560px;max-height:82vh;overflow:auto;background:#141210;border:1px solid rgba(238,206,122,.24);border-radius:26px;padding:26px;box-shadow:0 30px 90px rgba(0,0,0,.5)}'+
      '.kamar-review-box h3{margin:0 0 6px;color:#fff3d8;font-size:20px}'+
      '.kamar-review-box .kamar-review-sub{color:#d8cda9;font-size:13px;margin-bottom:18px}'+
      '.kamar-review-diff{border:1px solid rgba(158,255,202,.22);background:rgba(28,97,65,.08);border-radius:18px;padding:16px;margin-bottom:16px;display:flex;align-items:center;gap:10px;flex-wrap:wrap}'+
      '.kamar-review-diff .from{color:#ffb4b4;text-decoration:line-through;opacity:.85}'+
      '.kamar-review-diff .to{color:#9effca;font-weight:1000;font-size:16px}'+
      '.kamar-review-grid{display:grid;gap:10px;margin-bottom:18px}'+
      '.kamar-review-grid div{display:flex;justify-content:space-between;gap:14px;border-bottom:1px solid rgba(238,206,122,.10);padding-bottom:8px;font-size:13px}'+
      '.kamar-review-grid span:first-child{color:#a99d82;font-weight:900;flex-shrink:0}'+
      '.kamar-review-grid span:last-child{color:#f5f0e6;text-align:right;overflow-wrap:anywhere}'+
      '.kamar-review-actions{display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end;margin-top:6px}';
    document.head.appendChild(style);
    var wrap = document.createElement('div');
    wrap.id = 'kamarTodoReviewModal29F';
    wrap.className = 'kamar-review-backdrop';
    wrap.innerHTML = '<div class="kamar-review-box" id="kamarTodoReviewBox29F"></div>';
    document.body.appendChild(wrap);
    wrap.addEventListener('click', function(e){ if(e.target === wrap) closeReviewModal(); });
    wrap.addEventListener('click', onTodoAction);
    document.addEventListener('keydown', function(e){ if(e.key === 'Escape') closeReviewModal(); });
  }
  function closeReviewModal(){
    var wrap = qs('#kamarTodoReviewModal29F');
    if(wrap) wrap.classList.remove('open');
  }
  function reviewActionButtons(todo){
    var actions = '<button class="btn secondary" type="button" data-review-close="1">Tutup</button>';
    if(todo.todo_type === 'profile_change'){
      actions += ' <button class="btn mini secondary" type="button" data-todo-action="reject_profile" data-todo-id="'+esc(todo.id)+'">Tolak</button>';
      actions += ' <button class="btn mini" type="button" data-todo-action="approve_profile" data-todo-id="'+esc(todo.id)+'">Setujui</button>';
    } else if(todo.todo_type === 'license_request'){
      actions += ' <button class="btn mini secondary" type="button" data-todo-action="reject_license" data-todo-id="'+esc(todo.id)+'">Tolak</button>';
      actions += ' <button class="btn mini" type="button" data-todo-action="approve_license" data-todo-id="'+esc(todo.id)+'">Setujui</button>';
    } else if(todo.todo_type === 'affiliate_payout_change'){
      actions += ' <button class="btn mini secondary" type="button" data-todo-action="reject_affiliate_payout" data-todo-id="'+esc(todo.id)+'">Tolak</button>';
      actions += ' <button class="btn mini" type="button" data-todo-action="approve_affiliate_payout" data-todo-id="'+esc(todo.id)+'">Setujui</button>';
    } else if(todo.todo_type === 'ib_kamar_activation'){
      actions += ' <button class="btn mini secondary" type="button" data-todo-action="reject_ib_kamar" data-todo-id="'+esc(todo.id)+'">Tolak</button>';
      actions += ' <button class="btn mini" type="button" data-todo-action="approve_ib_kamar" data-todo-id="'+esc(todo.id)+'">Setujui</button>';
    } else if(todo.todo_type === 'new_registration'){
      actions += ' <button class="btn mini" type="button" data-todo-action="activate" data-todo-id="'+esc(todo.id)+'">Aktivasi</button>';
    } else if(todo.todo_type === 'new_payment' || todo.todo_type === 'upgrade_request' || todo.todo_type === 'renewal_request'){
      actions += ' <button class="btn mini" type="button" data-todo-action="confirm_payment" data-todo-id="'+esc(todo.id)+'">Verifikasi</button>';
    } else {
      actions += ' <button class="btn mini secondary" type="button" data-todo-action="dismiss" data-todo-id="'+esc(todo.id)+'">Tandai Selesai</button>';
    }
    return actions;
  }
  function openReviewModal(todo){
    injectReviewModal();
    var label = TODO_LABELS[todo.todo_type] || todo.todo_type;
    var p = todo.action_payload || {};
    var box = qs('#kamarTodoReviewBox29F');
    var html = '<h3>'+esc(todo.title || label)+'</h3>';
    html += '<div class="kamar-review-sub"><span class="chip">'+esc(label)+'</span> &middot; '+esc(fmtRelativeSafe(todo.created_at))+'</div>';
    if(p.field_label || p.new_value !== undefined){
      html += '<div class="kamar-review-diff"><span class="from">'+fmtFieldVal(p.old_value)+'</span><span>&rarr;</span><span class="to">'+fmtFieldVal(p.new_value)+'</span></div>';
    } else if(todo.description){
      html += '<p class="admin-note-soft">'+esc(todo.description)+'</p>';
    }
    var grid = '';
    grid += '<div><span>Diajukan oleh</span><span>'+esc(p.full_name || '-')+'</span></div>';
    if(p.email) grid += '<div><span>Email</span><span>'+esc(p.email)+'</span></div>';
    if(p.field_label) grid += '<div><span>Field</span><span>'+esc(p.field_label)+'</span></div>';
    Object.keys(p).forEach(function(k){
      if(TODO_FIELD_SKIP[k]) return;
      var v = p[k];
      if(v == null || v === '' || (Array.isArray(v) && !v.length)) return;
      grid += '<div><span>'+esc(fmtFieldKey(k))+'</span><span>'+fmtFieldVal(v)+'</span></div>';
    });
    html += '<div class="kamar-review-grid">'+grid+'</div>';
    html += '<div class="kamar-review-actions">'+reviewActionButtons(todo)+'</div>';
    box.innerHTML = html;
    box.querySelectorAll('[data-review-close]:not([data-todo-action])').forEach(function(b){
      b.addEventListener('click', function(){ closeReviewModal(); });
    });
    var wrap = qs('#kamarTodoReviewModal29F');
    if(wrap) wrap.classList.add('open');
  }
  async function onTodoAction(e){
    var btn = e.target && e.target.closest ? e.target.closest('[data-todo-action]') : null;
    if(!btn) return;
    var action = btn.getAttribute('data-todo-action');
    var todoId = btn.getAttribute('data-todo-id');
    var c = await ready(); if(!c) return;
    var res = await c.from('admin_todos').select('*').eq('id', todoId).limit(1);
    if(res.error || !res.data || !res.data.length){ toast('Data tugas tidak ditemukan (mungkin sudah diproses).'); closeReviewModal(); await renderActionCenter(); return; }
    var todo = res.data[0];
    if(action === 'review'){ openReviewModal(todo); return; }
    closeReviewModal();
    btn.disabled = true;
    try{
      if(action === 'activate') await actionActivateRegistration(todo);
      else if(action === 'confirm_payment') await actionConfirmPayment(todo);
      else if(action === 'approve_profile') await actionProfileChange(todo, true);
      else if(action === 'reject_profile') await actionProfileChange(todo, false);
      else if(action === 'approve_license') await actionLicenseRequest(todo, true);
      else if(action === 'reject_license') await actionLicenseRequest(todo, false);
      else if(action === 'approve_affiliate_payout') await actionAffiliatePayoutChange(todo, true);
      else if(action === 'reject_affiliate_payout') await actionAffiliatePayoutChange(todo, false);
      else if(action === 'approve_ib_kamar') await actionIbKamarApplication(todo, true);
      else if(action === 'reject_ib_kamar') await actionIbKamarApplication(todo, false);
      else if(action === 'dismiss') await actionDismiss(todo);
      await renderActionCenter();
    }catch(err){
      toast(window.kamarFriendlyError(err));
      btn.disabled = false;
    }
  }
  async function renderActionCenter(){
    var el = qs('#adminTodoList');
    if(!el) return false;
    try{
      var c = await ready();
      if(!c) throw new Error('Data belum bisa dibaca.');
      var res = await c.from('admin_todos').select('*').in('todo_status',['new','processing']).order('priority',{ascending:true}).order('created_at',{ascending:true}).limit(50);
      if(res.error) throw res.error;
      var rows = res.data || [];
      el.innerHTML = rows.length ? rows.map(function(t){ try{ var c = todoCard(t); return (c && String(c).trim()) ? c : genericTodoCard(t); }catch(e){ return genericTodoCard(t); } }).join('') : '<div class="empty">Tidak ada notifikasi/tugas admin yang menunggu. Semua sudah beres.</div>';
      if(!el.getAttribute('data-kamar-actioncenter-bound')){
        el.setAttribute('data-kamar-actioncenter-bound','1');
        el.addEventListener('click', onTodoAction);
      }
      // NEW (2026-08-06): isi angka di stat-card "Permintaan Menunggu" pada grid
      // Ringkasan Admin (kalau elemennya ada di halaman ini), supaya admin langsung
      // lihat ada berapa permintaan yang perlu ditinjau tanpa scroll ke bawah dulu.
      var countEl = qs('#pendingTodoCount');
      if(countEl) countEl.textContent = String(rows.length);
      window.__KAMAR_TODO_CENTER_ACTIVE__ = true;
      return true;
    }catch(e){
      return false;
    }
  }


  async function run(){
    if(!/^admin/i.test(PAGE)) return;
    injectSharedStyles();
    rebuildSidebar();
    await patchKamarAdminLocal();
    renderActionCenter();
    setTimeout(renderActionCenter, 1500);
    if(MAP[PAGE]) await renderManager(MAP[PAGE]);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', run); else run();
})();


(function(){
  'use strict';
  if(window.__KAMAR_ADMIN_NOTIF_29F__) return;
  window.__KAMAR_ADMIN_NOTIF_29F__ = true;
  var PAGE = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  if(!/^admin/i.test(PAGE)) return;

  var NOTIF_POLL_MS = 30000;
  var NOTIF_SEEN_KEY = 'kamarAdminNotifSeenIds29F';
  function loadSeenIds(){ try{ var raw = localStorage.getItem(NOTIF_SEEN_KEY); var arr = raw ? JSON.parse(raw) : []; return new Set(Array.isArray(arr)?arr:[]); }catch(e){ return new Set(); } }
  function saveSeenIds(set){ try{ localStorage.setItem(NOTIF_SEEN_KEY, JSON.stringify(Array.from(set))); }catch(e){} }
  var notifState = { items: [], open: false, channel: null, seenIds: loadSeenIds() };

  function qs(s,r){ return (r||document).querySelector(s); }
  function esc(v){ return String(v == null ? '' : v).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]||c;}); }
  function toast(msg){ if(typeof window.toast === 'function') return window.toast(msg); try{ alert(msg); }catch(e){} }
  async function ready(){
    try{ if(window.KAMAR_CONFIG_READY) await window.KAMAR_CONFIG_READY; }catch(e){}
    try{ if(window.KamarSupabase && window.KamarSupabase.ready) return await window.KamarSupabase.ready(); }catch(e){}
    return window.kamarSupabaseClient || null;
  }
  function fmtRelative(iso){
    try{
      var d = new Date(iso); var diff = Math.floor((Date.now()-d.getTime())/1000);
      if(diff < 60) return 'baru saja';
      if(diff < 3600) return Math.floor(diff/60)+' menit lalu';
      if(diff < 86400) return Math.floor(diff/3600)+' jam lalu';
      return Math.floor(diff/86400)+' hari lalu';
    }catch(e){ return ''; }
  }
  var NOTIF_LINK = {
    new_registration: 'admin-activation.html?member=',
    new_payment: 'admin-activation.html?member=',
    license_request: 'admin-license-requests.html?member=',
    access_expired: 'admin-activation.html?member='
  };
  var NOTIF_ICON = {
    new_registration: String.fromCodePoint(128100),
    new_payment: String.fromCodePoint(128176),
    license_request: String.fromCodePoint(128273),
    access_expired: String.fromCodePoint(9200)
  };
  function injectNotifStyles(){
    if(qs('#kamarNotifStyles29F')) return;
    var st = document.createElement('style');
    st.id = 'kamarNotifStyles29F';
    st.textContent = '.kamar-notif-btn{position:relative;display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:999px;border:1px solid rgba(238,206,122,.24);background:rgba(255,255,255,.08);color:#f4df90;cursor:pointer;font-size:18px}'
      + '.kamar-notif-badge{position:absolute;top:-4px;right:-4px;min-width:18px;height:18px;padding:0 4px;border-radius:999px;background:#c43c3c;color:#fff;font-size:11px;font-weight:900;display:flex;align-items:center;justify-content:center;line-height:1}'
      + '.kamar-notif-panel{position:absolute;top:52px;right:0;width:360px;max-height:420px;overflow:auto;background:#fff;border:1px solid rgba(17,20,23,.12);border-radius:20px;box-shadow:0 20px 60px rgba(17,20,23,.24);padding:10px;display:none;z-index:9999}'
      + '.kamar-notif-panel.open{display:block}'
      + '.kamar-notif-item{display:block;text-decoration:none;color:inherit;padding:12px;border-radius:14px;border:1px solid rgba(17,20,23,.08);margin-bottom:8px;background:#fbf7ee}'
      + '.kamar-notif-item strong{display:block;color:#111417;font-size:13px}'
      + '.kamar-notif-item small{display:block;color:#606973;margin-top:4px;line-height:1.4}'
      + '.kamar-notif-item time{display:block;color:#b88a3d;font-size:11px;margin-top:6px;font-weight:800;text-transform:uppercase}'
      + '.kamar-notif-empty{padding:18px;text-align:center;color:#606973;font-size:13px}'
      + '.kamar-notif-mark{margin-top:8px;border:0;background:#efe3ca;color:#7a561e;border-radius:999px;padding:6px 10px;font-size:11px;font-weight:900;cursor:pointer}';
    document.head.appendChild(st);
  }
  function renderNotifPanel(){
    var panel = qs('#kamarNotifPanel29F');
    if(!panel) return;
    if(!notifState.items.length){
      panel.innerHTML = '<div class="kamar-notif-empty">Tidak ada notifikasi baru.</div>';
      return;
    }
    panel.innerHTML = notifState.items.map(function(t){
      var payload = t.action_payload || {};
      var name = payload.full_name || '-';
      var linkBase = NOTIF_LINK[t.todo_type] || 'admin.html?member=';
      var href = linkBase + encodeURIComponent(t.profile_id || '');
      return '<div class="kamar-notif-item">'
        + '<a href="'+esc(href)+'" style="text-decoration:none;color:inherit">'
        + '<strong>'+(NOTIF_ICON[t.todo_type]||String.fromCodePoint(128276))+' '+esc(t.title||'Notifikasi')+'</strong>'
        + '<small>'+esc(name)+' &middot; '+esc(t.description||'')+'</small>'
        + '<time>'+esc(fmtRelative(t.created_at))+'</time>'
        + '</a>'
        + '<button type="button" class="kamar-notif-mark" data-mark-todo="'+esc(t.todo_id||t.id||'')+'">Tandai Selesai</button>'
        + '</div>';
    }).join('');
    panel.querySelectorAll('[data-mark-todo]').forEach(function(b){
      b.onclick = async function(ev){
        ev.preventDefault();
        var id = b.getAttribute('data-mark-todo');
        try{
          var c = await ready();
          if(c){ await c.rpc('admin_update_todo_status', { target_todo_id: id, new_status: 'done', admin_note: null }); }
          await loadNotifs();
        }catch(e){ toast(window.kamarFriendlyError(e)); }
      };
    });
  }
  function updateNotifBadge(){
    var badge = qs('#kamarNotifBadge29F');
    if(!badge) return;
    var n = notifState.items.filter(function(t){ return !notifState.seenIds.has(String(t.id)); }).length;
    badge.style.display = n ? 'flex' : 'none';
    badge.textContent = n > 99 ? '99+' : String(n);
  }
  async function loadNotifs(){
    try{
      var c = await ready();
      if(!c) return;
      var res = await c.from('admin_todos').select('*').in('todo_status', ['new','processing']).order('priority', {ascending:true}).order('created_at', {ascending:false}).limit(30);
      if(res.error) throw res.error;
      var rows = res.data || [];
      var pids = Array.from(new Set(rows.map(function(r){return r.profile_id;}).filter(Boolean)));
      var profiles = {};
      if(pids.length){
        try{
          var pr = await c.from('member_profiles').select('id,full_name,email,member_id').in('id', pids);
          if(!pr.error){ (pr.data||[]).forEach(function(p){ profiles[p.id]=p; }); }
        }catch(e){}
      }
      notifState.items = rows.map(function(r){
        var payload = Object.assign({}, r.action_payload||{});
        if(!payload.full_name && profiles[r.profile_id]) payload.full_name = profiles[r.profile_id].full_name;
        return Object.assign({}, r, { todo_id:r.id, action_payload: payload });
      });
      updateNotifBadge();
      renderNotifPanel();
    }catch(e){ /* silent, biar tidak ganggu halaman lain */ }
  }
  function findHeaderActions(){
    return qs('.kamar-global-actions') || qs('.header-actions');
  }
  async function injectNotificationBell(){
    if(qs('#kamarNotifBtn29F')) return;
    var actions = findHeaderActions();
    var tries = 0;
    while(!actions && tries < 20){
      await new Promise(function(r){ setTimeout(r, 150); });
      actions = findHeaderActions();
      tries++;
    }
    if(!actions) return;
    injectNotifStyles();
    var wrap = document.createElement('div');
    wrap.style.position = 'relative';
    wrap.innerHTML = '<button type="button" id="kamarNotifBtn29F" class="kamar-notif-btn" aria-label="Notifikasi Admin">'
      + String.fromCodePoint(128276) + '<span id="kamarNotifBadge29F" class="kamar-notif-badge" style="display:none">0</span>'
      + '</button>'
      + '<div id="kamarNotifPanel29F" class="kamar-notif-panel"><div class="kamar-notif-empty">Memuat notifikasi...</div></div>';
    actions.insertBefore(wrap, actions.firstChild);
    qs('#kamarNotifBtn29F', wrap).onclick = function(e){
      e.stopPropagation();
      notifState.open = !notifState.open;
      if(notifState.open){ notifState.items.forEach(function(t){ notifState.seenIds.add(String(t.id)); }); saveSeenIds(notifState.seenIds); updateNotifBadge(); }
      qs('#kamarNotifPanel29F', wrap).classList.toggle('open', notifState.open);
    };
    document.addEventListener('click', function(e){
      if(notifState.open && !wrap.contains(e.target)){
        notifState.open = false;
        var p = qs('#kamarNotifPanel29F', wrap);
        if(p) p.classList.remove('open');
      }
    });
    await loadNotifs();
    setInterval(loadNotifs, NOTIF_POLL_MS);
    try{
      var c = await ready();
      if(c && c.channel){
        notifState.channel = c.channel('admin-todos-rt-29f')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_todos' }, function(){ loadNotifs(); })
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'admin_todos' }, function(){ loadNotifs(); })
          .subscribe();
      }
    }catch(e){}
  }
  function initNotif(){ injectNotificationBell(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', initNotif); else initNotif();
})();
