(function(){
  const galleries={
    signal:[
      ['assets/showcase/study-01.png','M5 • SELL'],['assets/showcase/study-02.png','M5 • SELL'],['assets/showcase/study-03.png','M30 • SELL'],['assets/showcase/study-04.png','M15 • SELL'],['assets/showcase/study-05.png','H1 • BUY'],['assets/showcase/study-06.png','Rekap M5 & M15'],['assets/showcase/study-07.png','Rekap H1 & M30']
    ],
    private:[
      ['assets/facilities/private/chapter-01.png','Contoh Chapter 1'],['assets/facilities/private/chapter-02.png','Contoh Chapter 2'],['assets/facilities/private/chapter-03.png','Contoh Chapter 3'],['assets/facilities/private/chapter-04.png','Contoh Chapter 4'],['assets/facilities/private/chapter-05.png','Contoh Chapter 5']
    ],
    indikator:[
      ['assets/showcase/indicator-01.png','H1 Preview'],['assets/showcase/indicator-02.png','M30 Preview'],['assets/showcase/indicator-03.png','M15 Preview'],['assets/showcase/indicator-04.png','M5 Preview'],['assets/showcase/indicator-05.png','M1 Preview'],['assets/showcase/indicator-06.png','Zona Aktif']
    ],
    robot:[['assets/facilities/robot/robot-entry.jpeg','Preview Robot MT5']]
  };
  const lightbox=document.getElementById('kamarShowcaseLightbox');
  let activeGallery='signal',activeIndex=0;
  function showLightbox(gallery,index){if(!lightbox||!galleries[gallery])return;activeGallery=gallery;activeIndex=index;const item=galleries[gallery][index];lightbox.querySelector('img').src=item[0];lightbox.querySelector('figcaption').textContent=item[1];lightbox.hidden=false;document.documentElement.style.overflow='hidden'}
  function close(){if(!lightbox)return;lightbox.hidden=true;document.documentElement.style.overflow=''}
  function move(delta){const list=galleries[activeGallery];if(!list)return;activeIndex=(activeIndex+delta+list.length)%list.length;showLightbox(activeGallery,activeIndex)}
  document.querySelectorAll('.facility-gallery[data-gallery]').forEach(function(box){
    const key=box.dataset.gallery,list=galleries[key],stage=box.querySelector('.gallery-stage'),img=stage&&stage.querySelector('img'),title=stage&&stage.querySelector('strong');let current=0;if(!list||!stage)return;
    box.querySelectorAll('.gallery-tabs button').forEach(function(btn){btn.addEventListener('click',function(){current=Number(btn.dataset.index)||0;box.querySelectorAll('.gallery-tabs button').forEach(b=>b.classList.toggle('active',b===btn));img.style.opacity='0';setTimeout(function(){img.src=list[current][0];img.alt=list[current][1];title.textContent=list[current][1];img.style.opacity='1'},100)})});
    stage.addEventListener('click',function(){showLightbox(key,current)});
  });
  if(lightbox){lightbox.querySelector('.lightbox-close').addEventListener('click',close);lightbox.querySelector('.lightbox-prev').addEventListener('click',()=>move(-1));lightbox.querySelector('.lightbox-next').addEventListener('click',()=>move(1));lightbox.addEventListener('click',e=>{if(e.target===lightbox)close()});document.addEventListener('keydown',e=>{if(lightbox.hidden)return;if(e.key==='Escape')close();if(e.key==='ArrowLeft')move(-1);if(e.key==='ArrowRight')move(1)})}
})();
