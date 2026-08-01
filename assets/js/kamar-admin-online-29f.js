(function(){
  'use strict';
  if(window.__KAMAR_ADMIN_ONLINE_29F__) return;
  window.__KAMAR_ADMIN_ONLINE_29F__ = true;

  var PAGE = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  var VERSION = '29F';
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
      ['admin-activation.html','Aktivasi Akun & Fasilitas']
      ] },
    { label:'Affiliate', items:[
      ['admin-affiliate-overview.html','Data Affiliate'],
      ['admin-affiliate-list.html','Daftar Affiliator'],
      ['admin-affiliate-reward.html','Reward / Komisi']
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
  function toast(msg){ if(window.toast) return window.toast(msg); try{ alert(msg); }catch(e){} }

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
        target.innerHTML = '<div class="expired-note"><strong>Belum bisa membaca tabel '+esc(cfg.table)+'</strong><br>'+esc(e.message || e)+'<br><br>Jika tabel ada, aktifkan RLS SELECT/INSERT/UPDATE untuk akun auth/admin atau anon sesuai kebutuhan.</div>';
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
  async function run(){
    if(!/^admin/i.test(PAGE)) return;
    injectSharedStyles();
    rebuildSidebar();
    await patchKamarAdminLocal();
    if(MAP[PAGE]) await renderManager(MAP[PAGE]);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
