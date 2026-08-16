(function(){
'use strict';
if(window.__kamarTawkLoaded) return;
window.__kamarTawkLoaded = true;

var Tawk_API = window.Tawk_API || {};
window.Tawk_API = Tawk_API;
window.Tawk_LoadStart = new Date();

function pick(o, keys){
  for (var i = 0; i < keys.length; i++){
    var v = o && o[keys[i]];
    if (v) return String(v).trim();
  }
  return '';
}

function readMember(){
  try{
    if (window.KamarSessionFinal28 && typeof window.KamarSessionFinal28.getMember === 'function'){
      return window.KamarSessionFinal28.getMember();
    }
  }catch(e){}
  return null;
}

function withTimeout(promise, ms){
  return new Promise(function(resolve){
    var done = false;
    var timer = setTimeout(function(){ if(!done){ done = true; resolve(null); } }, ms);
    promise.then(function(v){ if(!done){ done = true; clearTimeout(timer); resolve(v); } })
           .catch(function(){ if(!done){ done = true; clearTimeout(timer); resolve(null); } });
  });
}

function loadEmbed(){
  var s1 = document.createElement('script');
  var s0 = document.getElementsByTagName('script')[0];
  s1.async = true;
  s1.src = 'https://embed.tawk.to/6a7bfc747337fe1d481c6cac/1jvq54ane';
  s1.charset = 'UTF-8';
  s1.setAttribute('crossorigin', '*');
  if (s0 && s0.parentNode){ s0.parentNode.insertBefore(s1, s0); }
  else { document.head.appendChild(s1); }

  var s2 = document.createElement('script');
  s2.defer = true;
  s2.src = '/assets/js/kamar-support.js?v=2';
  if (s0 && s0.parentNode){ s0.parentNode.insertBefore(s2, s0); }
  else { document.head.appendChild(s2); }
}

var member = readMember();
var name = member ? pick(member, ['fullName', 'full_name', 'name']) : '';
var email = member ? pick(member, ['email', 'member_email', 'user_email', 'account_email', 'login_email']) : '';

if (email){
  window.__kamarSupportMember = { name: name, email: email };
  withTimeout(
    fetch('/api/tawk-hmac', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email })
    }).then(function(r){ return r.ok ? r.json() : null; }),
    1200
  ).then(function(data){
    Tawk_API.visitor = {};
    if (name) Tawk_API.visitor.name = name;
    if (email) Tawk_API.visitor.email = email;
    if (data && data.hash) Tawk_API.visitor.hash = data.hash;
    loadEmbed();
  });
} else {
  loadEmbed();
}
})();
