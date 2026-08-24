(function(){
  'use strict';
  function injectStyle(){
    if(document.getElementById('kamarRecapCardStyle')) return;
    var st = document.createElement('style');
    st.id = 'kamarRecapCardStyle';
    st.textContent = '.kamar-recap-stats{display:grid;gap:10px;margin:14px 0}' +
      '.kamar-recap-stats>div{padding:10px 14px;border-radius:14px;background:rgba(184,138,61,.07);border:1px solid rgba(184,138,61,.18)}' +
      '.kamar-recap-stats>div strong{display:block;font-size:15px;margin-bottom:2px}' +
      '.kamar-recap-stats>div span{display:block;font-size:13px;opacity:.7}' +
      '.kamar-recap-empty{opacity:.6;font-size:14px}' +
      '.kamar-recap-period{font-size:12px;opacity:.65;margin:2px 0 10px}' +
      '.kamar-recap-live-card{margin-top:18px;padding:16px 18px;border-radius:18px;background:rgba(255,255,255,.55);border:1px solid rgba(184,138,61,.18)}' +
      '.kamar-recap-live-card h4{margin:4px 0 2px}';
    document.head.appendChild(st);
  }
  function fmtPips(n){
    n = Number(n)||0;
    var s = Math.round(n).toLocaleString('id-ID');
    return (n>=0?'+':'') + s;
  }
  function fmtWinrate(n){
    if(n===null||n===undefined||isNaN(Number(n))) return '-';
    return Math.round(Number(n)) + '%';
  }
  function fmtPeriodRange(startIso, endIso){
    if(!startIso || !endIso) return '';
    try{
      var start = new Date(startIso);
      var end = new Date(endIso);
      var dayOpt = { timeZone:'Asia/Jakarta', day:'2-digit' };
      var fullOpt = { timeZone:'Asia/Jakarta', day:'2-digit', month:'long', year:'numeric' };
      var startFull = new Intl.DateTimeFormat('id-ID', fullOpt).format(start);
      var endFull = new Intl.DateTimeFormat('id-ID', fullOpt).format(end);
      var startMonthYear = startFull.replace(/^\d+\s/, '');
      var endMonthYear = endFull.replace(/^\d+\s/, '');
      var startDay = new Intl.DateTimeFormat('id-ID', dayOpt).format(start);
      if(startMonthYear === endMonthYear) return 'Periode: ' + startDay + ' - ' + endFull;
      return 'Periode: ' + startFull + ' - ' + endFull;
    }catch(e){ return ''; }
  }
  function ensurePeriodEl(target){
    var prev = target.previousElementSibling;
    if(prev && prev.classList && prev.classList.contains('kamar-recap-period')) return prev;
    var el = document.createElement('div');
    el.className = 'kamar-recap-period';
    target.parentNode.insertBefore(el, target);
    return el;
  }
  var TF_ORDER = ['M1','M5','M15','M30','H1','H4','Daily'];
  function renderStats(container, rows){
    var periodEl = ensurePeriodEl(container);
    if(!rows || !rows.length){
      container.innerHTML = '<div class="kamar-recap-empty">Rekap performa belum tersedia untuk periode ini.</div>';
      periodEl.textContent = '';
      return;
    }
    periodEl.textContent = fmtPeriodRange(rows[0].period_start_wib, rows[0].period_end_wib);
    var sorted = rows.slice().sort(function(a,b){ return TF_ORDER.indexOf(a.timeframe) - TF_ORDER.indexOf(b.timeframe); });
    container.innerHTML = sorted.map(function(r){
      return '<div><strong>' + esc(r.timeframe) + ' • ' + fmtWinrate(r.winrate) + ' WR</strong><span>' + fmtPips(r.total_pips) + ' pips (' + (r.total_signal||0) + ' signal)</span></div>';
    }).join('');
  }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  async function loadAndRender(){
    var targets = document.querySelectorAll('[data-kamar-recap-stats]');
    if(!targets.length) return;
    injectStyle();
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
