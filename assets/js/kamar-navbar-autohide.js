(function () {
  var header = document.querySelector('header.site-header');
  if (!header) return;

  var lastY = window.scrollY || window.pageYOffset || 0;
  var topZone = 80;
  var threshold = 8;
  var ticking = false;

  function onScroll() {
    var y = window.scrollY || window.pageYOffset || 0;

    if (y <= topZone) {
      header.classList.remove('kamar-nav-hidden');
      lastY = y;
      ticking = false;
      return;
    }

    var diff = y - lastY;

    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        header.classList.add('kamar-nav-hidden');
      } else {
        header.classList.remove('kamar-nav-hidden');
      }
      lastY = y;
    }

    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (!ticking) {
      window.requestAnimationFrame(onScroll);
      ticking = true;
    }
  }, { passive: true });
})();
