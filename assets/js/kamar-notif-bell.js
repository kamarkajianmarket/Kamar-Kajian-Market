(function(){
'use strict';
if(window.__KAMAR_NOTIF_BELL_V1__) return;
window.__KAMAR_NOTIF_BELL_V1__ = true;

function esc(v){ return String(v==null?'':v).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }

function relTime(iso){
try{
var d = new Date(iso);
var diff = Math.floor((Date.now() - d.getTime())/1000);
if(diff < 60) return 'Baru saja';
if(diff < 3600) return Math.floor(diff/60)+' menit lalu';
if(diff < 86400) return Math.floor(diff/3600)+' jam lalu';
if(diff < 604800) return Math.floor(diff/86400)+' hari lalu';
return d.toLocaleDateString('id-ID', {day:'numeric',month:'short',year:'numeric'});
}catch(e){ return ''; }
}

var BELL_SVG = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="23" height="23"><path d="M12 3C9.5 3 7.6 5 7.6 7.5V11c0 .8-.3 1.6-.9 2.2L5.4 14.5c-.6.6-.2 1.5.6 1.5h12c.8 0 1.2-.9.6-1.5l-1.3-1.3c-.6-.6-.9-1.4-.9-2.2V7.5C16.4 5 14.5 3 12 3Z" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/><path d="M9.5 18a2.5 2.5 0 0 0 5 0" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>';

var state = { items: [], unread: 0, open: false, profileId: null, client: null, loaded:false, btn:null, panel:null, badge:null };

function waitFor(check, timeoutMs){
return new Promise(function(resolve){
var start = Date.now();
(function tick(){
var v = check();
if(v) return resolve(v);
if(Date.now()-start > timeoutMs) return resolve(null);
setTimeout(tick, 120);
})();
});
}

function buildUI(){
if(document.getElementById('kamarNotifPanel29F')) { state.btn = document.querySelector('.kamar-notif-btn'); state.panel = document.getElementById('kamarNotifPanel29F'); state.badge = state.btn && state.btn.querySelector('.kamar-notif-badge'); return; }
var actions = document.querySelector('.kamar-global-actions') || document.querySelector('.header-actions');
if(!actions) return;

var btn = document.createElement('button');
btn.type = 'button';
btn.className = 'kamar-notif-btn';
btn.setAttribute('aria-label','Notifikasi');
btn.style.cssText = 'position:relative;display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:12px;border:1px solid rgba(120,90,20,.25);background:linear-gradient(135deg,#f4df90,#c69a39);color:#1c1a16;cursor:pointer;box-shadow:0 3px 10px rgba(184,138,61,.45)';
btn.innerHTML = BELL_SVG + '<span class="kamar-notif-badge" style="display:none;position:absolute;top:-4px;right:-4px;min-width:17px;height:17px;padding:0 4px;border-radius:999px;background:linear-gradient(135deg,#ff8a8a,#e24b4b);color:#fff;font-size:10px;font-weight:1000;line-height:17px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.35)"></span>';

var panel = document.createElement('div');
panel.id = 'kamarNotifPanel29F';
panel.className = 'kamar-notif-panel';
panel.style.cssText = 'display:none;position:absolute;top:52px;right:0;width:360px;max-width:calc(100vw - 24px);max-height:420px;overflow:auto;border:1px solid rgba(238,206,122,.28);border-radius:20px;background:rgba(11,10,8,.98);backdrop-filter:blur(14px);box-shadow:0 20px 60px rgba(0,0,0,.5);z-index:2000;padding:10px';

var wrap = document.createElement('div');
wrap.style.cssText = 'position:relative;display:inline-flex';
wrap.appendChild(btn);
wrap.appendChild(panel);

actions.insertBefore(wrap, actions.firstChild);

btn.addEventListener('click', function(e){
e.stopPropagation();
state.open = !state.open;
panel.style.display = state.open ? 'block' : 'none';
if(state.open) renderPanel();
});
document.addEventListener('click', function(e){
if(state.open && !wrap.contains(e.target)){
state.open = false;
panel.style.display = 'none';
}
});
document.addEventListener('keydown', function(e){
if(e.key === 'Escape' && state.open){ state.open=false; panel.style.display='none'; }
});

state.btn = btn; state.panel = panel; state.badge = btn.querySelector('.kamar-notif-badge');
updateBadge();
}

function updateBadge(){
if(!state.badge) return;
if(state.unread > 0){
state.badge.style.display = 'block';
state.badge.textContent = state.unread > 9 ? '9+' : String(state.unread);
} else {
state.badge.style.display = 'none';
}
}

function renderPanel(){
var panel = state.panel;
if(!panel) return;
var header = '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:6px 8px 12px;border-bottom:1px solid rgba(238,206,122,.14);margin-bottom:8px">'+
'<strong style="color:#fff3d8;font-size:14px;letter-spacing:.02em">Notifikasi</strong>'+
(state.unread>0 ? '<button type="button" id="kamarNotifMarkAll" style="border:0;background:none;color:#e9d79f;font-size:12px;font-weight:900;cursor:pointer;text-decoration:underline">Tandai semua dibaca</button>' : '')+
'</div>';

var body;
if(!state.loaded){
body = '<div style="padding:24px 10px;text-align:center;color:#aaa393;font-size:13px">Memuat...</div>';
} else if(!state.items.length){
body = '<div style="padding:28px 10px;text-align:center;color:#aaa393;font-size:13px">Belum ada notifikasi.</div>';
} else {
body = state.items.map(function(n){
var unread = !n.is_read;
return '<div class="kamar-notif-item" data-id="'+esc(n.id)+'" data-link="'+esc(n.link_url||'')+'" style="cursor:pointer;padding:12px 10px;border-radius:14px;margin-bottom:4px;background:'+(unread?'rgba(244,223,144,.08)':'transparent')+';display:flex;gap:10px;align-items:flex-start">'+
'<span style="flex:none;width:8px;height:8px;border-radius:50%;margin-top:6px;background:'+(unread?'#f4df90':'transparent')+'"></span>'+
'<div style="flex:1;min-width:0">'+
'<strong style="display:block;color:#fff3d8;font-size:13.5px;margin-bottom:2px">'+esc(n.title)+'</strong>'+
'<span style="display:block;color:#cfc5ad;font-size:12.5px;line-height:1.5">'+esc(n.message)+'</span>'+
'<span style="display:block;color:#aaa393;font-size:11px;margin-top:5px;text-transform:uppercase;letter-spacing:.06em">'+relTime(n.created_at)+'</span>'+
'</div>'+
'</div>';
}).join('');
}

panel.innerHTML = header + '<div id="kamarNotifList">'+body+'</div>';

var markAll = document.getElementById('kamarNotifMarkAll');
if(markAll) markAll.addEventListener('click', markAllRead);

panel.querySelectorAll('.kamar-notif-item').forEach(function(el){
el.addEventListener('click', function(){
var id = el.getAttribute('data-id');
var link = el.getAttribute('data-link');
markRead(id);
if(link) window.location.href = link;
});
});
}

async function markRead(id){
var item = state.items.find(function(n){ return n.id === id; });
if(!item || item.is_read) return;
item.is_read = true;
state.unread = Math.max(0, state.unread - 1);
updateBadge();
renderPanel();
try{
await state.client.from('member_notifications').update({ is_read:true, read_at:new Date().toISOString() }).eq('id', id);
}catch(e){}
}

async function markAllRead(){
var unreadItems = state.items.filter(function(n){ return !n.is_read; });
if(!unreadItems.length) return;
unreadItems.forEach(function(n){ n.is_read = true; });
state.unread = 0;
updateBadge();
renderPanel();
try{
await state.client.from('member_notifications').update({ is_read:true, read_at:new Date().toISOString() }).eq('is_read', false);
}catch(e){}
}

async function loadNotifications(){
try{
var res = await state.client.from('member_notifications')
.select('id,title,message,is_read,link_url,category,created_at')
.order('created_at', { ascending:false })
.limit(20);
if(res.error) throw res.error;
state.items = res.data || [];
state.unread = state.items.filter(function(n){ return !n.is_read; }).length;
state.loaded = true;
updateBadge();
if(state.open) renderPanel();
}catch(e){ state.loaded = true; }
}

function prependNotification(row){
state.items.unshift(row);
if(state.items.length > 20) state.items.length = 20;
if(!row.is_read) state.unread++;
updateBadge();
if(state.open) renderPanel();
try{
var chime = new Audio('/assets/sounds/kamar-notif-A-chime.mp3');
chime.volume = 0.5;
chime.play().catch(function(){});
}catch(e){}
}

function subscribeRealtime(profileId){
try{
state.client.channel('kamar-notif-bell-'+profileId)
.on('postgres_changes', { event:'INSERT', schema:'public', table:'member_notifications', filter:'profile_id=eq.'+profileId }, function(payload){
prependNotification(payload.new);
})
.subscribe();
}catch(e){}
}

async function init(){
var client = window.kamarSupabaseClient || (window.KamarSupabase && await window.KamarSupabase.ready());
if(!client) return;
state.client = client;

var session = null;
try{ var s = await client.auth.getSession(); session = s && s.data && s.data.session; }catch(e){}
if(!session) return;

buildUI();
if(!state.btn) { await waitFor(function(){ buildUI(); return state.btn; }, 4000); }
if(!state.btn) return;

await loadNotifications();

try{
var prof = await client.from('member_profiles').select('id').eq('user_id', session.user.id).limit(1).maybeSingle();
if(prof && prof.data && prof.data.id){ state.profileId = prof.data.id; subscribeRealtime(prof.data.id); }
}catch(e){}
}

if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
