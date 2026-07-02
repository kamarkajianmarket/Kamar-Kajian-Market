(function(){
  'use strict';
  function ensureLogoInAuthTop(){
    document.querySelectorAll('.auth-top .brand').forEach(function(brand){
      if(brand.querySelector('img')) return;
      var badge=brand.querySelector('.brand-badge');
      var img=document.createElement('img');
      img.src='assets/logo-kamar.jpeg';
      img.alt='Logo Kamar Kajian Market';
      if(badge) badge.replaceWith(img); else brand.insertBefore(img, brand.firstChild);
    });
  }
  function cleanDuplicateHeaders(){
    var headers=[].slice.call(document.querySelectorAll('header.site-header, header.kamar-global-header'));
    if(headers.length<=1) return;
    // Keep the first visible header; remove late injected duplicate only.
    headers.slice(1).forEach(function(h){
      if(h.classList.contains('kamar-global-header')) h.remove();
    });
  }
  function normalizeButtons(){
    document.querySelectorAll('a.btn,button.btn,.admin-button,.header-cta,.pill').forEach(function(el){
      if(!el.getAttribute('aria-label') && el.textContent.trim()) el.setAttribute('aria-label', el.textContent.trim());
    });
  }
  function init(){
    ensureLogoInAuthTop();
    normalizeButtons();
    setTimeout(cleanDuplicateHeaders, 50);
    setTimeout(cleanDuplicateHeaders, 250);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
