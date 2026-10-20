/* Badge jalur aktivasi (GRATIS / BERBAYAR) seragam di semua kartu fasilitas AKTIF pada dashboard member. */
(function(){
'use strict';
var FREE={'kamar edukasi':1,'kamar signal':1,'kamar study':1};
var IB_FREE={'kamar indikator':1,'kamar robot':1};
var source=null,ready=false;
var css=document.createElement('style');
css.textContent='.kd-route{display:inline-block;margin-left:8px;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;vertical-align:middle;line-height:1.6}.kd-route.gratis{color:#bfffd9;background:rgba(28,97,65,.22);border:1px solid rgba(158,255,202,.35)}.kd-route.berbayar{color:#ffe2a0;background:rgba(212,166,63,.16);border:1px solid rgba(232,199,119,.4)}';
document.head.appendChild(css);

function routeFor(name){
  var n=String(name||'').trim().toLowerCase();
  if(FREE[n]) return 'gratis';
  if(IB_FREE[n]&&source==='ib_kamar') return 'gratis';
  return 'berbayar';
}
function apply(){
  if(!ready) return;
  document.querySelectorAll('.kd-fac').forEach(function(card){
    var fn=card.querySelector('.kd-fn'); if(!fn) return;
    var old=fn.querySelector('.kd-route');
    if(!card.classList.contains('on')){ if(old) old.remove(); return }
    var r=routeFor(fn.firstChild&&fn.firstChild.nodeType===3?fn.firstChild.nodeValue:fn.textContent.replace(/gratis|berbayar/ig,''));
    if(old&&old.classList.contains(r)) return;
    if(old) old.remove();
    var b=document.createElement('span');
    b.className='kd-route '+r; b.textContent=r==='gratis'?'Gratis':'Berbayar';
    fn.appendChild(b);
  });
}
async function load(){
  try{
    var c=null;
    for(var i=0;i<40&&!c;i++){c=window.kamarSupabaseClient||null;if(!c)await new Promise(function(r){setTimeout(r,250)})}
    if(!c) return;
    var s=await c.auth.getSession(); var uid=s&&s.data&&s.data.session&&s.data.session.user&&s.data.session.user.id;
    if(!uid) return;
    var p=await c.from('member_profiles').select('id').eq('user_id',uid).maybeSingle();
    if(p&&p.data){var a=await c.from('member_access').select('activation_source').eq('profile_id',p.data.id).maybeSingle();source=a&&a.data?a.data.activation_source:null}
  }catch(e){}
  apply();
}
ready=true;
var t=null;
new MutationObserver(function(){clearTimeout(t);t=setTimeout(apply,80)}).observe(document.documentElement,{childList:true,subtree:true});
apply();
load();
})();
