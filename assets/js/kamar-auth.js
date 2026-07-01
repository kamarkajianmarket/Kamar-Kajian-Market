// Step 25D safe legacy auth shim. No automatic logout or redirect.
(function(){
  window.KamarAuth=window.KamarAuth||{};
  window.KamarAuth.isLoggedIn=function(){return true};
  window.KamarAuth.requireAuth=function(){return true};
  window.KamarAuth.logout=function(){if(window.KamarGuard25D) return window.KamarGuard25D.logout(); location.href='index.html?v=25d'};
})();
