(function(){
'use strict';
var PAGE = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
if(PAGE !== 'index.html' && PAGE !== '') return;
if(window.__KAMAR_SCAM_WARNING_V1__) return;
window.__KAMAR_SCAM_WARNING_V1__ = true;

var TELEGRAM_URL = 'https://telegram.me/kajianmarketkamar';

function injectStyles(){
if(document.getElementById('kamarScamWarningStyle29F')) return;
var style = document.createElement('style');
style.id = 'kamarScamWarningStyle29F';
style.textContent =
'html.kamar-scam-lock,html.kamar-scam-lock body{overflow:hidden!important}'+
'.kamar-scam-backdrop{position:fixed;inset:0;z-index:999999999;background:rgba(17,20,23,.62);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;padding:20px;animation:kamarScamFadeIn .25s ease}'+
'.kamar-scam-backdrop.closing{animation:kamarScamFadeOut .18s ease forwards}'+
'@keyframes kamarScamFadeIn{from{opacity:0}to{opacity:1}}'+
'@keyframes kamarScamFadeOut{from{opacity:1}to{opacity:0}}'+
'.kamar-scam-card{position:relative;width:100%;max-width:480px;max-height:88vh;overflow:auto;background:#fffdf8;border-radius:24px;box-shadow:0 30px 90px rgba(17,20,23,.35);padding:30px 28px 26px;box-sizing:border-box;animation:kamarScamPop .3s cubic-bezier(.2,.9,.3,1.2)}'+
'@keyframes kamarScamPop{from{opacity:0;transform:translateY(14px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}'+
'.kamar-scam-close{position:absolute;top:14px;right:14px;width:36px;height:36px;border-radius:50%;border:1px solid rgba(17,20,23,.14);background:#fff;color:#111417;font-size:18px;font-weight:900;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .15s,transform .15s;line-height:1}'+
'.kamar-scam-close:hover{background:#f5f1e8;transform:scale(1.06)}'+
'.kamar-scam-icon{width:54px;height:54px;border-radius:16px;background:linear-gradient(135deg,#fff1d6,#ffe3b0);display:flex;align-items:center;justify-content:center;margin-bottom:16px;color:#b8590f}'+
'.kamar-scam-card h2{margin:0 0 12px;color:#111417;font-size:20px;font-weight:900;line-height:1.35;letter-spacing:-.01em}'+
'.kamar-scam-card p{margin:0 0 12px;color:#3a3f45;font-size:14.5px;line-height:1.65}'+
'.kamar-scam-card p strong{color:#111417}'+
'.kamar-scam-card .kamar-scam-highlight{background:#fff7e6;border:1px solid rgba(184,138,61,.28);border-radius:14px;padding:12px 14px;margin:16px 0;font-size:14px;line-height:1.6;color:#5a4520}'+
'.kamar-scam-actions{margin-top:18px;display:flex;flex-direction:column;gap:10px}'+
'.kamar-scam-telegram{display:flex;align-items:center;justify-content:center;gap:9px;text-decoration:none;background:#b88a3d;color:#fff;font-weight:900;font-size:14px;padding:13px 18px;border-radius:14px;box-shadow:0 10px 26px rgba(184,138,61,.35);transition:filter .15s}'+
'.kamar-scam-telegram:hover{filter:brightness(1.06)}'+
'.kamar-scam-footnote{margin-top:14px;color:#8b8f94;font-size:11.5px;line-height:1.6;text-align:center}'+
'@media(max-width:480px){.kamar-scam-card{padding:26px 20px 22px;border-radius:20px}}';
document.head.appendChild(style);
}

function inject(){
if(document.getElementById('kamarScamWarning29F')) return;
injectStyles();

var wrap = document.createElement('div');
wrap.id = 'kamarScamWarning29F';
wrap.className = 'kamar-scam-backdrop';
wrap.setAttribute('role','alertdialog');
wrap.setAttribute('aria-modal','true');
wrap.setAttribute('aria-labelledby','kamarScamWarningTitle29F');

wrap.innerHTML =
'<div class="kamar-scam-card">'+
'<button type="button" class="kamar-scam-close" data-scam-close aria-label="Tutup">&#10005;</button>'+
'<div class="kamar-scam-icon">'+
'<svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2.5L1.5 21.5H22.5L12 2.5Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 9.5V13.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="17" r="1.1" fill="currentColor"/></svg>'+
'</div>'+
'<h2 id="kamarScamWarningTitle29F">Waspada Penipuan Mengatasnamakan Kamar Kajian Market</h2>'+
'<p>Belakangan ini marak pihak-pihak yang mengatasnamakan <strong>Kamar Kajian Market</strong> di luar kanal resmi, termasuk untuk menawarkan investasi maupun meminta transfer dana secara pribadi.</p>'+
'<p>Kami mohon perhatian Anda:</p>'+
'<div class="kamar-scam-highlight"><strong>Setiap transaksi pembayaran, pendaftaran, maupun pencairan dana HANYA sah apabila telah dikonfirmasi langsung oleh Admin Kamar</strong> melalui kanal resmi. Kamar Kajian Market tidak pernah meminta transfer dana melalui pesan pribadi tanpa konfirmasi resmi.</p>'+
'<p>Apabila Anda menerima tawaran, instruksi, atau permintaan transfer yang mengatasnamakan Kamar Kajian Market, <strong>jangan melakukan transaksi apapun</strong> sebelum memastikan kebenarannya langsung kepada Admin Kamar melalui kanal resmi di bawah ini.</p>'+
'<div class="kamar-scam-actions">'+
'<a class="kamar-scam-telegram" href="'+TELEGRAM_URL+'" target="_blank" rel="noopener">'+
'<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M21.9 3.6 2.9 11c-1.2.5-1.2 1.2-.2 1.5l4.9 1.5 1.9 5.8c.2.6.4.8.9.8.4 0 .6-.2.8-.4l2.3-2.2 4.8 3.5c.9.5 1.5.2 1.7-.8l3.1-14.4c.3-1.3-.4-1.8-1.2-1.7ZM8.5 13.9l9.5-6c.4-.3.8-.1.5.3l-8.1 7.4-.3 3.3-1.6-5Z"/></svg>'+
'Hubungi Admin Kamar via Telegram'+
'</a>'+
'</div>'+
'<div class="kamar-scam-footnote">Kamar Kajian Market tidak bertanggung jawab atas kerugian akibat transaksi di luar kanal resmi yang belum dikonfirmasi Admin.</div>'+
'</div>';

document.body.appendChild(wrap);
document.documentElement.classList.add('kamar-scam-lock');

var closeBtn = wrap.querySelector('[data-scam-close]');
closeBtn.addEventListener('click', function(){
wrap.classList.add('closing');
setTimeout(function(){
if(wrap.parentNode) wrap.parentNode.removeChild(wrap);
document.documentElement.classList.remove('kamar-scam-lock');
}, 180);
});
}

if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inject); else inject();
})();
