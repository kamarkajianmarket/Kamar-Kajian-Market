(function(){
  'use strict';
  if(window.__KAMAR_ADMIN_ONLINE_29F__) return;
  window.__KAMAR_ADMIN_ONLINE_29F__ = true;

 var PAGE = (location.pathname.split('/').pop() || 'index.html').toLowerCase();

 // RENAMED (2026-07-31): "kamar_study" is the internal technical key (matches
 // the real DB column/enum value and existing payment records) - only the
 // text admin actually SEES has changed, to match the homepage's facility
 // name. Do not rename the FACILITY_COLUMN key below; it would break lookups
 // against existing payments/todos already stored with the old slug.
 var FACILITY_COLUMN = {
   kamar_study:'access_kamar_study',
   materi_edukasi:'access_materi_edukasi',
   kamar_private:'access_kamar_private',
   kamar_indikator:'access_kamar_indikator',
   kamar_robot:'access_kamar_robot'
 };
  var FACILITY_LABEL = {
    kamar_study:'Kamar Signal',
    materi_edukasi:'Kamar Edukasi',
    kamar_private:'Kamar Private',
    kamar_indikator:'Kamar Indikator',
    kamar_robot:'Kamar Robot'
  };

 // FIXED (2026-07-30): table/column names below verified directly against the
 // live Supabase schema. Every admin content page below now points at a table
 // and column set that actually exists.
 // UPDATED (2026-07-31, Tahap 1 - bersihkan bahasa teknis): enum values below
 // are still the real database values (must stay exactly as-is so writes keep
 // working) but are now shown to admin through ENUM_LABELS as plain Indonesian
 // text instead of raw values like "kamar_study" or "public".
 var ENUM_FIELDS = {
   'display_area': ['public','member','admin','both','global'],
   'access_required': ['public','member','kamar_study','materi_edukasi','kamar_private','kamar_indikator','kamar_robot','all_paid'],
   'publish_status': ['draft','published','hidden'],
   'file_type': ['indicator','robot','template','pdf','other']
 };
  var ENUM_LABELS = {
    display_area:{ public:'Halaman Publik (Semua Pengunjung)', member:'Khusus Member', admin:'Khusus Admin', both:'Member & Pengunjung', global:'Semua Halaman' },
    access_required:{ public:'Bebas, Semua Orang', member:'Member Terdaftar', kamar_study:FACILITY_LABEL.kamar_study, materi_edukasi:FACILITY_LABEL.materi_edukasi, kamar_private:FACILITY_LABEL.kamar_private, kamar_indikator:FACILITY_LABEL.kamar_indikator, kamar_robot:FACILITY_LABEL.kamar_robot, all_paid:'Semua Member Berbayar' },
    publish_status:{ draft:'Draft (Belum Tayang)', published:'Tayang', hidden:'Disembunyikan' },
    file_type:{ indicator:'Indikator', robot:'Robot Trading', template:'Template', pdf:'PDF / Dokumen', other:'Lainnya' }
  };
  var FIELD_LABELS = {
    title:'Judul', body:'Isi Pesan', image_url:'Link Gambar (opsional)', cta_label:'Teks Tombol (opsional)',
    cta_url:'Link Tombol (opsional)', display_area:'Tampil di Mana', is_active:'Aktifkan',
    youtube_url:'Link Video YouTube', category:'Kategori', description:'Deskripsi', material_url:'Link File Materi',
    version_label:'Versi', access_required:'Untuk Siapa', publish_status:'Status Tayang',
    admin_notes:'Catatan Internal (tidak tampil ke member)', file_type:'Jenis File', file_url:'Link File',
    changelog:'Catatan Perubahan', maintenance_key:'Kode Fasilitas', message:'Pesan', setting_key:'Nama Pengaturan',
    setting_value:'Isi Pengaturan', key:'Kode', label:'Nama Tampilan', url:'Link', name:'Nama',
    bank_name:'Nama Bank', account_name:'Nama Pemilik Rekening', account_number:'Nomor Rekening',
    instructions:'Petunjuk Pembayaran', value:'Isi'
  };

 // NOTE (2026-07-31): 'admin-maintenance.html' sengaja TIDAK dimasukkan ke MAP
 // ini - halaman itu sudah punya tampilan toggle ON/OFF sendiri, jadi kalau
 // ditambahkan di sini akan muncul dua form yang membingungkan di halaman
 // yang sama.
 var MAP = {
   'admin-banner.html': { table:'banners', title:'Banner Pengumuman', fields:['title','body','image_url','cta_label','cta_url','display_area','is_active'],
                         help:'Buat pengumuman yang tampil di bagian atas halaman utama atau dashboard member.',
                         steps:['Isi judul dan pesan pengumuman di form di bawah.','Pilih mau tampil di halaman mana.','Klik Simpan untuk menayangkan (atau biarkan nonaktif dulu kalau belum mau tampil).'] },
   'admin-video.html': { table:'videos', title:'Konten Video', fields:['title','youtube_url','category','description','display_area','access_required','publish_status','is_active'],
                        help:'Tambahkan video edukasi yang bisa ditonton member.',
                        steps:['Tempel link video YouTube di form.','Pilih siapa yang boleh menonton video ini.','Pilih status Tayang supaya video langsung terlihat member.'] },
   'admin-materials.html': { table:'materials', title:'Konten & Materi', fields:['title','category','description','material_url','version_label','access_required','publish_status','admin_notes','is_active'],
                            help:'Unggah materi belajar seperti PDF atau dokumen untuk member.',
                            steps:['Tempel link file materi (Google Drive/tempat penyimpanan lain).','Tentukan fasilitas mana yang boleh mengakses materi ini.','Pilih status Tayang agar materi langsung muncul di dashboard member.'] },
   'admin-tools.html': { table:'tools_files', title:'File Tools', fields:['title','file_type','file_url','version_label','changelog','access_required','publish_status','admin_notes','is_active'],
                        help:'Kelola file tools, indikator, atau robot trading yang bisa diunduh member.',
                        steps:['Tempel link file tools.','Tentukan untuk siapa file ini (fasilitas mana).','Pilih status Tayang agar file bisa diunduh member.'] },
   'admin-settings.html': { table:'site_settings', title:'Pengaturan Umum', fields:['setting_key','setting_value','description','is_active'], jsonFields:['setting_value'],
                           help:'Atur pengaturan umum website, seperti nama produk atau kontak.',
                           steps:['Isi nama pengaturan dan isinya di form.','Klik Simpan.','Pengaturan baru langsung dipakai website setelah disimpan.'] },
   'admin-links.html': { table:'link_settings', title:'Pengaturan Link', fields:['key','label','url','is_active'],
                        help:'Atur link-link penting seperti Telegram, WhatsApp admin, atau link pembayaran.',
                        steps:['Isi kode link, contoh: telegram atau whatsapp.','Isi nama tampilan dan link aslinya.','Klik Simpan lalu aktifkan link tersebut.'] },
   'admin-payment.html': { table:'payment_gateways', title:'Payment Gateway', fields:['name','bank_name','account_name','account_number','instructions','is_active'],
                          help:'Atur rekening/metode pembayaran yang muncul ke member.',
                          steps:['Isi nama bank/metode pembayaran.','Isi nama & nomor rekening, plus petunjuk transfer.','Aktifkan metode ini supaya muncul ke member.'] },
   'admin-page-control.html': { table:'homepage_settings', title:'Kontrol Halaman Utama', fields:['key','value','description','is_active'], jsonFields:['value'],
                               help:'Atur bagian mana saja yang tampil di halaman utama (landing page) website.',
                               steps:['Isi kode bagian yang mau diatur.','Isi keterangan singkat.','Aktifkan/nonaktifkan sesuai kebutuhan.'] },
   'admin-dashboard-control.html': { table:'dashboard_settings', title:'Kontrol Dashboard Member', fields:['key','value','description','is_active'], jsonFields:['value'],
                                    help:'Atur tampilan dan akses dashboard member.',
                                    steps:['Isi kode pengaturan dashboard.','Isi keterangan singkat.','Aktifkan/nonaktifkan sesuai kebutuhan.'] }
 };

 // NEW (2026-07-30): every admin-*.html file has always had its OWN
 // copy-pasted <aside class="split-sidebar"> markup, and over time these
 // copies drifted out of sync. SIDEBAR_SECTIONS below is the single source
 // of truth for the admin menu; rebuildSidebar() regenerates the sidebar
 // identically on every admin page so new/renamed menu items only ever need
 // to be edited here.
 // UPDATED (2026-07-31, Tahap 1): removed "Cek Data Admin" and
 // "Cek Koneksi DB" per direct request - dianggap tidak berguna untuk admin
 // sehari-hari. Halaman aslinya masih ada di server tapi tidak lagi
 // dilink dari menu manapun.
 var SIDEBAR_SECTIONS = [
   { label:'Utama', items:[ ['admin.html','Dashboard Admin'] ] },
   { label:'Member & Akses', items:[
     ['admin-members.html','Data Member'],
     ['admin-internal.html','Data Internal'],
     ['admin-activation.html','Aktivasi Akun & Fasilitas']
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
     ['admin-payment-products.html','Katalog Harga & Produk'],
     ['admin-links.html','Pengaturan Link'],
     ['admin-settings.html','Pengaturan Umum']
     ]},
   { label:'Akun', items:[ ['index.html','Logout'] ] }
   ];

 function qs(s,r){ return (r||document).querySelector(s); }
  function esc(v){ return String(v == null ? '' : v).replace(/[&<>\"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]||c;}); }
  function bool(v){ return v === true || v === 'true' || v === 1 || v === '1' || /aktif|active|on|yes/i.test(String(v||'')); }
  function toast(msg){ if(typeof window.toast === 'function') return window.toast(msg); var t=document.getElementById('toast'); if(t){ t.textContent=msg||''; t.classList.add('show'); setTimeout(function(){t.classList.remove('show')},2600); return; } try{ alert(msg); }catch(e){} }

 // NEW (2026-07-31, Tahap 1): satu blok CSS yang disuntikkan sekali ke setiap
 // halaman admin, supaya sub-menu sidebar yang bisa dibuka/tutup dan tampilan
 // kartu data (Konten Website/Kontrol Sistem) selalu SAMA persis di semua
 // halaman - tidak perlu edit style.css di puluhan file satu-satu.
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
     '.online-card-list{display:grid;gap:14px}'+
     '.online-card{border:1px solid rgba(238,206,122,.16);border-radius:20px;background:rgba(255,255,255,.03);padding:16px 18px}'+
     '.online-card-row{display:flex;justify-content:space-between;gap:14px;padding:6px 0;border-bottom:1px solid rgba(238,206,122,.08)}'+
     '.online-card-row:last-of-type{border-bottom:0}'+
     '.online-card-row span{color:#d8cda9;font-weight:800;font-size:13px}'+
     '.online-card-row strong{color:#f5f0e6;font-weight:700;text-align:right;max-width:60%}'+
     '.online-card details{margin-top:8px}'+
     '.online-card summary{cursor:pointer;color:#e9d79f;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.08em;list-style:none}'+
     '.online-card summary::-webkit-details-marker{display:none}'+
     '.manager-help{border:1px solid rgba(158,255,202,.22);background:rgba(28,97,65,.08);border-radius:20px;padding:16px 18px;margin-bottom:4px;color:#d8f5e4}'+
     '.manager-help strong{color:#eafff2}'+
     '.manager-help ol{margin:8px 0 0;padding-left:18px;color:#c9ffe1}'+
     '.manager-help li{margin-bottom:4px}'+
     '.admin-toolbar-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;align-items:end}'+
     '.admin-toolbar-grid label{display:flex;flex-direction:column;gap:8px;font-weight:900;color:#d8d0bd;font-size:13px}'+
     '.admin-table-card{display:grid;gap:12px}'+
     '.admin-row{display:grid;grid-template-columns:1.3fr 1.3fr .8fr 1fr 1.4fr auto;gap:14px;align-items:center;border:1px solid rgba(238,206,122,.14);border-radius:22px;background:rgba(255,255,255,.025);padding:16px}'+
     '.admin-row.header{border:0;background:transparent;padding:6px 16px;color:#e7d391;text-transform:uppercase;letter-spacing:.14em;font-size:11px;font-weight:1000}'+
     '.admin-row[data-toggle-row]{cursor:pointer}.admin-row.row-collapsed{grid-template-columns:1.4fr 1.6fr .8fr auto}.admin-row.row-collapsed .admin-row-hide{display:none}'+
     '.admin-row strong{display:block;color:#fff3d8}'+
     '.admin-row small{display:block;color:rgba(245,240,230,.62);margin-top:4px;line-height:1.4}'+
     '.admin-row-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}'+
     '.admin-empty{border:1px dashed rgba(238,206,122,.25);border-radius:22px;padding:20px;color:#d8d0bd;background:rgba(255,255,255,.02);line-height:1.6}'+
     '.admin-empty-state{border:1px dashed rgba(238,206,122,.25);border-radius:22px;padding:20px;color:#d8d0bd;background:rgba(255,255,255,.02);line-height:1.6}'+
     '.admin-note-soft{color:#d8cda9;font-size:13px;line-height:1.6}'+
     '.admin-detail-card-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px}'+
     '.admin-detail-box{border:1px solid rgba(238,206,122,.14);border-radius:20px;background:rgba(255,255,255,.025);padding:16px}'+
     '.admin-detail-box span{display:block;text-transform:uppercase;letter-spacing:.12em;font-size:11px;font-weight:1000;color:#e7d391}'+
     '.admin-detail-box strong{display:block;margin-top:7px;color:#fff4db}'+
     '.admin-detail-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}'+
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
    if(!c) throw new Error('Data belum bisa dibaca.');
    var res = await c.from(table).select('*',{count:'exact'}).limit(limit || 200);
    if(res.error) throw res.error;
    return res;
  }
  async function insert(table, row){
    var c = await ready(); if(!c) throw new Error('Data belum bisa disimpan.');
    var res = await c.from(table).insert(row).select();
    if(res.error) throw res.error;
    return res.data || [];
  }
  async function update(table, id, row){
    var c = await ready(); if(!c) throw new Error('Data belum bisa disimpan.');
    var q = c.from(table).update(row);
    if(id) q = q.eq('id', id);
    var res = await q.select();
    if(res.error) throw res.error;
    return res.data || [];
  }
  async function remove(table, id){
    var c = await ready(); if(!c) throw new Error('Data belum bisa dihapus.');
    var res = await c.from(table).delete().eq('id', id);
    if(res.error) throw res.error;
    return true;
  }
  function getMain(){ return qs('.split-main') || qs('main') || document.body; }
  function fieldLabel(name){ return FIELD_LABELS[name] || name; }
  function fieldInput(name){
    if(ENUM_FIELDS[name]){
      var labels = ENUM_LABELS[name] || {};
      var opts = '<option value="">— Pilih —</option>'+ENUM_FIELDS[name].map(function(v){return '<option value="'+esc(v)+'">'+esc(labels[v]||v)+'</option>';}).join('');
      return '<label class="field"><span>'+esc(fieldLabel(name))+'</span><select name="'+esc(name)+'">'+opts+'</select></label>';
    }
    var type = /url|link|file|image|youtube/i.test(name) ? 'url' : /enabled|is_active|active/i.test(name) ? 'checkbox' : 'text';
    if(/message|description|instructions|value|changelog|notes/i.test(name)) type='textarea';
    if(type==='textarea') return '<label class="field"><span>'+esc(fieldLabel(name))+'</span><textarea name="'+esc(name)+'" placeholder="Isi '+esc(fieldLabel(name).toLowerCase())+'"></textarea></label>';
    if(type==='checkbox') return '<label class="toggle-row"><span><strong>'+esc(fieldLabel(name))+'</strong><small>Aktif / nonaktif</small></span><input type="checkbox" name="'+esc(name)+'"></label>';
    return '<label class="field"><span>'+esc(fieldLabel(name))+'</span><input type="'+type+'" name="'+esc(name)+'" placeholder="Isi '+esc(fieldLabel(name).toLowerCase())+'"></label>';
  }
  function displayValue(field, v){
    if(v == null || v === '') return '-';
    if(ENUM_FIELDS[field]){ var labels = ENUM_LABELS[field] || {}; return esc(labels[v] || v); }
    if(typeof v === 'boolean') return v ? 'Aktif' : 'Nonaktif';
    if(typeof v === 'object') return esc(JSON.stringify(v)).slice(0,180);
    return esc(v).slice(0,180);
  }
  function renderRows(rows, cfg){
    if(!rows.length) return '<div class="admin-empty-state">Belum ada data. Tambahkan data pertama lewat form di atas.</div>';
    var main = cfg.fields.slice(0,3), rest = cfg.fields.slice(3);
    return '<div class="online-card-list">'+rows.map(function(r){
      var mainHtml = main.map(function(f){ return '<div class="online-card-row"><span>'+esc(fieldLabel(f))+'</span><strong>'+displayValue(f,r[f])+'</strong></div>'; }).join('');
      var restHtml = rest.map(function(f){ return '<div class="online-card-row"><span>'+esc(fieldLabel(f))+'</span><strong>'+displayValue(f,r[f])+'</strong></div>'; }).join('');
      return '<div class="online-card">'+mainHtml+(restHtml?'<details><summary>Lihat detail lain</summary>'+restHtml+'</details>':'')+'<div class="button-row"><button class="btn mini danger" data-online-delete="'+esc(r.id||'')+'" '+(!r.id?'disabled':'')+'>Hapus</button></div></div>';
    }).join('')+'</div>';
  }
  // NEW (2026-07-31, Tahap 1 - perbaikan tambahan): setiap halaman
 // admin-*.html untuk Konten Website/Kontrol Sistem ternyata masih punya
 // kotak placeholder BAWAAN di HTML aslinya sebelum konten ini dimuat -
 // "Memuat Data Supabase / Halaman ini sedang membaca data real." Kotak ini
 // tidak pernah dihapus otomatis, jadi tetap terlihat berdampingan dengan
 // form yang sudah dirapikan. removeLegacyNotice() menghapusnya begitu
 // halaman selesai memuat, supaya tidak ada lagi kata "Supabase" yang
 // kelihatan di layar admin.
 function removeLegacyNotice(){
   var main = getMain(); if(!main) return;
   Array.prototype.slice.call(main.querySelectorAll('.page-note')).forEach(function(el){
     if(/supabase/i.test(el.textContent||'')){
       var card = el.closest('.split-card');
       (card || el).remove();
     }
   });
 }
  async function renderManager(cfg){
    var main = getMain();
    if(!main || qs('#kamarOnlineManager29F')) return;
    injectSharedStyles();
    removeLegacyNotice();
    var box = document.createElement('section');
    box.className = 'split-card';
    box.id = 'kamarOnlineManager29F';
    var stepsHtml = (cfg.steps && cfg.steps.length) ? '<div class="manager-help"><strong>Cara pakai halaman ini:</strong><ol>'+cfg.steps.map(function(s){return '<li>'+esc(s)+'</li>';}).join('')+'</ol></div>' : '';
    box.innerHTML = '<h2>'+esc(cfg.title)+'</h2>'+(cfg.help?'<p>'+esc(cfg.help)+'</p>':'')+stepsHtml+'<form id="onlineForm29F" class="grid-2 kamar-form-grid">'+cfg.fields.map(fieldInput).join('')+'<div class="button-row full"><button class="btn" type="submit">Simpan</button><button class="btn secondary" type="button" id="reloadOnline29F">Muat Ulang</button></div></form><div id="onlineData29F" class="preview-box">Memuat data...</div>';
    main.appendChild(box);
    async function reload(){
      var target = qs('#onlineData29F', box);
      target.innerHTML = 'Memuat data...';
      try{
        var res = await select(cfg.table, 200);
        var count = res.count != null ? res.count : (res.data||[]).length;
        target.innerHTML = '<div class="button-row"><span class="status-pill on">Data Siap</span><span class="status-pill">Jumlah: '+count+'</span></div>'+renderRows(res.data||[], cfg);
      }catch(e){
        target.innerHTML = '<div class="expired-note"><strong>Data belum bisa dimuat</strong><br>Coba klik "Muat Ulang". Jika masih gagal, hubungi pengelola teknis website.</div>';
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
            try{ row[f] = raw === '' ? null : JSON.parse(raw); }
            catch(e2){ row[f] = raw === '' ? null : raw; }
          } else {
            row[f] = raw === '' ? null : raw;
          }
        }
      });
      if(!('created_at' in row)) row.created_at = new Date().toISOString();
      if(!('updated_at' in row)) row.updated_at = new Date().toISOString();
      try{ await insert(cfg.table, row); toast('Data berhasil disimpan.'); e.target.reset(); await reload(); }
      catch(err){ toast('Gagal simpan: '+(err.message||err)); }
    });
    qs('#reloadOnline29F', box).onclick = reload;
    box.addEventListener('click', async function(e){
      var id = e.target && e.target.getAttribute('data-online-delete');
      if(!id) return;
      if(!confirm('Yakin mau menghapus data ini?')) return;
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
      }catch(e){ toast('Gagal update, coba lagi: '+(e.message||e)); return oldActivate ? oldActivate(id) : false; }
    };
    K.suspendMember = async function(id){
      try{ await update('member_profiles', id, { status:'suspended', account_status:'suspended', updated_at:new Date().toISOString() }); toast('Member disuspend online.'); return true; }
      catch(e){ toast('Gagal update, coba lagi: '+(e.message||e)); return oldSuspend ? oldSuspend(id) : false; }
    };
    K.toggleFacility = async function(id,fac,on,duration,note){
      try{
        var row = { member_id:id, facility_name:fac, is_active:!!on, duration:String(duration||''), note:String(note||''), updated_at:new Date().toISOString() };
        await insert('member_access', row);
        toast((on?'Fasilitas aktif online: ':'Fasilitas nonaktif online: ')+fac); return true;
      }catch(e){ toast('Gagal update akses, coba lagi: '+(e.message||e)); return oldToggle ? oldToggle(id,fac,on,duration,note) : false; }
    };
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
    affiliate_payout_change: 'Perubahan Rekening Affiliate'
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
    var actionsHtml;
    if(todo.todo_type === 'new_registration'){
      actionsHtml = '<button class="btn mini" type="button" data-todo-action="activate" data-todo-id="'+esc(todo.id)+'">Aktivasi</button>';
    } else if(todo.todo_type === 'new_payment' || todo.todo_type === 'upgrade_request' || todo.todo_type === 'renewal_request'){
      actionsHtml = '<button class="btn mini" type="button" data-todo-action="confirm_payment" data-todo-id="'+esc(todo.id)+'">Verifikasi</button>';
    } else if(todo.todo_type === 'profile_change'){
      actionsHtml = '<button class="btn mini" type="button" data-todo-action="approve_profile" data-todo-id="'+esc(todo.id)+'">Setujui</button> <button class="btn mini secondary" type="button" data-todo-action="reject_profile" data-todo-id="'+esc(todo.id)+'">Tolak</button>';
    } else if(todo.todo_type === 'license_request'){
      actionsHtml = '<button class="btn mini" type="button" data-todo-action="approve_license" data-todo-id="'+esc(todo.id)+'">Setujui</button> <button class="btn mini secondary" type="button" data-todo-action="reject_license" data-todo-id="'+esc(todo.id)+'">Tolak</button>';
    } else if(todo.todo_type === 'affiliate_payout_change'){
      actionsHtml = '<button class="btn mini" type="button" data-todo-action="approve_affiliate_payout" data-todo-id="'+esc(todo.id)+'">Setujui</button> <button class="btn mini secondary" type="button" data-todo-action="reject_affiliate_payout" data-todo-id="'+esc(todo.id)+'">Tolak</button>';
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
      else if(action === 'approve_license') await actionLicenseRequest(todo, true);
      else if(action === 'reject_license') await actionLicenseRequest(todo, false);
      else if(action === 'approve_affiliate_payout') await actionAffiliatePayoutChange(todo, true);
      else if(action === 'reject_affiliate_payout') await actionAffiliatePayoutChange(todo, false);
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
      if(!c) throw new Error('Data belum bisa dibaca.');
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
  async function run(){
    if(!/^admin/i.test(PAGE)) return;
    injectSharedStyles();
    rebuildSidebar();
    await patchKamarAdminLocal();
    if(PAGE === 'admin.html') await renderActionCenter();
    if(MAP[PAGE]) await renderManager(MAP[PAGE]);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
