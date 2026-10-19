window.KamarUI=window.KamarUI||{toast:function(msg){console.log('[Kamar]',msg)}};

// ==========================================================================
// KAMAR SKELETON LOADING SYSTEM v1 - reveal/gate helpers
// Pair with assets/css/kamar-skeleton-v1.css (.kamar-skel-gate / .kamar-skel-revealed).
// Usage: mark an element "kamar-skel-gate" directly in the page's static HTML
// (so it's hidden before first paint, no flash), then call KamarUI.reveal(el)
// once the async data that decides its real content has resolved (success
// OR failure/empty - always reveal, never leave it stuck).
// A blanket failsafe below force-reveals any leftover gated element after
// 10s in case a page's script errors before calling reveal(), so a bug in
// one script can never permanently hide content.
// ==========================================================================
window.KamarUI.gate = window.KamarUI.gate || function(el){
  if(!el) return;
  el.classList.add('kamar-skel-gate');
};
window.KamarUI.reveal = window.KamarUI.reveal || function(el){
  if(!el) return;
  el.classList.remove('kamar-skel-gate');
  el.classList.add('kamar-skel-revealed');
};
window.KamarUI.revealAll = window.KamarUI.revealAll || function(selector){
  document.querySelectorAll(selector || '.kamar-skel-gate').forEach(function(el){
    window.KamarUI.reveal(el);
  });
};
(function(){
  if(window.__KAMAR_SKEL_FAILSAFE__) return;
  window.__KAMAR_SKEL_FAILSAFE__ = true;
  setTimeout(function(){
    document.querySelectorAll('.kamar-skel-gate').forEach(function(el){
      window.KamarUI.reveal(el);
    });
  }, 10000);
})();
window.KamarUI.autoReveal = window.KamarUI.autoReveal || function(el){
  if(!el || el.__kamarAutoObserved) return;
  el.__kamarAutoObserved = true;
  var obs = new MutationObserver(function(){
    window.KamarUI.reveal(el);
    obs.disconnect();
  });
  obs.observe(el, {childList:true, subtree:true, characterData:true});
};
(function(){
  function initAuto(){
    document.querySelectorAll('.kamar-skel-gate[data-skel-auto]').forEach(function(el){
      window.KamarUI.autoReveal(el);
    });
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', initAuto);
  } else {
    initAuto();
  }
})();
window.kamarFriendlyError=window.kamarFriendlyError||function(e){
  var raw=String((e&&e.message)||e||'');
  var low=raw.toLowerCase();
  if(!raw) return 'Terjadi kesalahan. Silakan coba lagi.';
  if(low.indexOf('duplicate key')>-1||low.indexOf('unique constraint')>-1) return 'Data ini sepertinya sudah pernah dikirim sebelumnya. Muat ulang halaman lalu coba lagi, atau hubungi admin bila masalah berlanjut.';
  if(low.indexOf('foreign key')>-1) return 'Data terkait tidak ditemukan. Muat ulang halaman lalu coba lagi.';
  if(low.indexOf('permission denied')>-1||low.indexOf('row-level security')>-1||low.indexOf(' rls')>-1) return 'Anda tidak memiliki izin untuk melakukan aksi ini. Hubungi admin bila ini seharusnya diizinkan.';
  if(low.indexOf('not-null')>-1) return 'Ada data wajib yang belum terisi. Periksa kembali formulir Anda.';
  if(low.indexOf('failed to fetch')>-1||low.indexOf('network')>-1||low.indexOf('load failed')>-1) return 'Koneksi internet bermasalah. Periksa koneksi Anda lalu coba lagi.';
  if(low.indexOf('jwt')>-1||low.indexOf('unauthorized')>-1||low.indexOf('401')>-1||low.indexOf('session')>-1) return 'Sesi login Anda sudah berakhir. Muat ulang halaman dan login kembali.';
  if(low.indexOf('timeout')>-1) return 'Permintaan memakan waktu terlalu lama. Coba lagi beberapa saat.';
  return 'Terjadi kesalahan saat memproses permintaan Anda. Coba lagi, atau hubungi admin bila masalah berlanjut.';
};


(function(){
'use strict';
if(window.__KAMAR_BTN_FEEDBACK__) return;
window.__KAMAR_BTN_FEEDBACK__ = true;
var css = '.kamar-btn-loading{position:relative!important;pointer-events:none!important;opacity:.7!important;cursor:progress!important}'+
'.kamar-btn-loading::after{content:"";position:absolute;top:50%;right:14px;width:15px;height:15px;margin-top:-8px;border-radius:50%;border:2px solid rgba(17,20,23,.28);border-top-color:currentColor;animation:kamarBtnSpin .6s linear infinite}'+
'@keyframes kamarBtnSpin{to{transform:rotate(360deg)}}';
function injectStyle(){
var styleEl=document.createElement('style');
styleEl.id='kamar-btn-feedback-style';
styleEl.textContent=css;
document.head.appendChild(styleEl);
}
if(document.head) injectStyle(); else document.addEventListener('DOMContentLoaded', injectStyle);
var SEL='.btn,.admin-button,.header-cta,.kamar-global-btn,.method-card,button[type="submit"],input[type="submit"],[data-todo-action]';
document.addEventListener('click', function(e){
var el = e.target && e.target.closest ? e.target.closest(SEL) : null;
if(!el) return;
if(el.hasAttribute('data-no-loading')) return;
if(el.classList.contains('kamar-btn-loading')) return;
if(el.disabled || el.getAttribute('aria-disabled')==='true') return;
if(el.tagName==='A'){
var href = el.getAttribute('href')||'';
if(!href || href.charAt(0)==='#' || href.toLowerCase().indexOf('javascript:')===0) return;
}
el.classList.add('kamar-btn-loading');
el.setAttribute('aria-busy','true');
if(el.tagName==='BUTTON'||el.tagName==='INPUT'){
setTimeout(function(){ try{ el.disabled=true; }catch(err){} }, 0);
}
setTimeout(function(){
el.classList.remove('kamar-btn-loading');
el.removeAttribute('aria-busy');
if(el.tagName==='BUTTON'||el.tagName==='INPUT'){ try{ el.disabled=false; }catch(err){} }
}, 6000);
}, true);
})();


// ==========================================================================
// KAMAR CARD REVEAL v1 - generic click-to-expand for info/action cards.
// Markup: <button type="button" class="kamar-reveal-head">...summary...<span class="kamar-reveal-arrow">&rsaquo;</span></button>
// followed immediately by a sibling <div class="kamar-reveal-body">...detail...</div>.
// Collapsed by default (CSS max-height:0). Each card toggles independently
// (not mutually exclusive like the step-guide accordion above).
// ==========================================================================
(function(){
if(window.__KAMAR_REVEAL_CARD__) return;
window.__KAMAR_REVEAL_CARD__ = true;
document.addEventListener('click', function(e){
var h = e.target && e.target.closest ? e.target.closest('.kamar-reveal-head') : null;
if(!h) return;
var body = h.nextElementSibling;
if(!body || !body.classList.contains('kamar-reveal-body')) return;
var open = h.classList.contains('open');
// Accordion: hanya 1 reveal terbuka per halaman. Saat membuka yang baru, tutup reveal lain
// (kecuali reveal induk yang membungkus h, supaya reveal bersarang tetap jalan).
if(!open){
var others = document.querySelectorAll('.kamar-reveal-head.open, .kamar-rc-head.open');
for(var oi=0; oi<others.length; oi++){
var oh = others[oi];
if(oh === h) continue;
var ob = oh.nextElementSibling;
if(ob && ob.contains(h)) continue;
oh.classList.remove('open');
oh.setAttribute('aria-expanded', 'false');
if(ob && ob.classList.contains('kamar-reveal-body')) ob.style.maxHeight = null;
}
}
h.classList.toggle('open', !open);
h.setAttribute('aria-expanded', !open);
body.style.maxHeight = !open ? (body.scrollHeight + 'px') : null;
});
})();


// ===========================================================================
// KAMAR SECTIONS v1 - pisahkan card menu member jadi SECTION berjudul + card ringkas (reveal).
// Otomatis untuk card .split-card yang berisi .eyebrow + h2 (template Robot/Indikator/Profil).
// Accordion: hanya 1 reveal terbuka per halaman (juga menutup reveal lama).
// ===========================================================================
(function(){
if(window.__KAMAR_SECTIONS_V1__) return;
window.__KAMAR_SECTIONS_V1__ = true;
var SEC_ORDER = ['Download & Panduan','License'];
var MAP = {'download':'Download & Panduan','panduan':'Download & Panduan','status request':'License','license aktif':'License','request license':'License','riwayat':'License'};
var KEY_ORDER = ['download','panduan','status request','license aktif','request license','riwayat'];
function injectCss(){
if(document.getElementById('kamarRcStyle')) return;
var st = document.createElement('style'); st.id = 'kamarRcStyle';
st.textContent = ''
+ '.split-card.kamar-rc{min-height:0 !important;height:auto !important;padding:0 !important;overflow:hidden;margin-bottom:10px}'
+ '.split-card.kamar-rc .kamar-rc-head{background:transparent !important;background-image:none !important;box-shadow:none !important;border:0 !important;border-radius:0 !important;color:#f3ecdc !important;min-height:0 !important;height:auto !important;width:100% !important;text-shadow:none !important;text-transform:none !important;transform:none !important;filter:none !important;margin:0 !important;justify-content:space-between !important;text-align:left !important}'
+ '.split-card.kamar-rc .kamar-rc-head:hover{background:rgba(255,255,255,.045) !important}'
+ '.kamar-rc-head .kamar-rc-arrow{color:#d8b25a !important}'
+ '.split-main{align-content:start !important}'
+ '.kamar-rc-head .kamar-rc-title:before,.kamar-rc-head .kamar-rc-title:after,.kamar-rc-head .kamar-rc-eyebrow:before,.kamar-rc-head .kamar-rc-eyebrow:after{display:none !important;content:none !important}'
+ '.kamar-sec{margin:18px 0 6px}'
+ '.kamar-sec-title{margin:0 0 10px;padding:0 4px;font-size:12px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#d8b25a;display:flex;align-items:center;gap:10px}'
+ '.kamar-sec-title:after{content:"";flex:1;height:1px;background:linear-gradient(90deg,rgba(216,178,90,.35),transparent)}'
+ '.kamar-sec > .kamar-rc{margin-bottom:10px}'
+ '.split-card.kamar-rc{padding:0 !important;overflow:hidden}'
+ '.kamar-rc-head{all:unset;box-sizing:border-box;display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;padding:14px 18px;cursor:pointer;color:inherit}'
+ '.kamar-rc-head:hover{background:rgba(255,255,255,.03)}'
+ '.kamar-rc-head:focus-visible{outline:2px solid #d8b25a;outline-offset:-2px}'
+ '.kamar-rc-text{display:flex;flex-direction:column;gap:3px;min-width:0}'
+ '.kamar-rc-head .kamar-rc-eyebrow{display:block !important;margin:0 !important;padding:0 !important;background:none !important;border:0 !important;box-shadow:none !important;font-size:10.5px !important;font-weight:800 !important;letter-spacing:.14em !important;text-transform:uppercase !important;color:#d8b25a !important;line-height:1.3 !important}'
+ '.kamar-rc-head .kamar-rc-title{display:block !important;margin:0 !important;padding:0 !important;background:none !important;border:0 !important;box-shadow:none !important;font-size:17px !important;font-weight:800 !important;line-height:1.25 !important;letter-spacing:normal !important;text-transform:none !important;color:#f3ecdc !important}'
+ '.kamar-rc-eyebrow{font-size:10.5px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#d8b25a}'
+ '.kamar-rc-title{font-size:17px;font-weight:800;line-height:1.25;color:#f3ecdc}'
+ '.kamar-rc-arrow{flex:none;font-size:22px;line-height:1;opacity:.7;transition:transform .2s ease}'
+ '.kamar-rc-head.open .kamar-rc-arrow{transform:rotate(90deg)}'
+ '.kamar-rc-body{display:none;padding:2px 18px 18px}'
+ '.kamar-rc-head.open + .kamar-rc-body{display:block;animation:kamarRcIn .18s ease}'
+ '@keyframes kamarRcIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}'
+ '.split-card.kamar-rc-own{padding:14px 18px !important}'
+ '.split-card.kamar-rc-own > h2{font-size:17px;margin:2px 0 8px}';
document.head.appendChild(st);
}
function txt(el){ return (el.textContent || '').trim(); }
function isSignalCta(card){
// Card yang berisi tombol/tautan ke Dashboard Signal (mis. 'Buka Dashboard Signal') tidak dikecilkan.
var as = card.querySelectorAll('a[href="/signal/"]');
for(var q=0;q<as.length;q++){ if(/dashboard signal/i.test(as[q].textContent || '')) return true; }
return false;
}
function isCand(card){
if(card.classList.contains('kamar-title-card') || card.classList.contains('kamar-rc')) return false;
if(isSignalCta(card)) return false;
if(card.dataset.kcrSkip || card.classList.contains('hidden') || /detail|modal|popup|drawer|dialog/i.test((card.id || '') + ' ' + card.className)) return false;
if(card.querySelector(':scope > .split-card')) return false;
var ey = card.querySelector(':scope > .eyebrow, :scope > .mini-label');
if(!ey) return false;
return txt(ey).toLowerCase() !== 'ringkasan';
}
function wrapCard(card){
if(card.classList.contains('kamar-title-card')) return;
if(isSignalCta(card)) return;
if(card.dataset.kcrSkip || card.classList.contains('hidden') || /detail|modal|popup|drawer|dialog/i.test((card.id || '') + ' ' + card.className)){ card.dataset.kcrSkip = '1'; return; }
if(card.querySelector(':scope > .kamar-rc-head')) return;
var ey = card.querySelector(':scope > .eyebrow, :scope > .mini-label');
var h = card.querySelector(':scope > h2, :scope > h3');
if(!ey) return;
if(card.querySelector(':scope > .split-card')) return;
var key = txt(ey).toLowerCase();
if(key === 'ringkasan') return;
card.classList.add('kamar-rc');
card.dataset.kcrKey = key;
var onlyReveal = card.querySelectorAll(':scope > .kamar-reveal-head').length === 1 && Array.prototype.every.call(card.children, function(c){ return c === ey || c === h || c.classList.contains('kamar-reveal-head') || c.classList.contains('kamar-reveal-body'); });
if(onlyReveal){ card.classList.add('kamar-rc-own'); return; }
var head = document.createElement('div');
// div role=button (bukan <button>) supaya tidak tertimpa CSS global tombol emas di halaman admin.
head.setAttribute('role','button'); head.tabIndex = 0; head.className = 'kamar-rc-head'; head.setAttribute('aria-expanded','false');
head.innerHTML = '<span class="kamar-rc-text"></span><span class="kamar-rc-arrow">&rsaquo;</span>';
var tx = head.firstChild;
// Pindahkan node ASLI (bukan salin teks) supaya teks dinamis (mis. 'Memuat status...') tetap ikut ter-update.
if(h){ ey.classList.add('kamar-rc-eyebrow'); h.classList.add('kamar-rc-title'); tx.appendChild(ey); tx.appendChild(h); }
else { ey.classList.add('kamar-rc-title'); tx.appendChild(ey); }
var body = document.createElement('div'); body.className = 'kamar-rc-body';
var kids = Array.prototype.slice.call(card.childNodes);
for(var i=0;i<kids.length;i++){ if(kids[i] !== ey && kids[i] !== h) body.appendChild(kids[i]); }
card.appendChild(head); card.appendChild(body);
}
function groupParent(parent){
if(parent.classList.contains('kamar-sec')) return;
var cards = [];
for(var i=0;i<parent.children.length;i++){ var c = parent.children[i]; if(c.classList.contains('kamar-rc') && MAP[c.dataset.kcrKey]) cards.push(c); }
if(!cards.length) return;
var ref = cards[0];
var secs = {};
SEC_ORDER.forEach(function(name){
if(!cards.some(function(c){ return MAP[c.dataset.kcrKey] === name; })) return;
var sec = document.createElement('div'); sec.className = 'kamar-sec';
var t = document.createElement('h3'); t.className = 'kamar-sec-title'; t.textContent = name; sec.appendChild(t);
parent.insertBefore(sec, ref); secs[name] = sec;
});
cards.sort(function(a,b){ return KEY_ORDER.indexOf(a.dataset.kcrKey) - KEY_ORDER.indexOf(b.dataset.kcrKey); });
cards.forEach(function(c){ secs[MAP[c.dataset.kcrKey]].appendChild(c); });
}
var timer = null;
function run(){
timer = null;
var main = document.querySelector('.split-main');
if(!main) return;
injectCss();
var all = main.querySelectorAll('.split-card');
var counts = [];
for(var a=0;a<all.length;a++){
var pc = all[a].parentElement; if(!pc) continue;
if(all[a].classList.contains('kamar-rc') || isCand(all[a])){ var ix = counts.findIndex(function(x){ return x.p === pc; }); if(ix < 0) counts.push({p:pc, n:1}); else counts[ix].n++; }
}
for(var i=0;i<all.length;i++){
var cp = counts.filter(function(x){ return x.p === all[i].parentElement; })[0];
if((cp && cp.n >= 2) || (all[i].parentElement && all[i].parentElement.closest('.split-card'))) wrapCard(all[i]);
}
var parents = [];
var rcs = main.querySelectorAll('.kamar-rc');
for(var j=0;j<rcs.length;j++){ var p = rcs[j].parentElement; if(p && parents.indexOf(p) < 0) parents.push(p); }
parents.forEach(groupParent);
}
function schedule(){ if(timer) return; timer = setTimeout(run, 80); }
function start(){
schedule();
new MutationObserver(schedule).observe(document.documentElement, {childList:true, subtree:true});
}
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
document.addEventListener('keydown', function(e){
if((e.key === 'Enter' || e.key === ' ') && e.target && e.target.classList && e.target.classList.contains('kamar-rc-head')){ e.preventDefault(); e.target.click(); }
});
document.addEventListener('click', function(e){
var h = e.target && e.target.closest ? e.target.closest('.kamar-rc-head') : null;
if(!h && e.target && e.target.closest){
// Klik di area kosong card (di luar judul/isi) tetap membuka/menutup reveal.
var rcCard = e.target.closest('.kamar-rc');
if(rcCard && !e.target.closest('.kamar-rc-body') && !e.target.closest('a,button,input,select,textarea,label')){ h = rcCard.querySelector(':scope > .kamar-rc-head'); }
}
if(!h) return;
var open = h.classList.contains('open');
if(!open){
var others = document.querySelectorAll('.kamar-reveal-head.open, .kamar-rc-head.open');
for(var k=0;k<others.length;k++){
var oh = others[k];
if(oh === h) continue;
var ob = oh.nextElementSibling;
if(ob && ob.contains(h)) continue;
oh.classList.remove('open'); oh.setAttribute('aria-expanded','false');
if(ob && ob.classList.contains('kamar-reveal-body')) ob.style.maxHeight = null;
}
}
h.classList.toggle('open', !open);
h.setAttribute('aria-expanded', !open);
if(!open){ setTimeout(function(){ try{ h.scrollIntoView({block:'nearest', behavior:'smooth'}); }catch(err){} }, 30); }
});
})();


// ===========================================================================
// KAMAR RENAME v1 - tampilan: "Kamar Private" -> "Kamar E-Book" (lapisan tampilan saja).
// Kunci internal (kamar_private, access_kamar_private, nilai data/option value) TIDAK diubah.
// ===========================================================================
(function(){
if(window.__KAMAR_RENAME_V1__) return;
window.__KAMAR_RENAME_V1__ = true;
var PAIRS = [[/Kamar Private/g,'Kamar E-Book'],[/KAMAR PRIVATE/g,'KAMAR E-BOOK'],[/Kamar private/g,'Kamar E-Book'],[/kamar private/g,'kamar e-book']];
function fix(s){
if(!s || s.toLowerCase().indexOf('kamar private') < 0) return s;
for(var i=0;i<PAIRS.length;i++){ s = s.replace(PAIRS[i][0], PAIRS[i][1]); }
return s;
}
var ATTRS = ['placeholder','title','aria-label','alt'];
function walk(root){
if(!root) return;
if(root.nodeType === 3){ var v = fix(root.nodeValue); if(v !== root.nodeValue) root.nodeValue = v; return; }
if(root.nodeType !== 1) return;
var tag = root.tagName;
if(tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEXTAREA') return;
for(var a=0;a<ATTRS.length;a++){ var av = root.getAttribute(ATTRS[a]); if(av){ var nv = fix(av); if(nv !== av) root.setAttribute(ATTRS[a], nv); } }
var c = root.firstChild;
while(c){ walk(c); c = c.nextSibling; }
}
var timer = null;
function run(){
timer = null;
if(document.title) document.title = fix(document.title);
if(document.body) walk(document.body);
}
function schedule(){ if(timer) return; timer = setTimeout(run, 60); }
function start(){
run();
new MutationObserver(schedule).observe(document.documentElement, {childList:true, subtree:true, characterData:true});
}
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

/* KAMAR NAME NAV v1: klik nama di baris admin -> aksi detail/kelola baris tsb */
(function(){
  if(!/\/admin[^\/]*\.html$/i.test(location.pathname)) return;
  var ROWS='.admin-row,.row,.aff-row,tr';
  var ACT=/^(detail|lihat|kelola|buka|pilih)/i;
  function actionOf(row){
    var c=row.querySelectorAll('button,a');
    for(var i=0;i<c.length;i++){var t=(c[i].textContent||'').trim();if(ACT.test(t)&&!c[i].disabled)return c[i];}
    return null;
  }
  function nameEl(t){
    var s=t.closest&&t.closest('strong');
    if(!s||s.closest('button,a,input,select,textarea,label'))return null;
    var row=s.closest(ROWS);
    if(!row||row.classList.contains('header'))return null;
    var cell=s.parentElement;
    if(!cell||cell.parentElement!==row)return null;
    if(cell!==row.firstElementChild&&!cell.classList.contains('aff-name'))return null;
    return {s:s,row:row};
  }
  var st=document.createElement('style');
  st.textContent='.kamar-name-nav{cursor:pointer;text-decoration:underline dotted rgba(244,223,144,.5);text-underline-offset:3px;transition:color .15s}.kamar-name-nav:hover{color:#f4df90!important;text-decoration-style:solid}';
  document.head.appendChild(st);
  function mark(){
    document.querySelectorAll('strong:not(.kamar-name-nav)').forEach(function(s){
      var r=nameEl(s);
      if(r&&actionOf(r.row)){s.classList.add('kamar-name-nav');s.setAttribute('title','Klik untuk buka detail');}
    });
  }
  document.addEventListener('click',function(e){
    var r=nameEl(e.target);
    if(!r||!r.s.classList.contains('kamar-name-nav'))return;
    var a=actionOf(r.row);
    if(!a)return;
    e.preventDefault();e.stopPropagation();
    a.click();
  },true);
  var tm;
  new MutationObserver(function(){clearTimeout(tm);tm=setTimeout(mark,150);}).observe(document.documentElement,{childList:true,subtree:true});
  mark();
})();

/* KAMAR FIX v1: baris putih tak terbaca (reward-row) */
(function(){var s=document.createElement('style');s.textContent='.admin-shell .reward-row:not(.head),.admin-shell .aff-row:not(.head),.admin-shell .pay-row:not(.head),.admin-shell .ref-row:not(.head){background:rgba(255,255,255,.035)!important;color:#f5f0e6!important;border:1px solid rgba(238,206,122,.14)!important;border-radius:18px!important}.admin-shell .reward-row:not(.head) strong,.admin-shell .aff-row:not(.head) strong,.admin-shell .pay-row:not(.head) strong,.admin-shell .ref-row:not(.head) strong{color:#fff3d8!important}.admin-shell .reward-row:not(.head) small,.admin-shell .aff-row:not(.head) small,.admin-shell .pay-row:not(.head) small,.admin-shell .ref-row:not(.head) small{color:#d8cda9!important}.admin-shell .reward-row:not(.head) input,.admin-shell .aff-row:not(.head) input,.admin-shell .pay-row:not(.head) input,.admin-shell .ref-row:not(.head) input,.admin-shell .reward-row:not(.head) select,.admin-shell .aff-row:not(.head) select,.admin-shell .pay-row:not(.head) select,.admin-shell .ref-row:not(.head) select{background:rgba(0,0,0,.35)!important;color:#f5f0e6!important;border:1px solid rgba(238,206,122,.25)!important}';document.head.appendChild(s);})();

/* KAMAR DURASI MANUAL v1: isi hari manual selain pilihan (admin-activation) */
(function(){
  if(!/admin-activation\.html$/i.test(location.pathname)) return;
  var st=document.createElement('style');
  st.textContent='.tc-duration-row{flex-wrap:wrap !important}.tc-duration-row .tc-duration-custom{display:block !important;visibility:visible !important;opacity:1 !important;position:static !important;pointer-events:auto !important;flex:1 1 100% !important;order:5;width:100% !important;max-width:none !important;height:auto !important;margin:8px 0 0 !important;min-width:0;padding:10px 12px;border-radius:14px;border:1px solid rgba(238,206,122,.3);background:rgba(0,0,0,.35);color:#f5f0e6;font:inherit;font-weight:700}.tc-duration-custom::placeholder{color:#9b927e;font-weight:600}.tc-duration-custom:focus{outline:none;border-color:#f4df90}#detailPanel .info-box,.info-box#kamarSubHistoryWrap29F{background:rgba(255,255,255,.04) !important;color:#f5f0e6 !important;border:1px solid rgba(238,206,122,.16) !important}#detailPanel .info-box *{color:inherit}#detailPanel .info-box small,#detailPanel .info-box p{color:#d8cda9 !important}';
  document.head.appendChild(st);
  function enhance(){
    document.querySelectorAll('select.tc-duration:not([data-custom])').forEach(function(sel){
      sel.setAttribute('data-custom','1');
      var inp=document.createElement('input');
      inp.type='number';inp.min='1';inp.max='3650';inp.step='1';inp.inputMode='numeric';
      inp.placeholder='Isi manual (hari)';inp.className='tc-duration-custom';inp.title='Isi jumlah hari secara manual';
      sel.insertAdjacentElement('afterend',inp);
      var opt=null;
      function sync(){
        var v=parseInt(inp.value,10);
        if(v>3650){v=3650;inp.value=v;}
        if(v>0){
          if(!opt){opt=document.createElement('option');sel.appendChild(opt);}
          opt.value=String(v);opt.textContent=v+' Hari (manual)';sel.value=String(v);
        }else if(opt){
          if(sel.value===opt.value)sel.selectedIndex=0;
          opt.remove();opt=null;
        }
      }
      inp.addEventListener('input',sync);
      inp.addEventListener('keydown',function(e){
        if(e.key==='Enter'){sync();var b=sel.parentElement.querySelector('[data-apply-duration]');if(b)b.click();}
      });
      sel.addEventListener('change',function(){
        if(opt&&sel.value!==opt.value){inp.value='';opt.remove();opt=null;}
      });
    });
  }
  var tm;
  new MutationObserver(function(){clearTimeout(tm);tm=setTimeout(enhance,150);}).observe(document.documentElement,{childList:true,subtree:true});
  enhance();
})();

/* KAMAR ADMIN MENU PEMBAYARAN v1: tambah menu Pembayaran & Verifikasi di sidebar admin */
(function(){
  if(!/\/admin[^\/]*\.html$/i.test(location.pathname)) return;
  function add(){
    if(document.querySelector('a[href^="admin-payments.html"]')) return;
    var a=document.querySelector('.split-sidebar a[href^="admin-activation"], .admin-sidebar a[href^="admin-activation"], aside a[href^="admin-activation"]');
    if(!a) return;
    var n=a.cloneNode(false);
    n.setAttribute('href','admin-payments.html');
    n.className=(a.className||'').replace(/\bactive\b/g,'').trim();
    n.removeAttribute('aria-current');
    n.textContent='Pembayaran & Verifikasi';
    a.insertAdjacentElement('afterend',n);
  }
  var tm;
  new MutationObserver(function(){clearTimeout(tm);tm=setTimeout(add,200);}).observe(document.documentElement,{childList:true,subtree:true});
  add();
})();
