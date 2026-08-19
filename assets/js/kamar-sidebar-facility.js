// Kamar Step 63: sidebar "Fasilitas Kamar" dynamic unlock.
// Sidebar links di split-sidebar (dashboard.html, affiliate-dashboard.html, member-*.html)
// sebelumnya HARDCODE class="disabled" + emoji lock di semua halaman, tidak pernah dicek
// ke akses member_access yang sebenarnya. Script ini membaca akses member yang login lalu
// membuka link fasilitas yang memang aktif. Kalau gagal fetch/koneksi, sidebar tetap seperti
// semula (terkunci) -- tidak ada resiko membuka akses yang salah.
(function(){
  var FACILITY_MAP = {
    'member-materials.html': { access: 'access_materi_edukasi', expires: 'expires_materi_edukasi' },
    'member-study.html': { access: 'access_kamar_study', expires: 'expires_kamar_study' },
    'member-private.html': { access: 'access_kamar_private', expires: 'expires_kamar_private' },
    'member-indicator.html': { access: 'access_kamar_indikator', expires: 'expires_kamar_indikator' },
    'member-robot.html': { access: 'access_kamar_robot', expires: 'expires_kamar_robot' }
  };

  async function getClient(){
    try{
      if(window.KamarSupabase && window.KamarSupabase.ready){
        var c = await window.KamarSupabase.ready();
        if(c) return c;
      }
    }catch(e){}
    if(window.kamarSupabaseClient) return window.kamarSupabaseClient;
    return null;
  }

  function isActive(row, key){
    if(!row || !row[key.access]) return false;
    if(row.locked_by_expired) return false;
    var exp = row[key.expires];
    if(!exp) return true;
    return new Date(exp).getTime() > Date.now();
  }

  function unlockLink(a){
    a.classList.remove('disabled');
    a.removeAttribute('aria-disabled');
    a.textContent = a.textContent.replace(/\s*\u{1F512}\s*$/u, '').trim();
  }

  async function run(){
    var links = document.querySelectorAll('.sidebar-group a[href]');
    if(!links.length) return;
    var byFile = {};
    links.forEach(function(a){
      var href = (a.getAttribute('href')||'').split('/').pop();
      if(FACILITY_MAP[href]) byFile[href] = a;
    });
    if(!Object.keys(byFile).length) return;

    try{
      var client = await getClient();
      if(!client) return;
      var sessionRes = await client.auth.getSession();
      var user = sessionRes && sessionRes.data && sessionRes.data.session && sessionRes.data.session.user;
      if(!user) return;
      var prof = await client.from('member_profiles').select('id').eq('user_id', user.id).maybeSingle();
      var profId = prof && prof.data && prof.data.id;
      if(!profId) return;
      var cols = ['locked_by_expired'];
      Object.keys(FACILITY_MAP).forEach(function(f){ cols.push(FACILITY_MAP[f].access, FACILITY_MAP[f].expires); });
      var acc = await client.from('member_access').select(cols.join(',')).eq('profile_id', profId).maybeSingle();
      var row = acc && acc.data;
      if(!row) return;
      Object.keys(byFile).forEach(function(file){
        if(isActive(row, FACILITY_MAP[file])) unlockLink(byFile[file]);
      });
    }catch(e){ }
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
