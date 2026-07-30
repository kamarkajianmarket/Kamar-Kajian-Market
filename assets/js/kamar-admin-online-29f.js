(function(){
  'use strict';
  if(window.__KAMAR_ADMIN_ONLINE_29F__) return;
  window.__KAMAR_ADMIN_ONLINE_29F__ = true;

  var PAGE = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  var VERSION = '29I';
  // FIXED (2026-07-30): table/column names below verified directly against the
  // live Supabase schema. Every admin content page below now points at a table
  // and column set that actually exists, including link_settings, payment_gateways,
  // homepage_settings and dashboard_settings (these tables DO exist in the
  // database - a previous draft of this file incorrectly assumed they didn't).
  // Enum columns (display_area, access_required, publish_status, file_type) are
  // rendered as dropdowns with the real Postgres enum values instead of free
  // text, so inserts no longer fail with an "invalid input value for enum" error.
  var ENUM_FIELDS = {
    'display_area': ['public','member','admin','both','global'],
    'access_required': ['public','member','kamar_study','materi_edukasi','kamar_private','kamar_indikator','kamar_robot','all_paid'],
    'publish_status': ['draft','published','hidden'],
    'file_type': ['indicator','robot','template','pdf','other']
  };
  var MAP = {
    'admin-banner.html': { table:'banners', title:'Banner Pengumuman Online', fields:['title','body','image_url','cta_label','cta_url','display_area','is_active'] },
    'admin-video.html': { table:'videos', title:'Video Konten Online', fields:['title','youtube_url','category','description','display_area','access_required','publish_status','is_active'] },
    'admin-materials.html': { table:'materials', title:'Materi / PDF Online', fields:['title','category','description','material_url','version_label','access_required','publish_status','admin_notes','is_active'] },
    'admin-tools.html': { table:'tools_files', title:'File Tools Online', fields:['title','file_type','file_url','version_label','changelog','access_required','publish_status','admin_notes','is_active'] },
    'admin-maintenance.html': { table:'maintenance_settings', title:'Maintenance Online', fields:['maintenance_key','title','message','is_active'] },
    'admin-settings.html': { table:'site_settings', title:'Pengaturan Umum Online', fields:['setting_key','setting_value','description','is_active'], jsonFields:['setting_value'] },
    'admin-links.html': { table:'link_settings', title:'Link Official Online', fields:['key','label','url','is_active'] },
    'admin-payment.html': { table:'payment_gateways', title:'Payment Gateway Online', fields:['name','bank_name','account_name','account_number','instructions','is_active'] },
    'admin-page-control.html': { table:'homepage_settings', title:'Kontrol Halaman Utama Online', fields:['key','value','description','is_active'], jsonFields:['value'] },
    'admin-dashboard-control.html': { table:'dashboard_settings', title:'Kontrol Dashboard Member Online', fields:['key','value','description','is_active'], jsonFields:['value'] }
  };
  var CRITICAL_TABLES = ['admin_member_overview','member_profiles','member_access','payments','affiliates','affiliate_referrals','affiliate_commissions','banners','videos','materials','tools_files','site_settings','maintenance_settings','link_settings','payment_gateways','homepage_settings','dashboard_settings','admin_pending_todos'];
  var NO_STATUS_PAGES = ['admin-login.html'];

  // NEW (2026-07-30): every admin-*.html file has always had its OWN
  // copy-pasted <aside class="split-sidebar"> markup, and over time these
  // copies drifted out of sync - some pages are missing "Data Internal",
  // "Cek Data Admin", or "Cek Koneksi DB" entirely because those links were
  // added to admin.html later but never back-ported to the other pages.
  // SIDEBAR_SECTIONS below is now the single source of truth for the admin
  // menu; rebuildSidebar() regenerates the sidebar identically on every
  // admin page so new/renamed menu items only ever need to be edited here.
  var SIDEBAR_SECTIONS = [
    { label:'Utama', items:[ ['admin.html','Dashboard Admin'] ] },
    { label:'Member & Akses', items:[
      ['admin-members.html','Data Member'],
      ['admin-internal.html','Data Internal'],
      ['admin-activation.html','Aktivasi Akun & Fasilitas'],
      ['admin-data-check.html','Cek Data Admin'],
      ['admin-connection-check.html','Cek Koneksi DB']
    ]},
    { label:'Affiliate', items:[
      ['admin-affiliate-v2.html?view=overview','Data Affiliate'],
      ['admin-affiliate-v2.html?view=list','Daftar Affiliator'],
      ['admin-affiliate-v2.html?view=reward','Reward / Komisi']
    ]},
    { label:'Konten Website', items:[
      ['admin-banner.html','Banner Pengumuman'],
      ['admin-video.html','Konten Video'],
      ['admin-materials.html','Konten & Materi'],
      ['admin-tools.html','File Tools']
    ]},
    { label:'Kontrol Sistem', items:[
      ['admin-maintenance.html','Maintenance Fasilitas'],
      ['admin-page-control.html','Kontrol Halaman Utama'],
      ['admin-dashboard-control.html','Kontrol Dashboard Member'],
      ['admin-payment.html','Payment Gateway'],
      ['admin-links.html','Pengaturan Link'],
      ['admin-settings.html','Pengaturan Umum']
    ]},
    { label:'Akun', items:[ ['index.html','Logout'] ] }
  ];

  function qs(s,r){ return (r||document).querySelector(s); }
  function esc(v){ return String(v == null ? '' : v).replace(/[&<>\"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]||c;}); }
  function bool(v){ return v === true || v === 'true' || v === 1 || v === '1' || /aktif|active|on|yes/i.test(String(v||'')); }
  function toast(msg){ if(window.toast) return window.toast(msg); try{ alert(msg); }catch(e){} }

  function rebuildSidebar(){
    var sidebar = qs('.split-sidebar');
    if(!sidebar || sidebar.getAttribute('data-kamar-sidebar-online-29h')) return;
    sidebar.setAttribute('data-kamar-sidebar-online-29h','1');
    var html = '<div class="brand-small">ADMIN KAMAR</div>';
    SIDEBAR_SECTIONS.forEach(function(sec){
      html += '<div class="admin-menu-section">'+esc(sec.label)+'</div>';
      sec.items.forEach(function(item){
        var href = item[0], label = item[1];
        var file = href.split('?')[0].toLowerCase();
        var isActive = (file === PAGE);
        var isLogout = (label === 'Logout');
        html += '<a'+(isActive?' class="active"':'')+(isLogout?' data-kamar-logout':'')+' href="'+esc(href)+'">'+esc(label)+'</a>';
      });
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
    if(ENUM_FIELDS[name]){
      var opts = '<option value="">— Pilih '+esc(name)+' —</option>'+ENUM_FIELDS[name].map(function(v){return '<option value="'+esc(v)+'">'+esc(v)+'</option>';}).join('');
      return '<label class="field"><span>'+esc(name)+'</span><select name="'+esc(name)+'">'+opts+'</select></label>';
    }
    var type = /url|link|file|image|youtube/i.test(name) ? 'url' : /enabled|is_active|active/i.test(name) ? 'checkbox' : 'text';
    if(/message|description|instructions|value|changelog|notes/i.test(name)) type='textarea';
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
        target.innerHTML = '<div class="expired-note"><strong>Belum bisa membaca tabel '+esc(cfg.table)+'</strong><br>'+esc(e.message || e)+'<br><br>Jika tabel ada, aktifkan RLS SELECT/INSERT/UPDATE untuk akun auth/admin atau anon sesuai kebutuhan.</div>';
      }
    }
    qs('#onlineForm29F', box).addEventListener('submit', async function(e){
      e.preventDefault();
      var row = {};
      var jsonFields = cfg.jsonFields || [];
      cfg.fields.forEach(function(f){
        var input = e.target.elements[f];
        if(!input) return;
        if(input.type === 'checkbox') row[f] = input.checked;
        else {
          var raw = String(input.value||'').trim();
          if(jsonFields.indexOf(f) >= 0){
            // jsonb columns (setting_value / value) need valid JSON. If the
            // admin typed plain text, store it as a JSON string instead of
            // letting the insert fail with an "invalid input syntax" error.
            try{ row[f] = raw === '' ? null : JSON.parse(raw); }
            catch(e2){ row[f] = raw === '' ? null : raw; }
          } else {
            row[f] = raw === '' ? null : raw;
          }
        }
      });
      if(!('created_at' in row)) row.created_at = new Date().toISOString();
      if(!('updated_at' in row)) row.updated_at = new Date().toISOString();
      try{ await insert(cfg.table, row); toast('Tersimpan ke Supabase: '+cfg.table); e.target.reset(); await reload(); }
      catch(err){ toast('Gagal simpan: '+(err.message||err)); }
    });
    qs('#reloadOnline29F', box).onclick = reload;
    box.addEventListener('click', async function(e){
      var id = e.target && e.target.getAttribute('data-online-delete');
      if(!id) return;
      if(!confirm('Hapus data ID '+id+' dari '+cfg.table+'?')) return;
      try{ await remove(cfg.table, id); toast('Data dihapus.'); await reload(); }catch(err){ toast('Gagal hapus: '+(err.message||err)); }
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
      }catch(e){ toast('Online update gagal, fallback lokal: '+(e.message||e)); return oldActivate ? oldActivate(id) : false; }
    };
    K.suspendMember = async function(id){
      try{ await update('member_profiles', id, { status:'suspended', account_status:'suspended', updated_at:new Date().toISOString() }); toast('Member disuspend online.'); return true; }
      catch(e){ toast('Online update gagal, fallback lokal: '+(e.message||e)); return oldSuspend ? oldSuspend(id) : false; }
    };
    K.toggleFacility = async function(id,fac,on,duration,note){
      try{
        var row = { member_id:id, facility_name:fac, is_active:!!on, duration:String(duration||''), note:String(note||''), updated_at:new Date().toISOString() };
        await insert('member_access', row);
        toast((on?'Fasilitas aktif online: ':'Fasilitas nonaktif online: ')+fac); return true;
      }catch(e){ toast('Online akses gagal, fallback lokal: '+(e.message||e)); return oldToggle ? oldToggle(id,fac,on,duration,note) : false; }
    };
  }
  // NEW (2026-07-30): real actionable notification/to-do center for the main
  // Dashboard Admin page. admin_todos already exists in the database and is
  // already being filled in automatically (new_registration, new_payment,
  // renewal_request, upgrade_request, access_expiring, access_expired,
  // profile_change, support_request, manual_note) - but nothing in the admin
  // UI ever read it. The old #adminTodoList only listed members whose
  // account_status looked "pending", with a link that just navigated away.
  // renderActionCenter() replaces that with the real admin_todos queue and
  // gives each item a one-click action (activate account, confirm payment +
  // grant the requested facilities, approve/reject a profile change, or mark
  // done) so the admin can act directly from the dashboard.
  var TODO_LABELS = {
    new_registration: 'Pendaftaran Baru',
    new_payment: 'Pembayaran Baru',
    renewal_request: 'Perpanjangan',
    upgrade_request: 'Upgrade Fasilitas',
    access_expiring: 'Akses Akan Berakhir',
    access_expired: 'Akses Berakhir',
    profile_change: 'Perubahan Profil',
    support_request: 'Permintaan Bantuan',
    manual_note: 'Catatan Admin'
  };
  var FACILITY_COLUMN = {
    kamar_study:'access_kamar_study',
    materi_edukasi:'access_materi_edukasi',
    kamar_private:'access_kamar_private',
    kamar_indikator:'access_kamar_indikator',
    kamar_robot:'access_kamar_robot'
  };
  // RENAMED (2026-07-31): "kamar_study" is the internal technical key (matches
  // the real DB column/enum value and existing payment records) - only the
  // text admin actually SEES has changed, to match the homepage's facility
  // name. Do not rename the FACILITY_COLUMN key above; it would break lookups
  // against existing payments/todos already stored with the old slug.
  var FACILITY_LABEL = {
    kamar_study:'Kamar Signal',
    materi_edukasi:'Kamar Edukasi',
    kamar_private:'Kamar Private',
    kamar_indikator:'Kamar Indikator',
    kamar_robot:'Kamar Robot'
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
      try{ await update('member_profiles', pid, Object.assign({}, payload.new_data, { updated_at:new Date().toISOString() })); }catch(e){}
    }
    if(payload.profile_change_request_id){
      try{ await update('profile_change_requests', payload.profile_change_request_id, { status: approve?'approved':'rejected', reviewed_at:new Date().toISOString() }); }catch(e){}
    }
    await markTodoDone(todo.id, approve?'done':'rejected');
    toast(approve?'Perubahan profil disetujui.':'Perubahan profil ditolak.');
  }
  async function actionDismiss(todo){
    await markTodoDone(todo.id);
    toast('Ditandai selesai.');
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
    var actionsHtml;
    if(todo.todo_type === 'new_registration'){
      actionsHtml = '<button class="btn mini" type="button" data-todo-action="activate" data-todo-id="'+esc(todo.id)+'">Aktivasi</button>';
    } else if(todo.todo_type === 'new_payment' || todo.todo_type === 'upgrade_request' || todo.todo_type === 'renewal_request'){
      actionsHtml = '<button class="btn mini" type="button" data-todo-action="confirm_payment" data-todo-id="'+esc(todo.id)+'">Verifikasi</button>';
    } else if(todo.todo_type === 'profile_change'){
      actionsHtml = '<button class="btn mini" type="button" data-todo-action="approve_profile" data-todo-id="'+esc(todo.id)+'">Setujui</button> <button class="btn mini secondary" type="button" data-todo-action="reject_profile" data-todo-id="'+esc(todo.id)+'">Tolak</button>';
    } else {
      actionsHtml = '<button class="btn mini secondary" type="button" data-todo-action="dismiss" data-todo-id="'+esc(todo.id)+'">Selesai</button>';
    }
    return '<div class="todo-row">'
      +'<div><strong>'+esc(todo.title || label)+'</strong><small>'+esc(p.full_name || '')+(subBits.length ? ' &middot; '+esc(subBits.join(' &middot; ')) : '')+'</small></div>'
      +'<div>'+esc(p.email || todo.description || '-')+'</div>'
      +'<div><span class="chip">'+esc(label)+'</span></div>'
      +'<div>'+actionsHtml+'</div>'
      +'</div>';
  }
  async function onTodoAction(e){
    var btn = e.target && e.target.closest ? e.target.closest('[data-todo-action]') : null;
    if(!btn) return;
    var action = btn.getAttribute('data-todo-action');
    var todoId = btn.getAttribute('data-todo-id');
    var c = await ready(); if(!c) return;
    var res = await c.from('admin_todos').select('*').eq('id', todoId).limit(1);
    if(res.error || !res.data || !res.data.length){ toast('Data tugas tidak ditemukan (mungkin sudah diproses).'); await renderActionCenter(); return; }
    var todo = res.data[0];
    btn.disabled = true;
    try{
      if(action === 'activate') await actionActivateRegistration(todo);
      else if(action === 'confirm_payment') await actionConfirmPayment(todo);
      else if(action === 'approve_profile') await actionProfileChange(todo, true);
      else if(action === 'reject_profile') await actionProfileChange(todo, false);
      else if(action === 'dismiss') await actionDismiss(todo);
      await renderActionCenter();
    }catch(err){
      toast('Gagal proses: '+(err.message||err));
      btn.disabled = false;
    }
  }
  async function renderActionCenter(){
    var el = qs('#adminTodoList');
    if(!el) return false;
    try{
      var c = await ready();
      if(!c) throw new Error('Client Supabase tidak terbaca.');
      var res = await c.from('admin_todos').select('*').in('todo_status',['new','processing']).order('priority',{ascending:true}).order('created_at',{ascending:true}).limit(50);
      if(res.error) throw res.error;
      var rows = res.data || [];
      el.innerHTML = rows.length ? rows.map(todoCard).join('') : '<div class="empty">Tidak ada notifikasi/tugas admin yang menunggu. Semua sudah beres.</div>';
      if(!el.getAttribute('data-kamar-actioncenter-bound')){
        el.setAttribute('data-kamar-actioncenter-bound','1');
        el.addEventListener('click', onTodoAction);
      }
      window.__KAMAR_TODO_CENTER_ACTIVE__ = true;
      return true;
    }catch(e){
      return false;
    }
  }
  async function injectStatus(){
    if(!/^admin/i.test(PAGE) || NO_STATUS_PAGES.indexOf(PAGE) !== -1 || qs('#kamarOnlineStatus29F')) return;
    var main = getMain(); if(!main) return;
    var box = document.createElement('section');
    box.className='split-card'; box.id='kamarOnlineStatus29F';
    box.innerHTML='<span class="mini-label">Status Database</span><div id="kamarOnlineStatusBody29F">Mengecek Supabase...</div>';
    main.insertBefore(box, main.children[1] || null);
    try{
      var c = await ready();
      if(!c) throw new Error('Client Supabase tidak terbaca.');
      var ok=0, err=0, samples=[];
      for(var i=0;i<Math.min(CRITICAL_TABLES.length,8);i++){
        try{ var r = await select(CRITICAL_TABLES[i], 1); ok++; samples.push(CRITICAL_TABLES[i]+': OK'); }
        catch(e){ err++; samples.push(CRITICAL_TABLES[i]+': '+(e.message||'ERROR')); }
      }
      qs('#kamarOnlineStatusBody29F',box).innerHTML='<div class="button-row"><span class="status-pill on">Client Supabase Terbaca</span><span class="status-pill">Tabel OK: '+ok+'</span><span class="status-pill warn">Error/Policy: '+err+'</span></div><p>'+esc(samples.join(' | '))+'</p><a class="btn secondary mini" href="admin-connection-check.html?v='+VERSION+'">Buka Cek Koneksi Lengkap</a>';
    }catch(e){
      qs('#kamarOnlineStatusBody29F',box).innerHTML='<div class="expired-note"><strong>Supabase belum siap</strong><br>'+esc(e.message||e)+'</div>';
    }
  }
  async function run(){
    if(!/^admin/i.test(PAGE)) return;
    rebuildSidebar();
    await injectStatus();
    await patchKamarAdminLocal();
    if(PAGE === 'admin.html') await renderActionCenter();
    if(MAP[PAGE]) await renderManager(MAP[PAGE]);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
