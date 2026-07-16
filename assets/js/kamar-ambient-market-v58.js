/* Kamar Kajian Market — Ambient Market Motion V58 */
(() => {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;

  function installAmbientCandles() {
    if (document.querySelector('.kamar-ambient-market')) return;
    const layer = document.createElement('div');
    layer.className = 'kamar-ambient-market';
    layer.setAttribute('aria-hidden', 'true');

    const candles = [
      [7,18,18,28,8.8],[15,46,10,34,10.4],[24,72,24,22,9.6],
      [36,13,15,38,11.2],[48,58,29,20,8.9],[61,28,13,40,10.8],
      [73,76,22,26,9.4],[84,37,17,36,11.5],[93,64,26,22,10.1]
    ];
    candles.forEach(([x,y,body,height,speed]) => {
      const candle = document.createElement('span');
      candle.style.setProperty('--x', `${x}%`);
      candle.style.setProperty('--y', `${y}%`);
      candle.style.setProperty('--body', `${body}%`);
      candle.style.setProperty('--height', `${height}px`);
      candle.style.setProperty('--speed', `${speed}s`);
      layer.appendChild(candle);
    });
    document.body.prepend(layer);
  }

  function installReveal() {
    const selectors = [
      'main > section',
      '.facility-panel-v2',
      '.private-course-panel',
      '.affiliate-section',
      '.faq-section',
      'footer'
    ];
    const nodes = [...document.querySelectorAll(selectors.join(','))]
      .filter((node, index, array) => array.indexOf(node) === index);

    nodes.forEach((node) => node.setAttribute('data-kamar-ambient-reveal', ''));
    if (reducedMotion || !('IntersectionObserver' in window)) {
      nodes.forEach((node) => node.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    nodes.forEach((node) => observer.observe(node));
  }

  function installAmbientTracking() {
    if (reducedMotion) return;
    let targetX = 50;
    let targetY = 28;
    let currentX = targetX;
    let currentY = targetY;
    let ticking = false;

    function render() {
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;
      root.style.setProperty('--ambient-x', `${currentX.toFixed(2)}%`);
      root.style.setProperty('--ambient-y', `${currentY.toFixed(2)}%`);
      root.style.setProperty('--ambient-scroll', `${Math.min(window.scrollY * 0.035, 34).toFixed(1)}px`);
      ticking = false;
    }

    function requestRender() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(render);
    }

    window.addEventListener('pointermove', (event) => {
      targetX = (event.clientX / window.innerWidth) * 100;
      targetY = (event.clientY / window.innerHeight) * 100;
      requestRender();
    }, { passive: true });
    window.addEventListener('scroll', requestRender, { passive: true });
    requestRender();
  }

  function init() {
    installAmbientCandles();
    installReveal();
    installAmbientTracking();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
