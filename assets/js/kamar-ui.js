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
