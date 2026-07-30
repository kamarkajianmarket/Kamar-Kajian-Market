(function(){
  'use strict';
  if(window.__KAMAR_ADMIN_ONLINE_29F__) return;
  window.__KAMAR_ADMIN_ONLINE_29F__ = true;

  var PAGE = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  var VERSION = '29G';
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

  function qs(s,r){ return (r||document).querySelector(s); }
  function esc(v){ return String(v == null ? '' : v).replace(/[&<>\"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]||c;}); }
  function bool(v){ return v === true || v === 'true' || v === 1 || v === '1' || /aktif|active|on|yes/i.test(String(v||'')); }
  function toast(msg){ if(window.toast) return window.toast(msg); try{ alert(msg); }catch(e){} }
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
    await injectStatus();
    await patchKamarAdminLocal();
    if(MAP[PAGE]) await renderManager(MAP[PAGE]);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
