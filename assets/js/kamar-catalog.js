/* KAMAR CATALOG v1 - katalog produk & harga (homepage + member-catalog.html) */
(function(){
  'use strict';
  if(window.KamarCatalog) return;
  var CSS='.kc{display:grid;gap:26px;color:#f5f0e6}.kc-grp{border:1px solid rgba(238,206,122,.2);border-radius:26px;background:rgba(255,255,255,.025);padding:22px}.kc-head{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap;margin-bottom:16px}.kc-head h3{margin:0;font-size:24px;color:#fff3d8}.kc-head p{margin:4px 0 0;color:#a99d82;font-size:14px;line-height:1.5;max-width:640px}.kc-go{display:inline-flex;align-items:center;justify-content:center;min-height:42px;padding:0 20px;border-radius:999px;background:linear-gradient(135deg,#f4df90,#d4a63f);color:#171108!important;font-weight:900;text-decoration:none;font-size:14px;white-space:nowrap}.kc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:12px}.kc-card{position:relative;border:1px solid rgba(238,206,122,.18);border-radius:18px;background:rgba(244,223,144,.04);padding:16px;display:grid;gap:6px;align-content:start}.kc-card.hot{border-color:rgba(244,223,144,.55);background:rgba(244,223,144,.08)}.kc-name{font-weight:900;color:#fff3d8;font-size:15px;line-height:1.35}.kc-sub{color:#a99d82;font-size:12.5px;line-height:1.45}.kc-price{font-size:22px;font-weight:1000;color:#f4df90;letter-spacing:.01em;margin-top:4px}.kc-note{font-size:12px;color:#ffd582;font-weight:800}.kc-badge{position:absolute;top:-10px;right:14px;background:#7b4fb3;color:#fff;font-size:10.5px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;padding:4px 10px;border-radius:999px}.kc-warn{border:1px solid rgba(255,196,90,.45);background:rgba(255,196,90,.08);border-radius:16px;padding:14px 16px;color:#ffe2a8;font-size:14px;line-height:1.5}.kc-warn b{color:#fff3d8}.kc-foot{color:#a99d82;font-size:12.5px;line-height:1.55}.kc-empty{padding:30px;text-align:center;color:#a99d82}@media(max-width:600px){.kc-grp{padding:16px;border-radius:20px}.kc-head h3{font-size:20px}.kc-grid{grid-template-columns:1fr 1fr}.kc-price{font-size:18px}.kc-go{width:100%}}';
  var GROUPS=[
    {key:'kamar_indikator',fac:'indikator',title:'Kamar Indikator',desc:'Indikator zona Kamar untuk membaca struktur dan area penting market. Pilih masa aktif sesuai kebutuhan.'},
    {key:'kamar_robot',fac:'robot',title:'Kamar Robot',desc:'Trading otomatis berbasis logika Kamar. Pilih masa aktif sesuai kebutuhan.'},
    {key:'kamar_private',fac:'ebook',title:'Kamar E-Book + Free Mentoring',desc:'E-Book terstruktur 20 chapter dengan Free Mentoring. Akses selamanya, download 1x. Upgrade bayar selisih harga.'}
  ];
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function rp(n){return 'Rp'+Number(n||0).toLocaleString('id-ID');}
  function shortName(p){
    var t=String(p.title||'');
    if(p.facility_key==='kamar_private') return t.replace(/^Kamar E-Book\s*·\s*/,'');
    return t.replace(/^Kamar (Indikator|Robot)\s*-\s*/,'');
  }
  function sub(p){
    if(p.facility_key==='kamar_private') return 'Chapter 1–'+p.chapter_max;
    return p.is_lifetime?'Akses seumur hidup':(p.duration_days+' hari');
  }
  function client(){
    if(window.KamarSupabase&&window.KamarSupabase.ready) return window.KamarSupabase.ready();
    return Promise.resolve(window.kamarSupabaseClient||null);
  }
  function inject(){
    if(document.getElementById('kamar-catalog-css')) return;
    var s=document.createElement('style');s.id='kamar-catalog-css';s.textContent=CSS;document.head.appendChild(s);
  }
  async function render(el,opts){
    opts=opts||{};inject();
    el.innerHTML='<div class="kc-empty">Memuat katalog…</div>';
    try{
      var c=await client();if(!c) throw new Error('Koneksi database tidak tersedia.');
      var r=await c.from('payment_products').select('product_key,title,facility_key,duration_days,is_lifetime,base_price,promo_price,discount_note,package_level,chapter_max,is_featured,sort_order,is_active').eq('is_active',true).eq('product_type','facility_access').order('sort_order');
      if(r.error) throw r.error;
      var rows=r.data||[];
      var go=opts.goHref||function(g){return 'member-checkout.html?facility='+g.fac;};
      var h='<div class="kc"><div class="kc-warn"><b>Harga fasilitas Kamar dapat naik sewaktu-waktu.</b> Jangan lewatkan kesempatan Anda!</div>';
      GROUPS.forEach(function(g){
        var list=rows.filter(function(p){return p.facility_key===g.key;});
        if(!list.length) return;
        h+='<section class="kc-grp"><div class="kc-head"><div><h3>'+esc(g.title)+'</h3><p>'+esc(g.desc)+'</p></div><a class="kc-go" href="'+esc(go(g))+'">'+esc(opts.cta||'Pilih Paket')+'</a></div><div class="kc-grid">';
        list.forEach(function(p){
          var price=Number(p.promo_price||p.base_price);
          var hot=p.is_featured||/Best Value/i.test(p.discount_note||'');
          h+='<div class="kc-card'+(hot?' hot':'')+'">'+(hot?'<span class="kc-badge">'+(g.fac==='ebook'?'Populer':'Best Value')+'</span>':'')+'<div class="kc-name">'+esc(shortName(p))+'</div><div class="kc-sub">'+esc(sub(p))+'</div><div class="kc-price">'+rp(price)+'</div>'+(p.discount_note?'<div class="kc-note">'+esc(String(p.discount_note).replace(/^Best Value\s*·\s*/,''))+'</div>':'')+'</div>';
        });
        h+='</div></section>';
      });
      h+='<div class="kc-foot">Seluruh produk bersifat edukasi dan bukan jaminan profit. Pembayaran bersifat final dan tidak dapat direfund. Pembayaran hanya ke rekening resmi PT Hikarich Kitana Digital atau melalui Payment Gateway resmi.</div></div>';
      el.innerHTML=h;
    }catch(e){el.innerHTML='<div class="kc-empty">Katalog belum dapat dimuat. '+esc(e.message||e)+'</div>';}
  }
  window.KamarCatalog={render:render};
})();
