/* KAMAR PAY v1 — helper bersama halaman pembayaran (member & admin) */
(function(){
  if(window.KamarPay) return;
  var STATUS={
    pending:['Menunggu Pembayaran','warn'],
    awaiting_verification:['Menunggu Verifikasi','warn'],
    confirmed:['Lunas','ok'],
    rejected:['Ditolak','bad'],
    expired:['Kedaluwarsa','off'],
    failed:['Gagal','off'],
    refunded:['Direfund','off']
  };
  function rp(n){return 'Rp'+Number(n||0).toLocaleString('id-ID');}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]});}
  function fmtDate(d){if(!d)return '-';try{return new Date(d).toLocaleString('id-ID',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});}catch(e){return String(d);}}
  function statusChip(s){var m=STATUS[s]||[s,'off'];return '<span class="kp-chip kp-'+m[1]+'">'+esc(m[0])+'</span>';}
  function client(){
    if(window.KamarSupabase&&window.KamarSupabase.ready) return window.KamarSupabase.ready();
    return Promise.resolve(window.kamarSupabaseClient||null);
  }
  async function me(){
    var c=await client(); if(!c) throw new Error('Koneksi database tidak tersedia.');
    var s=await c.auth.getSession(); var user=s&&s.data&&s.data.session&&s.data.session.user;
    if(!user){location.replace('member.html'); throw new Error('login');}
    var r=await c.from('member_profiles').select('id,full_name,member_id,email,role').eq('user_id',user.id).maybeSingle();
    if(!r.data) throw new Error('Profil member tidak ditemukan.');
    return {client:c,user:user,profile:r.data,session:s.data.session};
  }
  function toast(m){var t=document.getElementById('toast');if(!t){alert(m);return;}t.textContent=m;t.classList.add('show');setTimeout(function(){t.classList.remove('show');},3200);}
  function copy(text,btn){
    try{navigator.clipboard.writeText(text);}catch(e){var ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();}
    if(btn){var o=btn.textContent;btn.textContent='Tersalin ✓';setTimeout(function(){btn.textContent=o;},1600);}
  }
  // Kompres gambar di browser (hemat storage/bandwidth). PDF dibiarkan (maks 1,5 MB).
  async function compress(file){
    if(!file) throw new Error('Pilih file bukti pembayaran.');
    if(file.type==='application/pdf'){
      if(file.size>1.5*1024*1024) throw new Error('PDF terlalu besar (maks 1,5 MB). Unggah foto/screenshot bukti transfer.');
      return {blob:file,ext:'pdf',type:'application/pdf'};
    }
    if(!/^image\//.test(file.type)) throw new Error('Format file harus gambar (JPG/PNG/WebP) atau PDF.');
    var bmp;
    try{bmp=await createImageBitmap(file);}catch(e){throw new Error('Gambar tidak dapat dibaca.');}
    var max=1280,w=bmp.width,h=bmp.height,k=Math.min(1,max/Math.max(w,h));
    var cw=Math.round(w*k),ch=Math.round(h*k);
    var cv=document.createElement('canvas');cv.width=cw;cv.height=ch;
    var ctx=cv.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,cw,ch);ctx.drawImage(bmp,0,0,cw,ch);
    function toBlob(type,q){return new Promise(function(res){cv.toBlob(res,type,q);});}
    var type='image/webp',ext='webp',q=0.72,blob=await toBlob(type,q);
    if(!blob||blob.type!=='image/webp'){type='image/jpeg';ext='jpg';blob=await toBlob(type,q);}
    while(blob&&blob.size>350*1024&&q>0.4){q-=0.1;blob=await toBlob(type,q);}
    return {blob:blob,ext:ext,type:type};
  }
  function warnBanner(){
    return '<div class="kp-warn"><span class="kp-warn-ico">⚠</span><div><strong>Harga fasilitas Kamar dapat naik sewaktu-waktu.</strong><span> Jangan lewatkan kesempatan Anda!</span></div></div>';
  }
  var TERMS=[
    {k:'no_refund',t:'Saya memahami dan menyetujui bahwa seluruh pembayaran bersifat final dan <b>TIDAK DAPAT DIREFUND</b>. Pengecualian hanya untuk transfer ganda, dan yang dikembalikan hanya kelebihan transfer ke rekening pengirim.'},
    {k:'risk',t:'Saya memahami bahwa trading mengandung <b>risiko tinggi</b>, termasuk kehilangan seluruh modal. Seluruh produk, materi, dan mentoring Kamar bersifat edukasi, <b>BUKAN jaminan profit</b> dan BUKAN nasihat investasi. Keputusan trading sepenuhnya tanggung jawab saya.'},
    {k:'tos',t:'Saya telah membaca dan menyetujui Syarat &amp; Ketentuan Kamar Kajian Market, dan saya hanya akan membayar ke rekening resmi <b>PT Hikarich Kitana Digital</b> yang tertera di halaman ini atau melalui Payment Gateway resmi.'}
  ];
  function termsHtml(){
    return '<div class="kp-terms"><div class="kp-terms-title">Persetujuan Wajib</div>'+TERMS.map(function(x){
      return '<label class="kp-check"><input type="checkbox" data-term="'+x.k+'"><span>'+x.t+'</span></label>';
    }).join('')+'</div>';
  }
  function termsValue(root){
    var o={};TERMS.forEach(function(x){var i=root.querySelector('[data-term="'+x.k+'"]');o[x.k]=!!(i&&i.checked);});return o;
  }
  function termsOk(root){var v=termsValue(root);return v.no_refund&&v.risk&&v.tos;}
  var st=document.createElement('style');
  st.textContent='.kp-chip{display:inline-flex;align-items:center;border-radius:999px;padding:5px 11px;font-size:11px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;border:1px solid rgba(238,206,122,.2);color:#d8cda9}.kp-ok{color:#9effca;background:rgba(28,97,65,.14);border-color:rgba(158,255,202,.28)}.kp-warn.x,.kp-chip.kp-warn{color:#ffd582;background:rgba(255,198,86,.09)}.kp-bad{color:#ffb4b4;background:rgba(255,96,96,.1);border-color:rgba(255,96,96,.3)}.kp-off{color:#aaa}'
   +'.kp-warn{display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:16px;color:#fff;font-weight:800;line-height:1.45;background:linear-gradient(110deg,#ff6a3d 0%,#ff2e63 45%,#ff9a3d 55%,#ff2e63 100%);background-size:220% 100%;box-shadow:0 0 0 1px rgba(255,170,140,.5),0 8px 26px rgba(255,70,90,.35);animation:kpShimmer 2.6s linear infinite}.kp-warn strong{font-weight:1000}.kp-warn-ico{font-size:22px;animation:kpPulse 1.6s ease-in-out infinite}@keyframes kpShimmer{0%{background-position:200% 0}100%{background-position:-20% 0}}@keyframes kpPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.18)}}@media (prefers-reduced-motion:reduce){.kp-warn,.kp-warn-ico{animation:none}}'
   +'.kp-terms{border:1px solid rgba(238,206,122,.28);border-radius:18px;padding:16px;background:rgba(255,255,255,.03);display:grid;gap:12px}.kp-terms-title{font-size:12px;letter-spacing:.16em;text-transform:uppercase;font-weight:1000;color:#f4df90}.kp-check{display:flex;gap:12px;align-items:flex-start;cursor:pointer;color:#e8dfc9;line-height:1.55;font-size:14px}.kp-check input{appearance:auto;-webkit-appearance:checkbox;width:20px;height:20px;min-width:20px;margin-top:2px;accent-color:#d4a63f;padding:0}.kp-check b{color:#fff3d8}';
  document.head.appendChild(st);
  window.KamarPay={rp:rp,esc:esc,fmtDate:fmtDate,statusChip:statusChip,STATUS:STATUS,client:client,me:me,toast:toast,copy:copy,compress:compress,warnBanner:warnBanner,termsHtml:termsHtml,termsValue:termsValue,termsOk:termsOk};
})();
