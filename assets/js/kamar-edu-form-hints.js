/* Kamar Edukasi: validasi per kolom, kalimat salah ditampilkan, tombol terkunci sampai benar, kegagalan dicatat. */
(function(){
'use strict';
var TYPOS={'gmial.com':'gmail.com','gmai.com':'gmail.com','gmail.co':'gmail.com','gmail.con':'gmail.com','gnail.com':'gmail.com','gmaill.com':'gmail.com','yahooo.com':'yahoo.com','yaho.com':'yahoo.com','yahoo.co':'yahoo.com','hotmial.com':'hotmail.com','outlok.com':'outlook.com'};
var LABEL={eduName:'Nama Lengkap',eduEmail:'Email',eduEmail2:'Ulangi email',eduPhone:'Nomor Telegram',eduUser:'Username Telegram',eduAgree:'Pernyataan data benar'};
function $(id){return document.getElementById(id)}
var css=document.createElement('style');
css.textContent='.edu-fe{margin-top:6px;font-size:12.5px;line-height:1.5;font-weight:700;display:none}.edu-fe.bad{display:block;color:#ffb3a8}.edu-fe.ok{display:block;color:#9effca}.edu-fe.hint{display:block;color:#aaa393;font-weight:600}.edu-fe .wr{display:block;color:#fff;background:rgba(255,90,70,.16);border-radius:8px;padding:5px 9px;margin-bottom:5px;word-break:break-word}.edu-bad{border-color:rgba(255,120,100,.85)!important;box-shadow:0 0 0 3px rgba(255,90,70,.16)}#eduSubmit.edu-btn-off{opacity:.45;filter:grayscale(.5);cursor:not-allowed}#eduStatus{margin-top:12px;font-size:13px;line-height:1.5;font-weight:700;color:#ffd582}#eduStatus.ok{color:#9effca}';
document.head.appendChild(css);

var HINTS={
  eduName:'Tulis nama asli, minimal dua kata. Contoh: Budi Santoso.',
  eduPhone:'Nomor yang terdaftar di Telegram, diawali kode negara tanpa 0. Contoh: 628123456789.',
  eduUser:'Username ada di Telegram, menu Pengaturan lalu Username (diawali @). Contoh: @budi_santoso. Bukan nama tampilan dan tanpa spasi.'
};
function slot(id){
  var inp=$(id); if(!inp) return null;
  var host=inp.closest('label')||inp.parentNode;
  var el=host.querySelector('.edu-fe[data-for="'+id+'"]');
  if(!el){el=document.createElement('div');el.className='edu-fe';el.setAttribute('data-for',id);host.appendChild(el)}
  return el;
}
function setMsg(id,type,text,entered){
  var el=slot(id),inp=$(id); if(!el) return;
  el.className='edu-fe '+(text?type:''); el.textContent='';
  if(text){
    if(type==='bad'&&entered){var w=document.createElement('span');w.className='wr';w.textContent='Yang kamu tulis: "'+entered+'"';el.appendChild(w)}
    el.appendChild(document.createTextNode(text));
  }
  if(inp&&inp.type!=='checkbox') inp.classList.toggle('edu-bad',type==='bad'&&!!text);
}
function showHint(id){setMsg(id,'hint',HINTS[id]||'')}

function chkName(v){
  v=v.trim().replace(/\s+/g,' ');
  if(!v) return {error:'Nama lengkap belum diisi.'};
  if(!/[A-Za-z]/.test(v)) return {error:'Nama harus berisi huruf, bukan angka atau simbol saja.'};
  if(v.split(' ').length<2) return {error:'Baru satu kata. Tulis nama lengkap sesuai nama asli, minimal dua kata. Contoh: Budi Santoso.'};
  return {value:v};
}
function chkEmail(v){
  v=v.trim().toLowerCase();
  if(!v) return {error:'Email belum diisi.'};
  if(/\s/.test(v)) return {error:'Email tidak boleh mengandung spasi.'};
  if(v.indexOf('@')<0) return {error:'Email harus memuat tanda @. Contoh: nama@gmail.com.'};
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return {error:'Format email belum lengkap. Periksa bagian setelah @ (contoh: gmail.com).'};
  var dom=v.split('@')[1];
  if(TYPOS[dom]) return {error:'Apakah maksud kamu '+v.split('@')[0]+'@'+TYPOS[dom]+'? Periksa kembali penulisan email.'};
  return {value:v};
}
function chkPhone(v){
  var raw=v.trim();
  if(!raw) return {error:'Nomor Telegram belum diisi.'};
  var s=raw.replace(/[\s\-().]/g,'');
  if(/[A-Za-z]/.test(s)) return {error:'Nomor hanya boleh angka. Huruf tidak bisa dipakai. Kalau kamu mau mengisi username, tulis di kolom Username Telegram.'};
  if(!/^\+?[0-9]+$/.test(s)) return {error:'Ada karakter yang tidak diizinkan di nomor. Gunakan angka saja, contoh: 628123456789.'};
  var note='';
  var d=s.replace(/^\+/,'');
  if(/^0/.test(d)){d='62'+d.slice(1);note='Awalan 0 kami ubah jadi 62: '+d+'.'}
  else if(/^8/.test(d)){d='62'+d;note='Kami tambahkan kode negara 62: '+d+'.'}
  if(d.length<8) return {error:'Nomor terlalu pendek ('+d.length+' angka). Minimal 8 angka, contoh: 628123456789.'};
  if(d.length>15) return {error:'Nomor terlalu panjang ('+d.length+' angka). Maksimal 15 angka. Periksa apakah ada angka yang terketik dua kali.'};
  return {value:d,note:note};
}
function chkUser(v){
  var s=v.trim(),note='';
  if(!s) return {error:'Username Telegram belum diisi.'};
  var m=s.match(/(?:https?:\/\/)?(?:t|telegram)\.me\/@?([A-Za-z0-9_]+)/i);
  if(m){s=m[1];note='Kami ambil username dari link kamu: @'+s+'.'}
  s=s.replace(/^@+/,'');
  if(/^\+?[0-9]{6,}$/.test(s)) return {error:'Ini terlihat seperti nomor telepon, bukan username. Nomor ditulis di kolom Nomor Telegram. Username diawali huruf, contoh: @budi_santoso.'};
  if(/\s/.test(s)) return {error:'Username tidak boleh pakai spasi. Itu sepertinya nama tampilan, bukan username. Buka Telegram, Pengaturan, lalu lihat kolom Username (diawali @), contoh: @budi_santoso.'};
  var bad=s.match(/[^A-Za-z0-9_]/g);
  if(bad){var u=[];bad.forEach(function(c){if(u.indexOf(c)<0)u.push(c)});return {error:'Karakter "'+u.join('" "')+'" tidak boleh ada di username. Hanya huruf, angka, dan garis bawah (_).'}}
  if(s.length<5) return {error:'Username terlalu pendek ('+s.length+' karakter). Telegram mewajibkan 5 sampai 32 karakter. Kalau belum punya username, buat dulu di Telegram: Pengaturan lalu Username.'};
  if(s.length>32) return {error:'Username terlalu panjang ('+s.length+' karakter). Maksimal 32 karakter.'};
  if(/^[0-9_]/.test(s)) note=(note?note+' ':'')+'Catatan: username Telegram biasanya diawali huruf. Pastikan sudah sama persis dengan yang di Telegram.';
  return {value:s,note:note};
}
var RULES={eduName:chkName,eduEmail:chkEmail,eduPhone:chkPhone,eduUser:chkUser};

function email2Result(){
  var a=$('eduEmail'),b=$('eduEmail2'); if(!a||!b) return {};
  var x=a.value.trim().toLowerCase(),y=b.value.trim().toLowerCase();
  if(!y) return {error:'Ketik ulang email yang sama persis seperti di kolom sebelumnya.'};
  if(x!==y) return {error:'Tidak sama dengan email di atas ("'+x+'"). Samakan keduanya.'};
  return {value:y};
}
function agreeResult(){var c=$('eduAgree'); return c&&c.checked?{value:1}:{error:'Centang kotak ini dulu untuk memastikan semua data sudah benar.'}}
function result(id){
  if(id==='eduEmail2') return email2Result();
  if(id==='eduAgree') return agreeResult();
  var inp=$(id); return inp?RULES[id](inp.value):{};
}
var ORDER=['eduName','eduEmail','eduEmail2','eduPhone','eduUser','eduAgree'];

var sent={};
function log(items){
  var out=[];
  items.forEach(function(i){var k=i.field+'|'+i.reason+'|'+i.entered;if(!sent[k]){sent[k]=1;out.push(i)}});
  if(!out.length) return;
  try{var c=window.kamarSupabaseClient;if(c&&c.rpc) c.rpc('edu_log_attempt',{p_items:out}).then(function(){},function(){})}catch(e){}
}
function item(id,r){var inp=$(id);return {field:LABEL[id]||id,reason:r.error,entered:inp&&inp.type!=='checkbox'?inp.value:''}}

function paint(id,applyFix){
  var inp=$(id),r=result(id);
  if(id==='eduAgree'){
    var host=inp.closest('label'),el=host.parentNode.querySelector('.edu-fe[data-for="eduAgree"]');
    if(!el){el=document.createElement('div');el.className='edu-fe';el.setAttribute('data-for','eduAgree');host.insertAdjacentElement('afterend',el)}
    el.className='edu-fe'+(r.error?' bad':'');el.textContent=r.error||'';return r;
  }
  if(r.error){setMsg(id,'bad',r.error,inp.value.trim());return r}
  if(applyFix&&r.value!==undefined&&inp.value!==r.value) inp.value=r.value;
  if(id==='eduEmail2') setMsg(id,'ok','Email cocok.');
  else if(r.note) setMsg(id,'ok',r.note); else if(HINTS[id]) showHint(id); else setMsg(id,'ok','');
  return r;
}
function names(ids){return ids.map(function(i){return LABEL[i]}).join(', ')}
function refreshButton(){
  var b=$('eduSubmit'),st=$('eduStatus'); if(!b) return;
  var wrong=ORDER.filter(function(id){return result(id).error});
  b.classList.toggle('edu-btn-off',wrong.length>0);
  b.setAttribute('aria-disabled',wrong.length?'true':'false');
  if(st){
    if(wrong.length){st.className='';st.textContent='Tombol akan aktif setelah semua isian benar. Yang belum benar: '+names(wrong)+'.'}
    else{st.className='ok';st.textContent='Semua isian sudah benar. Silakan kirim pendaftaran.'}
  }
}

function init(){
  var form=$('eduFormEl'); if(!form) return;
  var row=$('eduSubmit')&&$('eduSubmit').parentNode;
  if(row&&!$('eduStatus')){var st=document.createElement('div');st.id='eduStatus';row.insertAdjacentElement('afterend',st)}
  ['eduName','eduPhone','eduUser'].forEach(showHint);
  ['eduName','eduEmail','eduPhone','eduUser'].forEach(function(id){
    var inp=$(id); if(!inp) return;
    inp.addEventListener('blur',function(){
      if(!inp.value.trim()){refreshButton();return}
      var r=paint(id,true);
      if(r.error) log([item(id,r)]);
      if(id==='eduEmail'&&$('eduEmail2').value.trim()) paint('eduEmail2',false);
      refreshButton();
    });
    inp.addEventListener('input',function(){
      if(inp.classList.contains('edu-bad')) paint(id,false);
      refreshButton();
    });
  });
  var e2=$('eduEmail2');
  if(e2){
    e2.addEventListener('blur',function(){if(e2.value.trim()){var r=paint('eduEmail2',false);if(r.error)log([item('eduEmail2',r)])}refreshButton()});
    e2.addEventListener('input',function(){if(e2.classList.contains('edu-bad')) paint('eduEmail2',false);refreshButton()});
  }
  var ag=$('eduAgree'); if(ag) ag.addEventListener('change',function(){paint('eduAgree');refreshButton()});
  refreshButton();

  document.addEventListener('submit',function(ev){
    if(ev.target!==form) return;
    var first=null,errs=[];
    ORDER.forEach(function(id){
      var r=paint(id,true);
      if(r.error){errs.push(item(id,r));if(!first)first=id}
    });
    refreshButton();
    if(errs.length){
      ev.preventDefault();ev.stopImmediatePropagation();
      log(errs);
      var box=$('eduError');
      if(box){box.hidden=false;box.textContent='Pendaftaran belum bisa dikirim. Ada '+errs.length+' isian yang masih salah: '+errs.map(function(e){return e.field}).join(', ')+'. Perbaiki yang bertanda merah.'}
      var t=$(first); if(t){try{t.scrollIntoView({behavior:'smooth',block:'center'})}catch(e){}setTimeout(function(){try{t.focus({preventScroll:true})}catch(e){}},250)}
    } else {
      var b=$('eduError'); if(b){b.hidden=true;b.textContent=''}
    }
  },true);
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
