(function(){
  'use strict';
  function fmtPips(n){
    n = Number(n)||0;
    var s = Math.round(n).toLocaleString('id-ID');
    return (n>=0?'+':'') + s;
  }
  function fmtWinrate(n){
    if(n===null||n===undefined||isNaN(Number(n))) return '-';
    return Math.round(Number(n)) + '%';
  }
  var TF_ORDER = ['M1','M5','M15','M30','H1','H4','Daily'];
  function renderStats(container, rows){
    if(!rows || !rows.length){
      container.innerHTML = '<div class="kamar-recap-empty">Rekap performa belum tersedia untuk periode ini.</div>';
      return;
    }
    var sorted = rows.slice().sort(function(a,b){ return TF_ORDER.indexOf(a.timeframe) - TF_ORDER.indexOf(b.timeframe); });
    container.innerHTML = sorted.map(function(r){
      return '<div><strong>' + esc(r.timeframe) + ' \u2022 ' + fmtWinrate(r.winrate) + ' WR</strong><span>' + fmtPips(r.total_pips) + ' pips (' + (r.total_signal||0) + ' signal)</span></div>';
    }).join('');
  }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  async function loadAndRender(){
    var targets = document.querySelectorAll('[data-kamar-recap-stats]');
    if(!targets.length) return;
    try{
      var client = window.kamarSupabaseClient;
      if(!client && window.KamarSupabase && window.KamarSupabase.ready) client = await window.KamarSupabase.ready();
      if(!client) return;
      var res = await fetch(client.supabaseUrl + '/rest/v1/rpc/kamar_signal_public_stats', {
        method: 'POST',
        headers: { apikey: client.supabaseKey, Authorization: 'Bearer ' + client.supabaseKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_recap_type: 'WEEKLY' })
      });
      if(!res.ok) return;
      var rows = await res.json();
      targets.forEach(function(t){ renderStats(t, rows); });
    }catch(e){}
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', loadAndRender); else loadAndRender();
})();
