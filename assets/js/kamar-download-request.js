(function(){
  'use strict';
  if(window.__KAMAR_DOWNLOAD_REQUEST__) return;
  window.__KAMAR_DOWNLOAD_REQUEST__ = true;

 function esc(v){return String(v==null?'':v).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}

 async function client(){
   try{ if(window.KAMAR_CONFIG_READY) await window.KAMAR_CONFIG_READY; }catch(e){}
   try{ if(window.KamarSupabase && window.KamarSupabase.ready){ var c=await window.KamarSupabase.ready(); if(c) return c; } }catch(e){}
   return window.kamarSupabaseClient || null;
 }

 var toastEl = null;
  function toast(msg, kind){
    if(toastEl){ toastEl.remove(); toastEl = null; }
    var t = document.createElement('div');
    var bg = kind==='error' ? '#3a1414' : (kind==='ok' ? '#173a22' : '#0c0c0a');
    var border = kind==='error' ? 'rgba(255,120,120,.4)' : (kind==='ok' ? 'rgba(158,255,202,.35)' : 'rgba(238,206,122,.28)');
    var color = kind==='error' ? '#ffb4b4' : (kind==='ok' ? '#9effca' : '#f5f0e6');
    t.style.cssText = 'position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:9999;max-width:92vw;background:'+bg+';border:1px solid '+border+';color:'+color+';padding:12px 18px;border-radius:14px;font-size:13px;font-weight:700;box-shadow:0 12px 30px rgba(0,0,0,.4)';
    t.textContent = msg;
    document.body.appendChild(t);
    toastEl = t;
    setTimeout(function(){ if(toastEl===t){ t.remove(); toastEl=null; } }, 4200);
  }

 async function requestDownload(btn){
   var facilityKey = btn.getAttribute('data-facility-key') || '';
   var fileId = btn.getAttribute('data-file-id') || '';
   if(!fileId || !facilityKey) return;
   var oldText = btn.textContent;
   btn.disabled = true; btn.textContent = 'Mengirim...';
   try{
     var c = await client();
     if(!c){ toast('Koneksi belum siap, coba lagi.', 'error'); btn.disabled=false; btn.textContent=oldText; return; }
     var res = await c.rpc('request_file_download', { p_facility_key: facilityKey, p_file_id: fileId });
     if(res.error){ toast(res.error.message || 'Gagal mengirim request download.', 'error'); btn.disabled=false; btn.textContent=oldText; return; }
     var data = res.data || {};
     if(!data.success){ toast(data.message || 'Gagal mengirim request download.', 'error'); btn.disabled=false; btn.textContent=oldText; if(!data.already_pending && !data.already_approved) return; }
     else{ toast(data.message || 'Permintaan download terkirim. Menunggu persetujuan admin.', 'ok'); }
     setTimeout(function(){ location.reload(); }, 1200);
   }catch(e){
     toast('Gagal mengirim request: ' + (e.message||String(e)), 'error');
     btn.disabled = false; btn.textContent = oldText;
   }
 }

 async function claimDownload(btn){
   var requestId = btn.getAttribute('data-request-id') || '';
   if(!requestId){ toast('Request download tidak ditemukan. Muat ulang halaman.', 'error'); return; }
   var oldText = btn.textContent;
   btn.disabled = true; btn.textContent = 'Memproses...';
   try{
     var c = await client();
     if(!c){ toast('Koneksi belum siap, coba lagi.', 'error'); btn.disabled=false; btn.textContent=oldText; return; }
     var res = await c.functions.invoke('claim-download', { body: { request_id: requestId } });
     var data = res.data || {};
     if(res.error || !data.ok){
       var msg = (data && data.message) || (res.error && res.error.message) || 'Gagal memproses download.';
       toast(msg, 'error');
       btn.disabled = false; btn.textContent = oldText;
       if(data && (data.expired || /sudah pernah dipakai/i.test(msg))) setTimeout(function(){ location.reload(); }, 1500);
       return;
     }
     toast('Berhasil. File sedang diunduh...', 'ok');
     window.open(data.url, '_blank', 'noopener');
     setTimeout(function(){ location.reload(); }, 1200);
   }catch(e){
     toast('Gagal memproses download: ' + (e.message||String(e)), 'error');
     btn.disabled = false; btn.textContent = oldText;
   }
 }

 document.addEventListener('click', function(e){
   var reqBtn = e.target && e.target.closest && e.target.closest('[data-request-download]');
   if(reqBtn && !reqBtn.disabled){ e.preventDefault(); requestDownload(reqBtn); return; }
   var dlBtn = e.target && e.target.closest && e.target.closest('[data-claim-download]');
   if(dlBtn && !dlBtn.disabled){ e.preventDefault(); claimDownload(dlBtn); return; }
 });
})();
