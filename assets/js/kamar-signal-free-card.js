(function(){
  'use strict';
  function injectStyle(){
    if(document.getElementById('kamarSignalFreeStyle')) return;
    var st = document.createElement('style');
    st.id = 'kamarSignalFreeStyle';
    st.textContent = '.kamar-sigfree-card{padding:14px 16px;border-radius:16px;background:rgba(184,138,61,.07);border:1px solid rgba(184,138,61,.18);margin:14px 0}' +
      '.kamar-sigfree-card .pair{font-weight:800;font-size:16px;margin-bottom:2px}' +
      '.kamar-sigfree-card .meta{font-size:13px;opacity:.75;margin-bottom:10px}' +
      '.kamar-sigfree-card .levels{display:grid;grid-template-columns:repeat(auto-fit,minmax(90px,1fr));gap:8px;font-size:13px}' +
      '.kamar-sigfree-card .levels div{padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.5)}' +
      '.kamar-sigfree-card .levels div strong{display:block;font-size:11px;text-transform:uppercase;opacity:.6;margin-bottom:2px}' +
      '.kamar-sigfree-empty{opacity:.6;font-size:14px}';
    document.head.appendChild(st);
  }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function fmtNum(n){ return (n===null||n===undefined) ? '-' : Number(n).toLocaleString('id-ID'); }
  function render(container, row){
    injectStyle();
    if(!row){
      container.innerHTML = '<div class="kamar-sigfree-empty">Belum ada Signal Free aktif saat ini. Cek lagi jam 14:00 atau 20:00 WIB.</div>';
      return;
    }
    container.innerHTML =
      '<div class="kamar-sigfree-card">' +
        '<div class="pair">' + esc(row.setup_title || ((row.jenis_zona||'') + ' ' + (row.skenario||''))) + '</div>' +
        '<div class="meta">Timeframe M5 &middot; Status: ' + esc(row.status) + '</div>' +
        '<div class="levels">' +
          '<div><strong>Area</strong>' + fmtNum(row.area_low) + ' - ' + fmtNum(row.area_high) + '</div>' +
          '<div><strong>TP1</strong>' + fmtNum(row.tp1) + '</div>' +
          '<div><strong>Invalidasi</strong>' + fmtNum(row.invalidasi) + '</div>' +
        '</div>' +
      '</div>';
  }
  async function loadAndRender(){
    var targets = document.querySelectorAll('[data-kamar-signal-free]');
    if(!targets.length) return;
    try{
      var client = window.kamarSupabaseClient;
      if(!client && window.KamarSupabase && window.KamarSupabase.ready) client = await window.KamarSupabase.ready();
      if(!client) return;
      var sessRes = await client.auth.getSession();
      var token = (sessRes && sessRes.data && sessRes.data.session) ? sessRes.data.session.access_token : null;
      if(!token) return;
      var url = client.supabaseUrl + '/rest/v1/signals?select=id,timeframe,jenis_zona,skenario,setup_title,area_high,area_low,tp1,tp2,invalidasi,status,running_point,result_point,created_at&timeframe=eq.M5&visibility=in.(public,both)&order=created_at.desc&limit=1';
      var res = await fetch(url, { headers: { apikey: client.supabaseKey, Authorization: 'Bearer ' + token } });
      if(!res.ok) return;
      var rows = await res.json();
      targets.forEach(function(t){ render(t, rows[0] || null); });
    }catch(e){}
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', loadAndRender); else loadAndRender();
})();
