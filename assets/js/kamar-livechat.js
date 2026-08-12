(function(){
  'use strict';
  if(window.__kamarTawkLoaded) return;
  window.__kamarTawkLoaded = true;

  var Tawk_API = window.Tawk_API || {};
  window.Tawk_API = Tawk_API;
  window.Tawk_LoadStart = new Date();

  var s1 = document.createElement('script');
  var s0 = document.getElementsByTagName('script')[0];
  s1.async = true;
  s1.src = 'https://embed.tawk.to/6a7bfc747337fe1d481c6cac/1jvq54ane';
  s1.charset = 'UTF-8';
  s1.setAttribute('crossorigin', '*');
  if(s0 && s0.parentNode){ s0.parentNode.insertBefore(s1, s0); }
  else { document.head.appendChild(s1); }
})();
