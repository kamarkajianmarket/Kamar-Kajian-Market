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
'@media(max-width:480px){.kamar-scam-card{padding:26px 20px 22px;border-radius:20px}}'+
'html.kamar-scam-lock .kmr-sup-launcher{display:none!important}'+
'@media(max-height:700px){.kamar-scam-card{max-height:82vh;padding:20px 18px 16px}.kamar-scam-icon{width:44px;height:44px;margin-bottom:10px}.kamar-scam-card h2{font-size:18px;margin-bottom:8px}.kamar-scam-card p{font-size:13.5px;margin-bottom:8px}.kamar-scam-highlight{padding:10px 12px;margin:10px 0}.kamar-scam-actions{margin-top:12px}}';
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

window.__kamarScamOpen=inject;
  function initRibbon(){
    var KEY='kamarScamRibbonDismissed';
    try{var t=parseInt(localStorage.getItem(KEY)||'0',10); if(t && Date.now()-t<7*864e5) return;}catch(e){}
    if(!document.getElementById('kamarScamRibbonStyle')){
      var st=document.createElement('style'); st.id='kamarScamRibbonStyle';
      st.textContent='.kamar-scam-ribbon{position:relative;z-index:60;display:flex;align-items:center;gap:10px;padding:9px 16px;background:linear-gradient(90deg,rgba(201,162,77,.2),rgba(201,162,77,.07));border-bottom:1px solid rgba(243,217,139,.28);color:#e9e1cc;font-size:12.5px;line-height:1.45;font-family:inherit}'
      +'.kamar-scam-ribbon .ks-ic{flex:0 0 auto;width:20px;height:20px;border-radius:50%;display:grid;place-items:center;font-weight:900;font-size:12px;color:#1c1405;background:linear-gradient(145deg,#f8e4a8,#c9a24d)}'
      +'.kamar-scam-ribbon .ks-tx{flex:1;min-width:0}.kamar-scam-ribbon .ks-tx b{color:#f3d98b}'
      +'.kamar-scam-ribbon .ks-more{flex:0 0 auto;border:0;background:none;color:#f3d98b;font-weight:700;font-size:12.5px;text-decoration:underline;cursor:pointer;padding:4px 2px;font-family:inherit}'
      +'.kamar-scam-ribbon .ks-x{flex:0 0 auto;width:26px;height:26px;border-radius:50%;border:1px solid rgba(243,217,139,.3);background:rgba(255,255,255,.06);color:#f3d98b;font-size:16px;line-height:1;cursor:pointer;padding:0}'
      +'@media(max-width:640px){.kamar-scam-ribbon{padding:8px 12px;font-size:12px;gap:8px}}';
      document.head.appendChild(st);
    }
    var bar=document.createElement('div'); bar.className='kamar-scam-ribbon'; bar.setAttribute('role','note');
    bar.innerHTML='<span class="ks-ic">!</span><span class="ks-tx"><b>Waspada penipuan.</b> Transaksi Kamar Kajian Market hanya sah lewat Admin resmi.</span><button type="button" class="ks-more">Selengkapnya</button><button type="button" class="ks-x" aria-label="Tutup">&times;</button>';
    document.body.insertBefore(bar,document.body.firstChild);
    bar.querySelector('.ks-more').addEventListener('click',function(){ inject(); });
    bar.querySelector('.ks-x').addEventListener('click',function(){ try{ localStorage.setItem(KEY,String(Date.now())); }catch(e){} bar.parentNode&&bar.parentNode.removeChild(bar); });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', initRibbon); else initRibbon();
})();


/* klik di mana saja (selain tombol Telegram) menutup pengumuman; Esc juga menutup */
(function(){
  function popup(){return document.getElementById('kamarScamWarning29F');}
  function closeIt(){var p=popup();if(!p)return false;var b=p.querySelector('[data-scam-close]');if(b){b.click();return true;}p.remove();return true;}
  document.addEventListener('click',function(e){
    var p=popup();if(!p)return;
    if(e.target.closest&&e.target.closest('#kamarScamWarning29F a[href]'))return;
    if(e.target.closest&&e.target.closest('[data-scam-close]'))return;
    e.preventDefault();e.stopPropagation();closeIt();
  },true);
  document.addEventListener('keydown',function(e){if(e.key==='Escape')closeIt();});
})();
