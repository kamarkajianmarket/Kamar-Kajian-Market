(function(){
  'use strict';
  if (window.KamarCardPager) return;

  function injectStyles(){
    if (document.getElementById('kamarCardPagerStyle')) return;
    var st = document.createElement('style');
    st.id = 'kamarCardPagerStyle';
    st.textContent =
      '.kamar-pager-page{animation:kamarPagerFade .3s ease}' +
      '@keyframes kamarPagerFade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}' +
      '.kamar-pager-bar{display:flex;align-items:center;justify-content:center;gap:6px;flex-wrap:wrap;margin-top:16px;padding-top:16px;border-top:1px solid rgba(200,180,120,.18)}' +
      '.kamar-pager-btn{min-width:36px;height:36px;padding:0 10px;border-radius:12px;border:1px solid rgba(180,150,80,.25);background:rgba(0,0,0,.03);color:#6b5f47;font-weight:800;font-size:13px;cursor:pointer;transition:.15s ease}' +
      '.kamar-pager-btn:hover{border-color:rgba(190,150,50,.55);color:#8a6a1f}' +
      '.kamar-pager-btn.active{background:linear-gradient(135deg,#e8c765,#b8862f);color:#fff;border-color:transparent}' +
      '.kamar-pager-btn:disabled{opacity:.35;cursor:not-allowed}' +
      '.kamar-pager-btn.dots{cursor:default;border-color:transparent;background:transparent}' +
      '.kamar-pager-info{color:#8a806c;font-size:12px;font-weight:700;margin-right:8px}' +
      '@media(max-width:480px){.kamar-pager-info{width:100%;text-align:center;margin:0 0 6px}}';
    document.head.appendChild(st);
  }

  function esc(v){ return String(v == null ? '' : v); }

  // opts: { container, items, perPage, renderItem(item,index)->html, headerHtml, emptyHtml, afterRender(pageItems), scrollOnPageChange }
  function create(opts){
    injectStyles();
    var container = opts.container;
    var perPage = opts.perPage || 10;
    var state = { page: 1 };

    function totalPages(items){ return Math.max(1, Math.ceil(items.length / perPage)); }

    function pageButtons(tp){
      var pages = [];
      var maxButtons = 7;
      if (tp <= maxButtons){ for (var p = 1; p <= tp; p++) pages.push(p); return pages; }
      pages.push(1);
      var lo = Math.max(2, state.page - 1), hi = Math.min(tp - 1, state.page + 1);
      if (lo > 2) pages.push('...');
      for (var p2 = lo; p2 <= hi; p2++) pages.push(p2);
      if (hi < tp - 1) pages.push('...');
      pages.push(tp);
      return pages;
    }

    function render(items){
      items = items || [];
      var tp = totalPages(items);
      if (state.page > tp) state.page = tp;
      if (state.page < 1) state.page = 1;
      var start = (state.page - 1) * perPage;
      var pageItems = items.length ? items.slice(start, start + perPage) : [];

      var rowsHtml = items.length
        ? pageItems.map(function(it, i){ return opts.renderItem(it, start + i); }).join('')
        : (opts.emptyHtml || '<div class="empty">Tidak ada data.</div>');

      var barHtml = '';
      if (items.length && tp > 1){
        barHtml += '<div class="kamar-pager-bar">';
        barHtml += '<span class="kamar-pager-info">Halaman ' + state.page + ' dari ' + tp + ' &middot; ' + items.length + ' data</span>';
        barHtml += '<button type="button" class="kamar-pager-btn" data-pager-nav="prev" ' + (state.page <= 1 ? 'disabled' : '') + '>&lsaquo;</button>';
        pageButtons(tp).forEach(function(p){
          if (p === '...'){ barHtml += '<span class="kamar-pager-btn dots">&hellip;</span>'; return; }
          barHtml += '<button type="button" class="kamar-pager-btn' + (p === state.page ? ' active' : '') + '" data-pager-page="' + p + '">' + p + '</button>';
        });
        barHtml += '<button type="button" class="kamar-pager-btn" data-pager-nav="next" ' + (state.page >= tp ? 'disabled' : '') + '>&rsaquo;</button>';
        barHtml += '</div>';
      }

      container.innerHTML = (opts.headerHtml || '') + '<div class="kamar-pager-page">' + rowsHtml + '</div>' + barHtml;

      function goTo(p){
        state.page = p;
        render(items);
        if (opts.scrollOnPageChange !== false){
          try { container.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) {}
        }
      }

      container.querySelectorAll('[data-pager-page]').forEach(function(b){
        b.addEventListener('click', function(){ goTo(Number(b.getAttribute('data-pager-page'))); });
      });
      container.querySelectorAll('[data-pager-nav]').forEach(function(b){
        b.addEventListener('click', function(){
          var dir = b.getAttribute('data-pager-nav');
          goTo(dir === 'prev' ? Math.max(1, state.page - 1) : Math.min(tp, state.page + 1));
        });
      });

      if (typeof opts.afterRender === 'function') opts.afterRender(pageItems);
    }

    return {
      render: render,
      resetPage: function(){ state.page = 1; },
      get page(){ return state.page; }
    };
  }

  window.KamarCardPager = { create: create };
})();
