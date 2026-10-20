/* Menu Tambah / Perpanjang Fasilitas: kartu Kamar Edukasi memakai alur gratis (bukan pembayaran). */
(function(){
'use strict';
var state=null;
function card(){
  var hs=document.querySelectorAll('.member-payment-card h3');
  for(var i=0;i<hs.length;i++){if(hs[i].textContent.trim()==='Kamar Edukasi') return hs[i].closest('.member-payment-card')}
  return null;
}
function apply(){
  var c=card(); if(!c) return;
  var p=c.querySelector('p'),a=c.querySelector('a.btn'); if(!a) return;
  var txt='Gratis, tanpa biaya dan tanpa batas waktu. Daftar dulu, setelah disetujui admin link grup dikirim lewat email dan dashboard.',label='DAFTAR GRATIS',href='member-edukasi-daftar.html';
  if(state==='approved'){txt='Kamar Edukasi kamu sudah aktif, gratis dan tanpa batas waktu. Tidak perlu diperpanjang.';label='BUKA KAMAR EDUKASI';href='member-materials.html'}
  else if(state==='pending'){txt='Pendaftaran Kamar Edukasi kamu sudah masuk dan menunggu persetujuan admin.';label='LIHAT STATUS PENDAFTARAN';href='member-edukasi-daftar.html'}
  else if(state==='suspended'){txt='Akses Kamar Edukasi kamu sedang ditangguhkan. Hubungi admin untuk informasi lebih lanjut.';label='HUBUNGI ADMIN';href='https://telegram.me/kamarkajianmarket'}
  if(p&&p.textContent!==txt) p.textContent=txt;
  if(a.textContent!==label) a.textContent=label;
  if(a.getAttribute('href')!==href) a.setAttribute('href',href);
  if(state==='suspended'){a.setAttribute('target','_blank');a.setAttribute('rel','noopener')}
  a.classList.remove('disabled-payment');a.removeAttribute('aria-disabled');
}
async function load(){
  try{
    var c=null;
    for(var i=0;i<40&&!c;i++){c=window.kamarSupabaseClient||null;if(!c)await new Promise(function(r){setTimeout(r,250)})}
    if(!c) return;
    var s=await c.auth.getSession(); if(!(s&&s.data&&s.data.session)) return;
    var r=await c.rpc('edu_my_status'); if(r&&r.data&&r.data.status){state=r.data.status;apply()}
  }catch(e){}
}
function init(){apply();setTimeout(apply,1200);setTimeout(apply,3500);load()}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
