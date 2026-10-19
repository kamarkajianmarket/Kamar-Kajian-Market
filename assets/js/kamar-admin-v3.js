/* KAMAR ADMIN v3 - dashboard admin baru + tema seragam */
(function(){
if(window.__KAMAR_ADMIN_V3__)return;window.__KAMAR_ADMIN_V3__=1;
var isAdmin=function(){return document.body&&document.body.classList.contains('kamar-admin-desktop-v1')};
function ready(f){if(document.readyState!=='loading')f();else document.addEventListener('DOMContentLoaded',f)}
function sb(){return window.kamarSupabaseClient||window.KamarSupabaseClient||null}
function rp(n){return 'Rp '+(Number(n)||0).toLocaleString('id-ID')}
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function dt(s){try{return new Date(s).toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'})}catch(e){return ''}}
var GROUPS=[
['Member & Akses',[['admin-members.html','Data Member','Semua member, status akun, referral'],['admin-activation.html','Aktivasi Akun & Fasilitas','Aktifkan atau perpanjang fasilitas'],['admin-license-requests.html','Request License','Persetujuan lisensi indikator & robot'],['admin-edukasi.html','Kamar Edukasi Gratis','Pendaftar, persetujuan, link grup'],['admin-internal.html','Data Internal','Akun internal tim']]],
['Pembayaran',[['admin-payments.html','Pembayaran & Verifikasi','Cek bukti transfer, setujui atau tolak'],['admin-payment-products.html','Katalog Harga & Produk','Harga, diskon, masa berlaku'],['admin-payment.html','Payment Gateway','Pengaturan jalur pembayaran'],['admin-ebook.html','E-Book per Paket','Pemetaan chapter per paket']]],
['Affiliate',[['admin-affiliate-overview.html','Ringkasan Affiliate','Performa & komisi'],['admin-affiliate-list.html','Data Affiliate','Daftar affiliate'],['admin-affiliate-payment.html','Pencairan Komisi','Permintaan pembayaran'],['admin-affiliate-reward.html','Reward / Komisi','Aturan reward']]],
['Konten Website',[['admin-banner.html','Banner','Banner homepage & member'],['admin-video.html','Video','Video edukasi'],['admin-materials.html','Materi','Materi member'],['admin-links.html','Pengaturan Link','Link resmi']]],
['Kontrol Sistem',[['admin-page-control.html','Kontrol Halaman Utama','Tampil/sembunyi section homepage'],['admin-dashboard-control.html','Kontrol Dashboard Member','Fasilitas yang tampil ke member'],['admin-maintenance.html','Maintenance Fasilitas','Mode pemeliharaan'],['admin-settings.html','Pengaturan Umum','Pengaturan website'],['admin-data-check.html','Cek Data','Validasi sinkronisasi data']]]
];
function kpi(h,l,v,s,warn){return '<a class="ka-kpi'+(warn?' warn':'')+'" href="'+h+'"><small>'+l+'</small><b>'+v+'</b><span>'+s+'</span></a>'}
function build(){
 var main=document.querySelector('.split-main');if(!main||document.getElementById('kaDash'))return;
 var hero=main.querySelector('.hero')||main.firstElementChild;
 var w=document.createElement('div');w.id='kaDash';w.style.cssText='display:flex;flex-direction:column;gap:18px';
 w.innerHTML='<div class="ka-kpis" id="kaKpis">'+kpi('admin-members.html','Total Member','…','memuat')+kpi('admin-payments.html','Menunggu Verifikasi','…','bukti transfer')+kpi('admin-payments.html','Menunggu Pembayaran','…','invoice aktif')+kpi('admin-payments.html','Omzet Bulan Ini','…','pembayaran lunas')+kpi('admin-affiliate-payment.html','Komisi Diminta','…','menunggu dicairkan')+kpi('admin-payment-products.html','Produk Aktif','…','tampil di katalog')+'</div>'
 +'<div class="ka-two"><section class="split-card ka-sec"><h2>Pembayaran Terbaru</h2><div class="ka-list" id="kaPay"><div class="ka-empty">Memuat…</div></div></section><section class="split-card ka-sec"><h2>Member Terbaru</h2><div class="ka-list" id="kaMem"><div class="ka-empty">Memuat…</div></div></section></div>'
 +GROUPS.map(function(g){return '<section class="split-card ka-sec"><h2>'+g[0]+'</h2><div class="ka-grid">'+g[1].map(function(t){return '<a class="ka-tile" href="'+t[0]+'"><b>'+t[1]+'</b><span>'+t[2]+'</span></a>'}).join('')+'</div></section>'}).join('');
 hero.insertAdjacentElement('afterend',w);
 [].forEach.call(main.children,function(c){var t=(c.querySelector('.kamar-rc-head,h2,h3')||c).textContent||'';if(/Ringkasan Admin|Menu Admin Kamar/i.test(t.slice(0,60)))c.style.display='none'});
 load();
}
async function load(){
 var c=sb();for(var w=0;!c&&w<60;w++){await new Promise(function(r){setTimeout(r,250)});c=sb()}if(!c)return;var K=document.getElementById('kaKpis');
 try{
  var now=new Date(),m0=new Date(now.getFullYear(),now.getMonth(),1).toISOString();
  var r=await Promise.all([
   c.from('member_profiles').select('id',{count:'exact',head:true}),
   c.from('payments').select('id',{count:'exact',head:true}).eq('payment_status','awaiting_verification'),
   c.from('payments').select('id',{count:'exact',head:true}).eq('payment_status','pending'),
   c.from('payments').select('amount').eq('payment_status','confirmed').gte('confirmed_at',m0),
   c.from('affiliate_payment_requests').select('id',{count:'exact',head:true}).eq('status','pending'),
   c.from('payment_products').select('id',{count:'exact',head:true}).eq('is_active',true),
   c.from('payments').select('order_code,product_key,amount,payment_status,created_at').order('created_at',{ascending:false}).limit(6),
   c.from('member_profiles').select('full_name,email,created_at').order('created_at',{ascending:false}).limit(6)]);
  var om=(r[3].data||[]).reduce(function(a,x){return a+(Number(x.amount)||0)},0);
  var aw=r[1].count||0;
  K.innerHTML=kpi('admin-members.html','Total Member',r[0].count||0,'akun terdaftar')+kpi('admin-payments.html','Menunggu Verifikasi',aw,'bukti transfer perlu dicek',aw>0)+kpi('admin-payments.html','Menunggu Pembayaran',r[2].count||0,'invoice aktif')+kpi('admin-payments.html','Omzet Bulan Ini',rp(om),'pembayaran lunas')+kpi('admin-affiliate-payment.html','Komisi Diminta',r[4].count||0,'menunggu dicairkan',(r[4].count||0)>0)+kpi('admin-payment-products.html','Produk Aktif',r[5].count||0,'tampil di katalog & checkout');
  var P=document.getElementById('kaPay'),M=document.getElementById('kaMem');
  P.innerHTML=(r[6].data||[]).map(function(x){return '<a class="ka-row" href="admin-payments.html"><span>'+esc(x.order_code||x.product_key||x.payment_type||'Pembayaran')+' · '+rp(x.amount)+'</span><i>'+esc(x.payment_status)+' · '+dt(x.created_at)+'</i></a>'}).join('')||'<div class="ka-empty">Belum ada pembayaran.</div>';
  M.innerHTML=(r[7].data||[]).map(function(x){return '<a class="ka-row" href="admin-members.html"><span>'+esc(x.full_name||x.email||'-')+'</span><i>'+dt(x.created_at)+'</i></a>'}).join('')||'<div class="ka-empty">Belum ada member.</div>';
 }catch(e){console.warn('kamar-admin-v3',e)}
}
function init(){if(!isAdmin())return;var p=location.pathname;if(/admin(\.html)?\/?$/.test(p)){var t=0,i=setInterval(function(){build();if(document.getElementById('kaDash')||++t>40)clearInterval(i)},250)}}
ready(init);
})();
