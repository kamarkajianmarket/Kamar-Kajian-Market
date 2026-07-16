(function(){
  'use strict';
  const reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealTargets=[
    '.hero','.section-heading','.facility-card','.facility-panel-v2',
    '.affiliate-section','.support-section','.faq-section','footer'
  ];
  const nodes=[];
  revealTargets.forEach(sel=>document.querySelectorAll(sel).forEach((el,i)=>{
    if(el.dataset.premiumBound)return;
    el.dataset.premiumBound='1';el.classList.add('premium-reveal');el.dataset.delay=String((i%3)+1);nodes.push(el);
  }));
  if(!reduced&&'IntersectionObserver' in window){
    const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-visible');io.unobserve(e.target)}}),{threshold:.08,rootMargin:'0px 0px -6%'});
    nodes.forEach(n=>io.observe(n));
  }else nodes.forEach(n=>n.classList.add('is-visible'));

  document.querySelectorAll('.facility-card').forEach(card=>{
    if(reduced)return;
    card.addEventListener('pointermove',e=>{
      const r=card.getBoundingClientRect();const x=(e.clientX-r.left)/r.width;const y=(e.clientY-r.top)/r.height;
      card.style.setProperty('--mx',(x*100).toFixed(1)+'%');card.style.setProperty('--my',(y*100).toFixed(1)+'%');
      card.style.setProperty('--ry',((x-.5)*5).toFixed(2)+'deg');card.style.setProperty('--rx',((.5-y)*4).toFixed(2)+'deg');
    });
    card.addEventListener('pointerleave',()=>{card.style.removeProperty('--rx');card.style.removeProperty('--ry')});
  });
  document.querySelectorAll('.facility-panel-v2').forEach(panel=>{
    panel.addEventListener('pointermove',e=>{const r=panel.getBoundingClientRect();panel.style.setProperty('--px',((e.clientX-r.left)/r.width*100).toFixed(1)+'%');panel.style.setProperty('--py',((e.clientY-r.top)/r.height*100).toFixed(1)+'%')});
  });
})();
