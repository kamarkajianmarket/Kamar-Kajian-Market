(function(){
  'use strict';
  function injectCanonicalTheme(){
    if(document.getElementById('kamarCanonicalTheme30')) return;
    var style=document.createElement('style');
    style.id='kamarCanonicalTheme30';
    style.textContent=':root{--bg:#070706!important;--panel:#11100d!important;--line:rgba(238,206,122,.18)!important;--gold:#f4df90!important;--gold2:#c69a39!important;--text:#f5f0e6!important;--muted:rgba(245,240,230,.66)!important;--green:#bfffd9!important;--red:#ffb4b4!important}';
    document.head.appendChild(style);
  }
  // NEW (2026-08-01): admin.html's own background (two soft radial glows,
  // gold top-left + green top-right, on #070706) is the visual reference the
  // user wants EVERY admin/member/affiliate page to match exactly. Several
  // pages had their own hand-rolled variant of this same idea (slightly
  // different colors/opacity/radius, or none at all, or an unrelated
  // "luxury atelier" gradient+grid+vignette system on pages that carry the
  // kamar-v46-atelier body class) which is exactly why the background looked
  // inconsistent page to page. This forces the one canonical background
  // (and strips the competing systems) on every page this script runs on.
  function injectCanonicalBackground(){
    if(document.getElementById('kamarCanonicalBg30')) return;
    var style=document.createElement('style');
    style.id='kamarCanonicalBg30';
    style.textContent=
      'html,body{background:radial-gradient(circle at 20% 0%,rgba(198,154,57,.16),transparent 28%),radial-gradient(circle at 100% 20%,rgba(46,81,70,.14),transparent 28%),#070706!important}'+
      '.page-glow{display:none!important}'+
      'body.kamar-v46-atelier::before,body.kamar-v46-atelier::after{content:none!important;display:none!important;background:none!important}';
    document.head.appendChild(style);
  }
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
    injectCanonicalTheme();
    injectCanonicalBackground();
    ensureLogoInAuthTop();
    normalizeButtons();
    setTimeout(cleanDuplicateHeaders, 50);
    setTimeout(cleanDuplicateHeaders, 250);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
