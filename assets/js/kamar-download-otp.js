(function(){
  'use strict';
  if(window.__KAMAR_DOWNLOAD_OTP__) return;
  window.__KAMAR_DOWNLOAD_OTP__ = true;

  function esc(v){return String(v==null?'':v).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}

  async function client(){
    try{ if(window.KAMAR_CONFIG_READY) await window.KAMAR_CONFIG_READY; }catch(e){}
    try{ if(window.KamarSupabase && window.KamarSupabase.ready){ var c=await window.KamarSupabase.ready(); if(c) return c; } }catch(e){}
    return window.kamarSupabaseClient || null;
  }

  var modalEl = null;
  function closeModal(){
    if(modalEl){ modalEl.remove(); modalEl = null; }
  }

  function buildModal(title){
    closeModal();
    var wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.6);padding:20px';
    wrap.innerHTML =
      '<div style="width:100%;max-width:420px;border:1px solid rgba(238,206,122,.28);background:#0c0c0a;border-radius:24px;padding:26px;color:#f5f0e6;font-family:inherit">' +
        '<div style="text-transform:uppercase;letter-spacing:.14em;font-size:12px;color:#f4df90;font-weight:1000;margin-bottom:6px">Verifikasi OTP</div>' +
        '<h3 style="margin:0 0 14px;font-size:19px;color:#fff3d8">' + esc(title || 'Download File') + '</h3>' +
        '<div id="kamarOtpBody"></div>' +
        '<button type="button" id="kamarOtpCloseBtn" style="margin-top:16px;background:rgba(255,255,255,.06);border:1px solid rgba(238,206,122,.18);color:#f3d985;border-radius:999px;padding:10px 16px;font-weight:900;cursor:pointer">Tutup</button>' +
      '</div>';
    document.body.appendChild(wrap);
    modalEl = wrap;
    wrap.addEventListener('click', function(e){ if(e.target === wrap) closeModal(); });
    document.getElementById('kamarOtpCloseBtn').onclick = closeModal;
    return document.getElementById('kamarOtpBody');
  }

  var inputStyle = 'width:100%;box-sizing:border-box;font:inherit;border:1px solid rgba(238,206,122,.28);background:rgba(0,0,0,.32);color:#f5f0e6;border-radius:14px;padding:12px 14px;outline:none;margin:10px 0';
  var btnStyle = 'width:100%;border:0;border-radius:999px;background:linear-gradient(135deg,#f4df90,#c69a39);color:#111;font-weight:1000;padding:12px 16px;cursor:pointer;margin-top:6px';
  var noteStyle = 'color:#aaa393;font-size:13px;line-height:1.5;margin:0 0 6px';
  var errStyle = 'color:#ffb4b4;font-size:13px;margin-top:10px';
  var okStyle = 'color:#9effca;font-size:13px;margin-top:10px';

  async function requestOtp(fileTable, fileId, fileTitle){
    var body = buildModal(fileTitle);
    body.innerHTML =
      '<p style="' + noteStyle + '">File ini memerlukan kode OTP sebelum bisa diunduh. Kode akan dikirim ke email akun Anda dan berlaku 5 menit.</p>' +
      '<button type="button" id="kamarOtpSendBtn" style="' + btnStyle + '">Kirim Kode OTP</button>' +
      '<div id="kamarOtpMsg"></div>';
    document.getElementById('kamarOtpSendBtn').onclick = async function(){
      var msgEl = document.getElementById('kamarOtpMsg');
      var btn = document.getElementById('kamarOtpSendBtn');
      btn.disabled = true; btn.textContent = 'Mengirim...';
      try{
        var c = await client();
        if(!c){ msgEl.innerHTML = '<div style="'+errStyle+'">Koneksi belum siap, coba lagi.</div>'; btn.disabled=false; btn.textContent='Kirim Kode OTP'; return; }
        var res = await c.functions.invoke('request-download-otp', { body: { file_table: fileTable, file_id: fileId } });
        var data = res.data || {};
        if(res.error || !data.ok){
          var msg = (data && data.message) || (res.error && res.error.message) || 'Gagal mengirim kode OTP.';
          msgEl.innerHTML = '<div style="'+errStyle+'">' + esc(msg) + '</div>';
          btn.disabled = false; btn.textContent = 'Kirim Kode OTP';
          return;
        }
        showOtpInput(fileTable, fileId, fileTitle);
      }catch(e){
        msgEl.innerHTML = '<div style="'+errStyle+'">Gagal mengirim kode OTP: ' + esc(e.message||String(e)) + '</div>';
        btn.disabled = false; btn.textContent = 'Kirim Kode OTP';
      }
    };
  }

  function showOtpInput(fileTable, fileId, fileTitle){
    var body = document.getElementById('kamarOtpBody') || buildModal(fileTitle);
    body.innerHTML =
      '<p style="' + noteStyle + '">Kode OTP telah dikirim ke email Anda. Masukkan 6 digit kode di bawah ini (berlaku 5 menit).</p>' +
      '<input id="kamarOtpInput" type="text" inputmode="numeric" maxlength="6" placeholder="123456" style="' + inputStyle + ';text-align:center;font-size:22px;letter-spacing:6px" autofocus />' +
      '<button type="button" id="kamarOtpVerifyBtn" style="' + btnStyle + '">Verifikasi &amp; Download</button>' +
      '<button type="button" id="kamarOtpResendBtn" style="background:none;border:0;color:#d8cda9;font-size:12px;margin-top:10px;cursor:pointer;text-decoration:underline">Kirim ulang kode</button>' +
      '<div id="kamarOtpMsg"></div>';
    document.getElementById('kamarOtpResendBtn').onclick = function(){ requestOtp(fileTable, fileId, fileTitle); };
    document.getElementById('kamarOtpVerifyBtn').onclick = async function(){
      var otpInputEl = document.getElementById('kamarOtpInput');
      var msgEl = document.getElementById('kamarOtpMsg');
      var code = (otpInputEl.value || '').trim();
      if(!/^\d{6}$/.test(code)){ msgEl.innerHTML = '<div style="'+errStyle+'">Masukkan 6 digit kode OTP.</div>'; return; }
      var btn = document.getElementById('kamarOtpVerifyBtn');
      btn.disabled = true; btn.textContent = 'Memverifikasi...';
      try{
        var c = await client();
        var res = await c.functions.invoke('verify-download-otp', { body: { file_table: fileTable, file_id: fileId, otp_code: code } });
        var data = res.data || {};
        if(res.error || !data.ok){
          var msg = (data && data.message) || (res.error && res.error.message) || 'Kode OTP salah atau kedaluwarsa.';
          msgEl.innerHTML = '<div style="'+errStyle+'">' + esc(msg) + '</div>';
          btn.disabled = false; btn.textContent = 'Verifikasi & Download';
          return;
        }
        msgEl.innerHTML = '<div style="'+okStyle+'">Berhasil. File sedang diunduh...</div>';
        window.open(data.url, '_blank', 'noopener');
        setTimeout(closeModal, 1200);
      }catch(e){
        msgEl.innerHTML = '<div style="'+errStyle+'">Gagal verifikasi: ' + esc(e.message||String(e)) + '</div>';
        btn.disabled = false; btn.textContent = 'Verifikasi & Download';
      }
    };
  }

  document.addEventListener('click', function(e){
    var btn = e.target && e.target.closest && e.target.closest('[data-otp-download]');
    if(!btn) return;
    e.preventDefault();
    var fileTable = btn.getAttribute('data-file-table') || 'tools_files';
    var fileId = btn.getAttribute('data-file-id') || '';
    var fileTitle = btn.getAttribute('data-file-title') || 'File';
    if(!fileId) return;
    requestOtp(fileTable, fileId, fileTitle);
  });
})();
