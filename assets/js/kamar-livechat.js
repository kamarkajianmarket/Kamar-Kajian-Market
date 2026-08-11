(function(){
  'use strict';
  if(document.getElementById('kamarLiveChatBtn')) return;

  var TELEGRAM_URL = 'https://telegram.me/kamarkajianmarket';

  var style = document.createElement('style');
  style.textContent =
    '.kamar-livechat-btn{position:fixed;right:18px;bottom:18px;z-index:9999;'+
    'display:flex;align-items:center;gap:10px;padding:13px 20px 13px 13px;'+
    'border-radius:999px;border:none;cursor:pointer;text-decoration:none;'+
    'background:linear-gradient(135deg,#174C42,#1E3D36);color:#F5F1E8;'+
    'font-family:inherit;font-weight:800;font-size:13.5px;line-height:1;'+
    'box-shadow:0 14px 32px rgba(23,76,66,.32);'+
    'transition:transform .18s ease, box-shadow .18s ease;'+
    'animation:kamarLivechatPulse 2.6s ease-in-out infinite;}'+
    '.kamar-livechat-btn:hover{transform:translateY(-2px) scale(1.03);}'+
    '.kamar-livechat-btn svg{width:26px;height:26px;flex:0 0 auto;display:block;}'+
    '.kamar-livechat-label{white-space:nowrap;}'+
    '@keyframes kamarLivechatPulse{'+
    '0%{box-shadow:0 14px 32px rgba(23,76,66,.32),0 0 0 0 rgba(198,170,114,.45);}'+
    '70%{box-shadow:0 14px 32px rgba(23,76,66,.32),0 0 0 12px rgba(198,170,114,0);}'+
    '100%{box-shadow:0 14px 32px rgba(23,76,66,.32),0 0 0 0 rgba(198,170,114,0);}'+
    '}'+
    '@media (max-width:480px){'+
    '.kamar-livechat-btn{padding:14px;}'+
    '.kamar-livechat-label{display:none;}'+
    '}';
  document.head.appendChild(style);

  var a = document.createElement('a');
  a.id = 'kamarLiveChatBtn';
  a.className = 'kamar-livechat-btn';
  a.href = TELEGRAM_URL;
  a.target = '_blank';
  a.rel = 'noopener';
  a.setAttribute('aria-label', 'Chat Admin via Telegram');
  a.innerHTML =
    '<svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">'+
    '<circle cx="120" cy="120" r="120" fill="#F5F1E8"/>'+
    '<path d="M53 122l125-48c6-2 11 1 9 10l-21 100c-2 8-7 10-14 6l-38-28-18 17c-2 2-4 3-7 3l3-40 73-66c3-3-1-4-4-2l-90 57-39-12c-8-3-8-8 2-11z" fill="#174C42"/>'+
    '</svg>'+
    '<span class="kamar-livechat-label">Chat Admin</span>';

  function mount(){ document.body.appendChild(a); }
  if(document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount);
})();
