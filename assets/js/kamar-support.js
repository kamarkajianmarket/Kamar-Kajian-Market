(function(){
'use strict';
if (window.__kamarSupportLoaded) return;
window.__kamarSupportLoaded = true;

var TELEGRAM_ADMIN_URL = 'https://telegram.me/kajianmarketkamar';

function detectContext(){
  var explicit = document.body && document.body.getAttribute('data-kamar-support-context');
  if (explicit) return explicit;

  var p = (location.pathname || '').toLowerCase();
  if (p.indexOf('/signal') !== -1) return 'kamar-signal';
  if (p.indexOf('ib-form') !== -1 || p.indexOf('affiliate') !== -1) return 'ib-kamar';
  if (p.indexOf('renewal') !== -1) return 'renewal';
  if (p.indexOf('payment') !== -1) return 'payment';
  if (p.indexOf('tools') !== -1 || p.indexOf('robot') !== -1 || p.indexOf('indicator') !== -1 || p.indexOf('scalping') !== -1) return 'tools';
  if (p.indexOf('member') !== -1 || p.indexOf('dashboard') !== -1) return 'member';
  return 'general';
}

var CONTEXT_LABEL = {
  'kamar-signal': 'Kamar Signal',
  'ib-kamar': 'Aktivasi via IB Kamar',
  'renewal': 'Perpanjangan Fasilitas',
  'payment': 'Pembayaran / Langganan',
  'tools': 'EA / Indikator / Tools',
  'member': 'Akun Member',
  'general': 'Umum'
};

var tawkReady = false;
function markReady(){ tawkReady = true; }

// Kadang widget default tawk.to (bubble + layar Home bawaan mereka) sempat
// nongol sesaat sebelum/ setelah hideWidget() pertama terpanggil (race
// condition saat SDK-nya baru selesai load), jadi ikut kepanggil ulang
// beberapa kali di awal supaya benar-benar tidak nongol/menumpuk dengan
// panel KAMAR SUPPORT kita sendiri.
function forceHideDefaultWidget(){
  try{ if (window.Tawk_API && typeof window.Tawk_API.hideWidget === 'function') window.Tawk_API.hideWidget(); }catch(e){}
}

try{
  window.Tawk_API = window.Tawk_API || {};
  var prevOnLoad = window.Tawk_API.onLoad;
  window.Tawk_API.onLoad = function(){
    markReady();
    forceHideDefaultWidget();
    setTimeout(forceHideDefaultWidget, 800);
    setTimeout(forceHideDefaultWidget, 2000);
    setTimeout(forceHideDefaultWidget, 4000);
    if (typeof prevOnLoad === 'function') prevOnLoad();
  };
  forceHideDefaultWidget();
}catch(e){}

function openLiveChat(context){
  try{
    if (window.Tawk_API && typeof window.Tawk_API.setAttributes === 'function'){
      window.Tawk_API.setAttributes({ support_topic: CONTEXT_LABEL[context] || context }, function(){});
    }
  }catch(e){}
  try{
    if (window.Tawk_API && typeof window.Tawk_API.addTags === 'function'){
      window.Tawk_API.addTags([context], function(){});
    }
  }catch(e){}
  try{
    if (window.Tawk_API && typeof window.Tawk_API.maximize === 'function'){
      window.Tawk_API.maximize();
      if (typeof hideLauncher === 'function') hideLauncher();
      if (typeof watchTawkWidgetVisibility === 'function') watchTawkWidgetVisibility();
      return true;
    }
  }catch(e){}
  return false;
}

function openTelegram(url){
  window.open(url || TELEGRAM_ADMIN_URL, '_blank', 'noopener');
}

var __kmrTawkVisObserverAttached = false;
function isTawkWidgetExpanded(){
  try{
    var frames = document.querySelectorAll('body > div > iframe');
    for (var i=0;i<frames.length;i++){
      var f = frames[i];
      var cs = window.getComputedStyle(f);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      var rect = f.getBoundingClientRect();
      if (rect.width > 200 || rect.height > 200) return true;
    }
  }catch(e){}
  return false;
}
function watchTawkWidgetVisibility(){
  if (__kmrTawkVisObserverAttached) return;
  __kmrTawkVisObserverAttached = true;
  var check = function(){
    if (isTawkWidgetExpanded()){
      if (typeof hideLauncher === 'function') hideLauncher();
    } else {
      if (typeof showLauncher === 'function') showLauncher();
    }
  };
  try{
    var mo = new MutationObserver(function(){ check(); });
    mo.observe(document.body, { childList:true, subtree:true, attributes:true, attributeFilter:['style'] });
  }catch(e){}
  setInterval(check, 700);
}

var css = ''
+ ':root{'
+ '  --kmr-emerald:#174C42;'
+ '  --kmr-emerald-deep:#0F332C;'
+ '  --kmr-graphite:#2B2E2C;'
+ '  --kmr-ivory:#F5F1E8;'
+ '  --kmr-pearl:#FCFBF8;'
+ '  --kmr-gold:#C69A39;'
+ '  --kmr-line:rgba(23,76,66,0.14);'
+ '}'
+ '.kmr-sup-launcher{position:fixed;right:20px;bottom:20px;z-index:2147483000;display:flex;align-items:center;gap:8px;'
+ '  background:var(--kmr-emerald);color:var(--kmr-ivory);border:none;border-radius:999px;padding:12px 18px;'
+ '  font:600 14px/1.2 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;letter-spacing:.2px;'
+ '  box-shadow:0 6px 20px rgba(15,51,44,.28);cursor:pointer;transition:transform .2s ease,box-shadow .2s ease;}'
+ '.kmr-sup-launcher:hover{transform:translateY(-2px);box-shadow:0 10px 26px rgba(15,51,44,.34);}'
+ '.kmr-sup-launcher:focus-visible{outline:2px solid var(--kmr-gold);outline-offset:2px;}'
+ '.kmr-sup-launcher svg{width:18px;height:18px;flex:none;}'
+ 'body.kamar-has-bottom-nav .kmr-sup-launcher{bottom:calc(84px + env(safe-area-inset-bottom));}'
+ '.kmr-sup-overlay{position:fixed;inset:0;background:rgba(23,26,25,.32);z-index:2147483001;opacity:0;pointer-events:none;transition:opacity .2s ease;}'
+ '.kmr-sup-overlay.kmr-open{opacity:1;pointer-events:auto;}'
+ '.kmr-sup-panel{position:fixed;z-index:2147483002;background:var(--kmr-pearl);color:var(--kmr-graphite);'
+ '  border-radius:18px;box-shadow:0 20px 50px rgba(15,51,44,.24);border:1px solid var(--kmr-line);'
+ '  width:320px;max-width:calc(100vw - 32px);opacity:0;transform:translateY(8px);pointer-events:none;'
+ '  transition:opacity .2s ease,transform .2s ease;overflow:hidden;'
+ '  font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;}'
+ '.kmr-sup-panel.kmr-open{opacity:1;transform:translateY(0);pointer-events:auto;}'
+ '.kmr-sup-panel-desktop{right:20px;bottom:88px;}'
+ '.kmr-sup-head{background:var(--kmr-emerald);color:var(--kmr-ivory);padding:18px 20px 16px;}'
+ '.kmr-sup-head h2{margin:0 0 4px;font-size:16px;font-weight:700;letter-spacing:.3px;}'
+ '.kmr-sup-head p{margin:0;font-size:12.5px;color:rgba(245,241,232,.82);}'
+ '.kmr-sup-body{padding:14px;display:flex;flex-direction:column;gap:10px;}'
+ '.kmr-sup-opt{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;text-align:left;'
+ '  background:#fff;border:1px solid var(--kmr-line);border-radius:12px;padding:12px 14px;cursor:pointer;'
+ '  transition:border-color .18s ease,transform .18s ease;font-family:inherit;}'
+ '.kmr-sup-opt:hover{border-color:var(--kmr-emerald);transform:translateY(-1px);}'
+ '.kmr-sup-opt:focus-visible{outline:2px solid var(--kmr-gold);outline-offset:1px;}'
+ '.kmr-sup-opt[disabled]{opacity:.45;cursor:not-allowed;transform:none;}'
+ '.kmr-sup-opt-main{display:flex;flex-direction:column;gap:2px;}'
+ '.kmr-sup-opt-title{font-weight:700;color:var(--kmr-graphite);font-size:13.5px;}'
+ '.kmr-sup-opt-desc{font-size:12px;color:rgba(43,46,44,.62);}'
+ '.kmr-sup-opt-arrow{font-size:13px;color:var(--kmr-emerald);flex:none;}'
+ '.kmr-sup-note{padding:0 16px 14px;font-size:11px;color:rgba(43,46,44,.55);border-top:1px solid var(--kmr-line);margin-top:2px;padding-top:10px;}'
+ '.kmr-sup-close{position:absolute;top:12px;right:12px;background:rgba(245,241,232,.16);border:none;color:var(--kmr-ivory);'
+ '  width:26px;height:26px;border-radius:50%;cursor:pointer;font-size:14px;line-height:1;}'
+ '.kmr-sup-close:hover{background:rgba(245,241,232,.28);}'
+ '@media (max-width:600px){'
+ '  .kmr-sup-panel{left:0;right:0;bottom:0;width:100%;max-width:100%;border-radius:20px 20px 0 0;transform:translateY(100%);}'
+ '  .kmr-sup-panel.kmr-open{transform:translateY(0);}'
+ '  body.kamar-has-bottom-nav .kmr-sup-panel{bottom:0;}'
+ '  .kmr-sup-launcher{right:16px;}'
+ '}'
+ '@media (prefers-reduced-motion:reduce){'
+ '  .kmr-sup-launcher,.kmr-sup-panel,.kmr-sup-overlay,.kmr-sup-opt{transition:none;}'
+ '}';

var styleTag = document.createElement('style');
styleTag.setAttribute('data-kamar-support', '1');
styleTag.textContent = css;
document.head.appendChild(styleTag);

var CHAT_ICON = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 12c0-4.4 3.6-8 8-8s8 3.6 8 8-3.6 8-8 8c-1.1 0-2.1-.2-3.1-.6L4 21l1.7-4.4C4.6 15.3 4 13.7 4 12z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

var overlay = document.createElement('div');
overlay.className = 'kmr-sup-overlay';

var panel = document.createElement('div');
panel.className = 'kmr-sup-panel kmr-sup-panel-desktop';
panel.setAttribute('role', 'dialog');
panel.setAttribute('aria-modal', 'true');
panel.setAttribute('aria-label', 'Kamar Support');
panel.innerHTML =
  '<button type="button" class="kmr-sup-close" aria-label="Tutup">&#10005;</button>' +
  '<div class="kmr-sup-head">' +
  '  <h2>KAMAR SUPPORT</h2>' +
  '  <p>Ada yang perlu dibantu? Pilih cara menghubungi Admin Kamar.</p>' +
  '</div>' +
  '<div class="kmr-sup-body">' +
  '  <button type="button" class="kmr-sup-opt" data-kmr-action="chat">' +
  '    <span class="kmr-sup-opt-main">' +
  '      <span class="kmr-sup-opt-title">Live Chat</span>' +
  '      <span class="kmr-sup-opt-desc">Chat langsung melalui website</span>' +
  '    </span>' +
  '    <span class="kmr-sup-opt-arrow">&#8594;</span>' +
  '  </button>' +
  '  <button type="button" class="kmr-sup-opt" data-kmr-action="telegram">' +
  '    <span class="kmr-sup-opt-main">' +
  '      <span class="kmr-sup-opt-title">Telegram Admin</span>' +
  '      <span class="kmr-sup-opt-desc">Hubungi Admin melalui Telegram</span>' +
  '    </span>' +
  '    <span class="kmr-sup-opt-arrow">&#8594;</span>' +
  '  </button>' +
  '</div>' +
  '<div class="kmr-sup-note">Jangan mengirim password, OTP, PIN, atau informasi keamanan akun melalui chat.</div>';

var launcher = document.createElement('button');
launcher.type = 'button';
launcher.className = 'kmr-sup-launcher';
launcher.setAttribute('aria-label', 'Kamar Support - Bantuan');
launcher.innerHTML = CHAT_ICON + '<span>Bantuan</span>';

document.body.appendChild(overlay);
document.body.appendChild(panel);
document.body.appendChild(launcher);

function hideLauncher(){ launcher.style.display = 'none'; }
function showLauncher(){ launcher.style.display = ''; }

try{
  window.Tawk_API = window.Tawk_API || {};
  var prevOnChatMaximized = window.Tawk_API.onChatMaximized;
  window.Tawk_API.onChatMaximized = function(){
    hideLauncher();
    if (typeof prevOnChatMaximized === 'function') prevOnChatMaximized();
  };
  var prevOnChatMinimized = window.Tawk_API.onChatMinimized;
  window.Tawk_API.onChatMinimized = function(){
    showLauncher();
    if (typeof prevOnChatMinimized === 'function') prevOnChatMinimized();
  };
  var prevOnChatHidden = window.Tawk_API.onChatHidden;
  window.Tawk_API.onChatHidden = function(){
    showLauncher();
    if (typeof prevOnChatHidden === 'function') prevOnChatHidden();
  };
}catch(e){}

var activeContext = 'general';
var activeTelegramUrl = TELEGRAM_ADMIN_URL;
var lastFocused = null;

function refreshChatOptionState(){
  var chatBtn = panel.querySelector('[data-kmr-action="chat"]');
  if (!chatBtn) return;
  chatBtn.disabled = false;
  var desc = chatBtn.querySelector('.kmr-sup-opt-desc');
  if (window.__kamarTawkFailed) {
    chatBtn.disabled = true;
    if (desc) desc.textContent = 'Tidak tersedia sementara';
  } else if (desc) {
    desc.textContent = 'Chat langsung melalui website';
  }
}

function openChooser(context, telegramUrl){
  activeContext = context || detectContext();
  activeTelegramUrl = telegramUrl || TELEGRAM_ADMIN_URL;
  refreshChatOptionState();
  lastFocused = document.activeElement;
  overlay.classList.add('kmr-open');
  panel.classList.add('kmr-open');
  document.addEventListener('keydown', onKeydown);
  var first = panel.querySelector('.kmr-sup-opt:not([disabled])');
  if (first) first.focus();
}

function closeChooser(){
  overlay.classList.remove('kmr-open');
  panel.classList.remove('kmr-open');
  document.removeEventListener('keydown', onKeydown);
  if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
}

function onKeydown(e){
  if (e.key === 'Escape') closeChooser();
}

launcher.addEventListener('click', function(){
  openChooser(detectContext(), TELEGRAM_ADMIN_URL);
});

overlay.addEventListener('click', closeChooser);
panel.querySelector('.kmr-sup-close').addEventListener('click', closeChooser);

panel.addEventListener('click', function(e){
  var btn = e.target.closest ? e.target.closest('[data-kmr-action]') : null;
  if (!btn || btn.disabled) return;
  var action = btn.getAttribute('data-kmr-action');
  if (action === 'chat'){
    var opened = openLiveChat(activeContext);
    closeChooser();
    if (!opened) openTelegram(activeTelegramUrl);
  } else if (action === 'telegram'){
    openTelegram(activeTelegramUrl);
    closeChooser();
  }
});

function wireTriggers(){
  var els = document.querySelectorAll('[data-kamar-support]');
  for (var i = 0; i < els.length; i++){
    (function(el){
      if (el.__kmrWired) return;
      el.__kmrWired = true;
      el.addEventListener('click', function(e){
        e.preventDefault();
        var ctx = el.getAttribute('data-kamar-support') || detectContext();
        var href = el.getAttribute('href');
        openChooser(ctx, href || TELEGRAM_ADMIN_URL);
      });
    })(els[i]);
  }
}
wireTriggers();

setTimeout(function(){
  if (!tawkReady && !(window.Tawk_API && typeof window.Tawk_API.maximize === 'function')){
    window.__kamarTawkFailed = true;
    refreshChatOptionState();
  }
}, 8000);

})();
hideLauncher
