(function(){
  'use strict';
  function injectStyle(){
    if(document.getElementById('kamarRecapCardStyle')) return;
    var st = document.createElement('style');
    st.id = 'kamarRecapCardStyle';
    st.textContent = '.kamar-recap-stats{display:grid;gap:10px;margin:14px 0}' +
      '.kamar-recap-stats>div{padding:10px 14px;border-radius:14px;background:rgba(184,138,61,.07);border:1px solid rgba(184,138,61,.18)}' +
      '.kamar-recap-stats>div strong{display:block;font-size:15px;margin-bottom:2px}' +
      '.kamar-recap-stats>div strong .wr{color:#8a6420 !important;font-weight:800}' +
      '.kamar-recap-stats>div span.pips{display:block;font-size:13px;font-weight:700}' +
      '.kamar-recap-stats>div span.pips.pos{color:#15803d !important}' +
      '.kamar-recap-stats>div span.pips.neg{color:#b91c1c !important}' +
      '.kamar-recap-empty{opacity:.6;font-size:14px}' +
      '.kamar-recap-period{font-size:12px;opacity:.6;margin:2px 0 4px}' +
      '.kamar-recap-daily-section{margin-top:22px;padding-top:18px;border-top:1px dashed rgba(184,138,61,.28)}' +
      '.kamar-recap-daily-label{display:inline-block;font-size:11px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#8a6420;background:rgba(184,138,61,.14);padding:3px 10px;border-radius:999px;margin-bottom:6px}' +
      '.kamar-recap-live-card{grid-column:1/-1;margin-top:18px;padding:26px 30px;border-radius:22px;background:linear-gradient(135deg,rgba(255,255,255,.75),rgba(255,248,232,.55));border:1px solid rgba(184,138,61,.22);box-shadow:0 10px 32px rgba(184,138,61,.12)}' +
      '.kamar-recap-live-card h4{margin:8px 0 4px;font-size:21px}' +
      '.kamar-recap-live-card .kamar-recap-stats{display:grid !important;gap:16px !important;margin:18px 0 22px}' +
      '.kamar-recap-live-card .kamar-recap-stats>div{padding:20px 22px;border-radius:16px;background:rgba(255,255,255,.7);border:1px solid rgba(184,138,61,.2);text-align:left;transition:transform .15s ease}' +
      '.kamar-recap-live-card .kamar-recap-stats>div:hover{transform:translateY(-2px)}' +
      '.kamar-recap-live-card .kamar-recap-stats>div strong{font-size:19px;margin-bottom:6px}' +
      '.kamar-recap-live-card .kamar-recap-stats>div span.pips{font-size:14px}' +
      '.kamar-recap-live-card .btn{margin-top:6px}' +
      '@media(max-width:640px){.kamar-recap-live-card{padding:20px}.kamar-recap-live-card .kamar-recap-stats{grid-template-columns:repeat(2,1fr) !important}}';
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
      if(startFull === endFull) return 'Periode: ' + endFull;
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
  function ensureDailySection(weeklyContainer){
    var existing = weeklyContainer.parentNode.querySelector('.kamar-recap-daily-section');
    if(existing) return existing;
    var section = document.createElement('div');
    section.className = 'kamar-recap-daily-section';
    section.innerHTML =
      '<span class="kamar-recap-daily-label">Rekap Harian &middot; Kemarin</span>' +
      '<div class="kamar-recap-period kamar-recap-period-daily"></div>' +
      '<div class="kamar-recap-stats kamar-recap-stats-daily"></div>';
    weeklyContainer.insertAdjacentElement('afterend', section);
    return section;
  }
  var TF_ORDER = ['M1','M5','M15','M30','H1','H4','Daily'];
  function pipsClass(n){
    return (Number(n)||0) >= 0 ? 'pos' : 'neg';
  }
  function statCardsHtml(rows){
    var sorted = rows.slice().sort(function(a,b){ return TF_ORDER.indexOf(a.timeframe) - TF_ORDER.indexOf(b.timeframe); });
    return sorted.map(function(r){
      return '<div><strong>' + esc(r.timeframe) + ' &bull; <span class="wr">' + fmtWinrate(r.winrate) + ' WR</span></strong><span class="pips ' + pipsClass(r.total_pips) + '">' + fmtPips(r.total_pips) + ' pips (' + (r.total_signal||0) + ' signal)</span></div>';
    }).join('');
  }
  function applyColumns(container, count){
    if(container.closest('.kamar-recap-live-card')){
      var cols = Math.min(count, 4) || 1;
      container.style.setProperty('grid-template-columns', 'repeat(' + cols + ', 1fr)', 'important');
    }
  }
  function renderStats(container, rows){
    var periodEl = ensurePeriodEl(container);
    if(!rows || !rows.length){
      container.innerHTML = '<div class="kamar-recap-empty">Rekap performa belum tersedia untuk periode ini.</div>';
      periodEl.textContent = '';
      return;
    }
    periodEl.textContent = fmtPeriodRange(rows[0].period_start_wib, rows[0].period_end_wib);
    applyColumns(container, rows.length);
    container.innerHTML = statCardsHtml(rows);
  }
  function renderDaily(weeklyContainer, rows){
    var section = ensureDailySection(weeklyContainer);
    var periodEl = section.querySelector('.kamar-recap-period-daily');
    var grid = section.querySelector('.kamar-recap-stats-daily');
    if(!rows || !rows.length){
      grid.innerHTML = '<div class="kamar-recap-empty">Belum ada signal tercatat kemarin.</div>';
      periodEl.textContent = '';
      return;
    }
    periodEl.textContent = fmtPeriodRange(rows[0].period_start_wib, rows[0].period_end_wib);
    applyColumns(grid, rows.length);
    grid.innerHTML = statCardsHtml(rows);
  }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  async function fetchStats(client, recapType){
    var res = await fetch(client.supabaseUrl + '/rest/v1/rpc/kamar_signal_public_stats', {
      method: 'POST',
      headers: { apikey: client.supabaseKey, Authorization: 'Bearer ' + client.supabaseKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_recap_type: recapType })
    });
    if(!res.ok) return [];
    return res.json();
  }
  async function loadAndRender(){
    var targets = document.querySelectorAll('[data-kamar-recap-stats]');
    if(!targets.length) return;
    injectStyle();
    try{
      var client = window.kamarSupabaseClient;
      if(!client && window.KamarSupabase && window.KamarSupabase.ready) client = await window.KamarSupabase.ready();
      if(!client) return;
      var weeklyRows = await fetchStats(client, 'WEEKLY');
      var dailyRows = await fetchStats(client, 'DAILY');
      targets.forEach(function(t){
        renderStats(t, weeklyRows);
        renderDaily(t, dailyRows);
      });
    }catch(e){}
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', loadAndRender); else loadAndRender();
})();
