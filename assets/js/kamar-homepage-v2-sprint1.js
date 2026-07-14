(function(){
  const galleries={
    study:[
      {src:'assets/showcase/study-01.png',alt:'Contoh Kamar Study XAUUSD M5 Sell',caption:'M5 • SELL Study'},
      {src:'assets/showcase/study-02.png',alt:'Contoh Kamar Study XAUUSD M5 Sell kedua',caption:'M5 • SELL Study'},
      {src:'assets/showcase/study-03.png',alt:'Contoh Kamar Study XAUUSD M30 Sell',caption:'M30 • SELL Study'},
      {src:'assets/showcase/study-04.png',alt:'Contoh Kamar Study XAUUSD M15 Sell',caption:'M15 • SELL Study'},
      {src:'assets/showcase/study-05.png',alt:'Contoh Kamar Study XAUUSD H1 Buy',caption:'H1 • BUY Study'},
      {src:'assets/showcase/study-06.png',alt:'Rekap Kamar Study M5 dan M15',caption:'Rekap M5 & M15'},
      {src:'assets/showcase/study-07.png',alt:'Rekap Kamar Study H1 dan M30',caption:'Rekap H1 & M30'}
    ],
    indicator:[
      {src:'assets/showcase/indicator-01.png',alt:'Kamar Indikator timeframe H1',caption:'H1 Preview'},
      {src:'assets/showcase/indicator-02.png',alt:'Kamar Indikator timeframe M30',caption:'M30 Preview'},
      {src:'assets/showcase/indicator-03.png',alt:'Kamar Indikator timeframe M15',caption:'M15 Preview'},
      {src:'assets/showcase/indicator-04.png',alt:'Kamar Indikator timeframe M5',caption:'M5 Preview'},
      {src:'assets/showcase/indicator-05.png',alt:'Kamar Indikator timeframe M1',caption:'M1 Preview'},
      {src:'assets/showcase/indicator-06.png',alt:'Kamar Indikator dengan zona aktif',caption:'Zona Aktif'}
    ]
  };
  let activeGallery='study',activeIndex=0;
  const lightbox=document.getElementById('kamarShowcaseLightbox');
  if(!lightbox)return;
  const lbImg=lightbox.querySelector('img');
  const lbCaption=lightbox.querySelector('figcaption');
  function openLightbox(gallery,index){
    activeGallery=gallery;activeIndex=index;
    const item=galleries[gallery][index];
    lbImg.src=item.src;lbImg.alt=item.alt;lbCaption.textContent=item.caption;
    lightbox.hidden=false;document.documentElement.style.overflow='hidden';
  }
  function closeLightbox(){lightbox.hidden=true;document.documentElement.style.overflow=''}
  function moveLightbox(delta){
    const list=galleries[activeGallery];activeIndex=(activeIndex+delta+list.length)%list.length;
    const item=list[activeIndex];lbImg.src=item.src;lbImg.alt=item.alt;lbCaption.textContent=item.caption;
  }
  document.querySelectorAll('.product-showcase').forEach(function(box){
    const gallery=box.dataset.gallery;
    const stage=box.querySelector('.showcase-stage');
    const image=stage.querySelector('img');
    const caption=stage.querySelector('.stage-caption strong');
    let current=0;
    box.querySelectorAll('.showcase-tab').forEach(function(tab){
      tab.addEventListener('click',function(){
        current=Number(tab.dataset.index)||0;
        box.querySelectorAll('.showcase-tab').forEach(t=>t.classList.toggle('active',t===tab));
        const item=galleries[gallery][current];
        image.style.opacity='0';
        window.setTimeout(function(){image.src=item.src;image.alt=item.alt;caption.textContent=item.caption;image.style.opacity='1'},120);
      });
    });
    stage.addEventListener('click',function(){openLightbox(gallery,current)});
  });
  document.querySelectorAll('[data-lightbox-src]').forEach(function(btn){
    btn.addEventListener('click',function(){
      const src=btn.dataset.lightboxSrc;
      const idx=galleries.study.findIndex(item=>item.src===src);
      openLightbox('study',idx<0?0:idx);
    });
  });
  lightbox.querySelector('.lightbox-close').addEventListener('click',closeLightbox);
  lightbox.querySelector('.lightbox-prev').addEventListener('click',()=>moveLightbox(-1));
  lightbox.querySelector('.lightbox-next').addEventListener('click',()=>moveLightbox(1));
  lightbox.addEventListener('click',function(e){if(e.target===lightbox)closeLightbox()});
  document.addEventListener('keydown',function(e){if(lightbox.hidden)return;if(e.key==='Escape')closeLightbox();if(e.key==='ArrowLeft')moveLightbox(-1);if(e.key==='ArrowRight')moveLightbox(1)});
})();
