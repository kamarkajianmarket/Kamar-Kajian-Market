(function(){
  'use strict';
  function injectStyle(){
    if(document.getElementById('kamarSignalFreeStyle')) return;
    var st = document.createElement('style');
    st.id = 'kamarSignalFreeStyle';
    st.textContent = '.kamar-sigfree-card{padding:14px 16px;border-radius:16px;background:rgba(184,138,61,.07);border:1px solid rgba(184,138,61,.18);margin:14px 0}' +
      '.kamar-sigfree-card .pair{font-weight:800;font-size:16px;margin-bottom:2px}' +
      '.kamar-sigfree-card .meta{font-size:13px;opacity:.75;margin-bottom:8px;display:flex;align-items:center;gap:6px;flex-wrap:wrap}' +
      '.kamar-sigfree-card .status-badge{display:inline-block;padding:2px 9px;border-radius:999px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.03em}' +
      '.kamar-sigfree-card .status-badge.is-fresh{background:rgba(59,130,246,.15);color:#1d4ed8}' +
      '.kamar-sigfree-card .status-badge.is-active{background:rgba(184,138,61,.18);color:#8a6420}' +
      '.kamar-sigfree-card .status-badge.is-profit{background:rgba(34,197,94,.15);color:#15803d}' +
      '.kamar-sigfree-card .status-badge.is-loss{background:rgba(239,68,68,.15);color:#b91c1c}' +
      '.kamar-sigfree-card .progress{font-size:13px;margin-bottom:10px}' +
      '.kamar-sigfree-card .progress.muted{opacity:.65;font-style:italic}' +
      '.kamar-sigfree-card .progress strong.pos{color:#15803d}' +
      '.kamar-sigfree-card .progress strong.neg{color:#b91c1c}' +
      '.kamar-sigfree-card .levels{display:grid;grid-template-columns:repeat(auto-fit,minmax(90px,1fr));gap:8px;font-size:13px}' +
      '.kamar-sigfree-card .levels div{padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.5)}' +
      '.kamar-sigfree-card .levels div strong{display:block;font-size:11px;text-transform:uppercase;opacity:.6;margin-bottom:2px}' +
      '.kamar-sigfree-empty{opacity:.6;font-size:14px}';
    document.head.appendChild(st);
  }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function fmtNum(n, d){ return (n===null||n===undefined) ? '-' : Number(n).toLocaleString('id-ID', { maximumFractionDigits:(d==null?2:d), minimumFractionDigits:0 }); }
  // Rumus ini SENGAJA disamakan persis dengan pipsOf() di signal/assets/js/kamar-signal-main.js
  // supaya angka yang tampil di Signal Free selalu identik dengan sinyal aslinya di Kamar Signal.
  // - Cut loss murni (INVALID, belum sempat kena TP manapun): pakai running_point (nilai saat
  //   event invalidasi terjadi), tampilkan NEGATIF, dikali 10 (konversi ke pip broker 3-digit).
  // - Selain itu (FRESH/ACTIVE/atau sempat TP sebelum invalid): pakai rekor tertinggi yang
  //   pernah dicapai (max_running_point) supaya angka mengikuti tiap TP Hit, dikali 10.
  function pipsOf(row){
    if(row.status === 'INVALID' && (row.farthest_tp_level||0) === 0){
      var lossMag = row.running_point!=null ? Number(row.running_point) : (row.max_running_point!=null ? Number(row.max_running_point) : null);
      return lossMag!=null ? -Math.abs(lossMag)*10 : null;
    }
    if(row.max_running_point!=null) return Number(row.max_running_point)*10;
    return row.running_point!=null ? Number(row.running_point)*10 : null;
  }
  function pipsText(pips){
    if(pips===null||pips===undefined) return null;
    return (pips>=0?'+':'') + fmtNum(pips,1) + ' pips';
  }
  function statusInfo(status){
    var s = String(status||'').toUpperCase();
    if(s==='FRESH') return { label:'Fresh &middot; Menunggu Harga', cls:'is-fresh' };
    if(s==='ACTIVE') return { label:'Aktif &middot; Sedang Berjalan', cls:'is-active' };
    if(s==='INVALID') return { label:'Invalid &middot; Signal Batal', cls:'is-loss' };
    return { label: esc(status||'-'), cls:'' };
  }
  function render(container, row){
    injectStyle();
    if(!row){
      container.innerHTML = '<div class="kamar-sigfree-empty">Belum ada Signal Free aktif saat ini. Cek lagi jam 14:00 atau 20:00 WIB.</div>';
      return;
    }
    var s = String(row.status||'').toUpperCase();
    var info = statusInfo(row.status);
    var pips = pipsOf(row);
    var pText = pipsText(pips);
    var pCls = pips!=null ? (pips >= 0 ? 'pos' : 'neg') : '';
    var progressHtml = '';
    if(s==='ACTIVE'){
      progressHtml = '<div class="progress">Running saat ini: <strong class="' + pCls + '">' + (pText || '0 pips') + '</strong></div>';
    } else if(s==='INVALID'){
      progressHtml = '<div class="progress">Hasil akhir: <strong class="' + pCls + '">' + (pText || '0 pips') + '</strong></div>';
    } else if(s==='FRESH'){
      progressHtml = '<div class="progress muted">Menunggu harga masuk area&hellip;</div>';
    }
    container.innerHTML =
      '<div class="kamar-sigfree-card">' +
        '<div class="pair">' + esc(row.setup_title || ((row.jenis_zona||'') + ' ' + (row.skenario||''))) + '</div>' +
        '<div class="meta">Timeframe M5 <span class="status-badge ' + info.cls + '">' + info.label + '</span></div>' +
        progressHtml +
        '<div class="levels">' +
          '<div><strong>Area</strong>' + fmtNum(row.area_low) + ' - ' + fmtNum(row.area_high) + '</div>' +
          '<div><strong>TP1</strong>' + fmtNum(row.tp1) + '</div>' +
          '<div><strong>Invalidasi</strong>' + fmtNum(row.invalidasi) + '</div>' +
        '</div>' +
      '</div>';
  }
  var cachedToken = null;
  async function loadAndRender(){
    var targets = document.querySelectorAll('[data-kamar-signal-free]');
    if(!targets.length) return;
    try{
      var client = window.kamarSupabaseClient;
      if(!client && window.KamarSupabase && window.KamarSupabase.ready) client = await window.KamarSupabase.ready();
      if(!client) return;
      var token = cachedToken;
      if(!token){
        var sessRes = await client.auth.getSession();
        token = (sessRes && sessRes.data && sessRes.data.session) ? sessRes.data.session.access_token : null;
        cachedToken = token;
      }
      if(!token) return;
      var url = client.supabaseUrl + '/rest/v1/signals?select=id,timeframe,jenis_zona,skenario,setup_title,area_high,area_low,tp1,tp2,invalidasi,status,running_point,max_running_point,farthest_tp_level,result_point,created_at&timeframe=eq.M5&visibility=in.(public,both)&order=created_at.desc&limit=1';
      var res = await fetch(url, { headers: { apikey: client.supabaseKey, Authorization: 'Bearer ' + token } });
      if(res.status === 401 || res.status === 403){ cachedToken = null; return; }
      if(!res.ok) return;
      var rows = await res.json();
      targets.forEach(function(t){ render(t, rows[0] || null); });
    }catch(e){}
  }
  function start(){
    loadAndRender();
    setInterval(loadAndRender, 30000);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
