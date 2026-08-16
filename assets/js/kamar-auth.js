(function(){
  'use strict';
  if(window.__KAMAR_AUTH_29F__) return;
  window.__KAMAR_AUTH_29F__ = true;
  var VERSION = '29F';
  var ADMIN_EMAILS = ['kamarkajianmarket@gmail.com'];

  function qs(s,r){ return (r||document).querySelector(s); }
  function norm(v){ return String(v||'').trim().toLowerCase(); }
  function pick(o,ks){ o=o||{}; for(var i=0;i<ks.length;i++){ var k=ks[i]; if(o[k]!=null && String(o[k]).trim()!=='') return o[k]; } return ''; }
  function val(form,n){
    var e = form.elements[n] || document.getElementById(n);
    if(!e && n==='email') e = qs('input[type="email"]',form);
    if(!e && n==='password') e = qs('input[type="password"]',form);
    if(!e && n==='confirm') e = form.elements.password_confirm || document.getElementById('registerPasswordConfirm');
    if(!e && n==='full_name') e = form.elements.name || document.getElementById('registerFullName');
    if(!e && n==='telegram') e = form.elements.telegram_username || document.getElementById('registerTelegram');
    return e ? String(e.value||'').trim() : '';
  }
  function status(form,msg,ok){
    var e = qs('.auth-status',form) || qs('.form-note',form) || document.getElementById('loginStatus') || document.getElementById('registerStatus') || document.getElementById('affiliateStatus');
    if(!e) return;
    e.hidden = false;
    e.className = (e.className||'').replace(/\b(ok|err|success|error)\b/g,'').trim() + ' ' + (ok?'success ok':'error err');
    e.textContent = msg;
  }
  function processing(form,msg,on){
    var e = qs('[data-processing-line]',form);
    if(e){ e.hidden = !on; e.textContent = msg || 'Memproses...'; }
    var b = form.querySelector('button[type="submit"]');
    if(b){
      b.disabled = !!on;
      b.dataset.oldText = b.dataset.oldText || b.textContent;
      b.textContent = on ? (msg || 'Memproses...') : b.dataset.oldText;
    }
  }
  function timeout(p,ms){
    return Promise.race([
      Promise.resolve(p),
      new Promise(function(_,rej){ setTimeout(function(){ rej(new Error('Waktu koneksi habis. Coba ulang atau cek koneksi internet kamu.')); }, ms||15000); })
    ]);
  }
  // GENERALIZED (2026-07-30): removed backend/provider names from every
  // user-facing message in this file. These are shown directly in the
  // .auth-status box on register/login forms, so they must never mention
  // internal infrastructure.
  function configError(){ return 'Sistem belum siap. Coba muat ulang halaman ini, atau hubungi admin jika masih bermasalah.'; }
  function cfg(){
    var c = window.KAMAR_CONFIG || window.KamarConfig || window.kamarConfig || window.kamarConfigPublic || {};
    return {
      url: c.supabaseUrl || c.SUPABASE_URL || c.url || window.KAMAR_SUPABASE_URL || window.SUPABASE_URL || '',
      key: c.supabaseAnonKey || c.SUPABASE_ANON_KEY || c.anonKey || c.key || window.KAMAR_SUPABASE_ANON_KEY || window.SUPABASE_ANON_KEY || ''
    };
  }
  async function ensureReady(){
    try{ if(window.KAMAR_CONFIG_READY) await window.KAMAR_CONFIG_READY; }catch(e){}
    try{ if(window.KamarSupabase && window.KamarSupabase.ready) await window.KamarSupabase.ready(); }catch(e){}
    return cfg();
  }
  function client(){
    if(window.kamarSupabaseClient) return window.kamarSupabaseClient;
    if(window.KamarSupabase && window.KamarSupabase.getClient){ var x = window.KamarSupabase.getClient(); if(x) return x; }
    var c = cfg();
    if(window.supabase && window.supabase.createClient && c.url && c.key){
      window.kamarSupabaseClient = window.supabase.createClient(c.url,c.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
      return window.kamarSupabaseClient;
    }
    return null;
  }
  function isOfficialAdmin(email,meta){
    email = norm(email);
    if(ADMIN_EMAILS.indexOf(email)>=0) return true;
    var text = norm([meta&&meta.role, meta&&meta.user_role, meta&&meta.account_role, meta&&meta.type, meta&&meta.level, meta&&meta.status, meta&&meta.full_name, meta&&meta.name].join(' '));
    return /admin|owner|superadmin|internal|staff|team/.test(text);
  }
  function sessionFromAuthUser(user,role,extra){
    extra = extra || {};
    var meta = Object.assign({}, user && user.user_metadata || {}, user && user.app_metadata || {}, extra || {});
    var email = String(user && user.email || meta.email || '').trim().toLowerCase();
    var name = pick(meta,['full_name','fullName','name','nama','display_name','member_name','affiliate_name']) || email || 'Kamar User';
    return Object.assign({}, meta, {
      id: user && user.id || meta.id || meta.user_id || email,
      user_id: user && user.id || meta.user_id || meta.id || '',
      email: email,
      fullName: name,
      full_name: name,
      role: role,
      loginAt: new Date().toISOString(),
      lastActivity: Date.now(),
      source: 'supabase_auth_29F'
    });
  }
  function saveRole(role,s){
    if(role==='admin'){
      localStorage.setItem('kamarAdminSession',JSON.stringify(s));
      localStorage.setItem('KAMAR_ADMIN_SESSION',JSON.stringify(s));
      localStorage.setItem('kamarCurrentAdmin',JSON.stringify(s));
      localStorage.removeItem('kamarMemberSession');
    }
    if(role==='member'){
      localStorage.setItem('kamarMemberSession',JSON.stringify(s));
      localStorage.setItem('KAMAR_MEMBER_SESSION',JSON.stringify(s));
      localStorage.setItem('kamarCurrentMember',JSON.stringify(s));
    }
    if(role==='affiliate'){
      localStorage.setItem('kamarAffiliateSession',JSON.stringify(s));
      localStorage.setItem('KAMAR_AFFILIATE_SESSION',JSON.stringify(s));
      localStorage.setItem('kamarCurrentAffiliate',JSON.stringify(s));
    }
    localStorage.setItem('kamarCurrentUser',JSON.stringify(s));
  }
  async function tryProfile(email){
    var c = client();
    if(!c) return {};
    var tables = ['member_profiles','member_access','admin_member_overview','member_dashboard_overview','affiliates'];
    for(var i=0;i<tables.length;i++){
      try{
        var r = await timeout(c.from(tables[i]).select('*').or('email.eq.'+email+',member_email.eq.'+email+',user_email.eq.'+email).limit(1),6000);
        if(!r.error && r.data && r.data[0]) return Object.assign({__profileTable:tables[i]}, r.data[0]);
      }catch(e){}
    }
    return {};
  }
  async function findApprovedAffiliate(c,rawCode){
    var code = String(rawCode||'').trim().toUpperCase();
    if(!code || !c) return null;
    try{
      var r = await timeout(c.from('affiliate_public_codes').select('id,affiliate_code,full_name').eq('affiliate_code',code).maybeSingle(),8000);
      if(!r.error && r.data) return r.data;
    }catch(e){}
    return null;
  }
  function authMessage(err){
    var m = String(err && (err.message || err.error_description) || err || 'Login gagal.');
    if(/invalid login credentials/i.test(m)) return 'Login gagal. Email atau password tidak cocok.';
    if(/email not confirmed/i.test(m)) return 'Login gagal. Email akun belum dikonfirmasi. Silakan cek email kamu.';
    if(/fetch|network|failed to fetch/i.test(m)) return 'Gagal terhubung ke server. Cek koneksi internet kamu lalu coba lagi.';
    if(/already registered|already exists|user already/i.test(m)) return 'Email ini sudah terdaftar. Silakan login menggunakan email tersebut.';
    if(/rate limit/i.test(m)) return 'Terlalu banyak percobaan dalam waktu singkat. Coba lagi dalam beberapa menit.';
    var pw = m.match(/password should be at least (\d+)/i);
    if(pw) return 'Password minimal '+pw[1]+' karakter.';
    if(/is invalid$/i.test(m) && /email/i.test(m)) return 'Format email tidak valid. Coba pakai alamat email lain.';
    return m;
  }
  async function doLogin(form,requestedRole,opts){
    opts = opts || {};
    var email = (val(form,'email') || val(form,'loginEmail')).toLowerCase();
    var password = val(form,'password') || val(form,'loginPassword');
    if(!email || !password){ status(form,'Email dan password wajib diisi.',false); return; }
    processing(form,'Memproses login...',true);
    status(form,'Memeriksa akun...',true);
    try{
      await ensureReady();
      var c = client();
      var cc = cfg();
      if(!c || !cc.url || !cc.key) throw new Error(configError());

      var res = await timeout(c.auth.signInWithPassword({email:email,password:password}),15000);
      if(res.error) throw res.error;
      if(!res.data || !res.data.user) throw new Error('Login gagal. Silakan coba lagi.');
      try{
        var rememberEl = form.elements['remember'];
        var rememberKey = 'kamarRememberedEmail_' + (form.id || 'default');
        if(rememberEl && rememberEl.checked){ localStorage.setItem(rememberKey, email); }
        else { localStorage.removeItem(rememberKey); }
      }catch(e){}

      var user = res.data.user;
      var baseMeta = Object.assign({}, user.user_metadata||{}, user.app_metadata||{});
      var profile = await tryProfile(email);
      var admin = isOfficialAdmin(email, Object.assign({}, baseMeta, profile));

      var finalRole = requestedRole;
      if(admin) finalRole = 'admin';
      if(requestedRole==='admin' && !admin) throw new Error('Akun ini berhasil login, tapi tidak terdaftar sebagai admin. Gunakan akun admin resmi.');
      if(requestedRole==='affiliate' && !admin){ finalRole = 'affiliate'; }
      if(requestedRole==='member' && !admin){ finalRole = 'member'; }

      // FITUR 2026-08-17: verifikasi kode email wajib untuk SEMUA akun (termasuk admin
      // resmi), kecuali akun internal @akun.kamar (tidak punya inbox asli) - lihat
      // startOtpFlow(). Mencegah login lanjut hanya bermodal email+password yang
      // bocor/dicuri, karena tetap butuh akses inbox email terdaftar. Hanya berlaku
      // saat login BARU (bukan sesi yang sudah tersimpan).
      if(opts.otpGate && !/@akun\.kamar$/i.test(email)){
        try{ await c.auth.signOut(); }catch(e){}
        var otpRes = await c.auth.signInWithOtp({ email: email, options:{ shouldCreateUser:false } });
        if(otpRes.error) throw otpRes.error;
        startOtpFlow(form, email, finalRole, profile);
        return;
      }

      var s = sessionFromAuthUser(user,finalRole,profile);
      saveRole(finalRole,s);
      status(form,'Login berhasil. Membuka dashboard...',true);
      setTimeout(function(){
        location.href = finalRole==='admin' ? 'admin.html?v='+VERSION : finalRole==='affiliate' ? 'affiliate-dashboard.html?v='+VERSION : 'dashboard.html?v='+VERSION;
      },300);
    }catch(e){
      status(form,authMessage(e),false);
    }finally{
      processing(form,'',false);
    }
  }

  function finishLoginRedirect(finalRole,user,profile){
    var s = sessionFromAuthUser(user,finalRole,profile);
    saveRole(finalRole,s);
    setTimeout(function(){
      location.href = finalRole==='admin' ? 'admin.html?v='+VERSION : finalRole==='affiliate' ? 'affiliate-dashboard.html?v='+VERSION : 'dashboard.html?v='+VERSION;
    },300);
  }

  function startOtpFlow(loginForm, email, finalRole, profile){
    var otpForm = document.getElementById('memberOtpForm');
    if(!otpForm){ status(loginForm,'Kode verifikasi dikirim, tapi form kode tidak ditemukan di halaman ini.',false); loginForm.hidden=false; return; }
    loginForm.hidden = true;
    otpForm.hidden = false;
    otpForm.dataset.otpEmail = email;
    otpForm.dataset.otpRole = finalRole;
    otpForm.dataset.otpProfile = JSON.stringify(profile||{});
    var emailLabel = document.getElementById('memberOtpEmailLabel');
    if(emailLabel) emailLabel.textContent = email;
    status(otpForm,'Kode verifikasi telah dikirim ke email kamu.',true);
    var codeInput = document.getElementById('memberOtpInput');
    if(codeInput){ codeInput.value=''; codeInput.focus(); }

    if(otpForm.__kamarOtpBound29E) return;
    otpForm.__kamarOtpBound29E = true;

    otpForm.addEventListener('submit', async function(e){
      e.preventDefault();
      var code = (codeInput && codeInput.value || '').trim();
      if(!code){ status(otpForm,'Masukkan kode verifikasi.',false); return; }
      processing(otpForm,'Memverifikasi...',true);
      try{
        await ensureReady();
        var c2 = client();
        var res2 = await timeout(c2.auth.verifyOtp({ email: otpForm.dataset.otpEmail, token: code, type:'email' }),15000);
        if(res2.error) throw res2.error;
        if(!res2.data || !res2.data.user) throw new Error('Verifikasi gagal. Coba lagi.');
        status(otpForm,'Verifikasi berhasil. Membuka dashboard...',true);
        finishLoginRedirect(otpForm.dataset.otpRole, res2.data.user, JSON.parse(otpForm.dataset.otpProfile||'{}'));
      }catch(err){
        status(otpForm, authMessage(err), false);
      }finally{
        processing(otpForm,'',false);
      }
    });

    var resendBtn = document.getElementById('memberOtpResendBtn');
    if(resendBtn && !resendBtn.__kamarOtpResendBound29E){
      resendBtn.__kamarOtpResendBound29E = true;
      resendBtn.addEventListener('click', async function(e){
        e.preventDefault();
        if(resendBtn.dataset.cooling==='1') return;
        try{
          await ensureReady();
          var c3 = client();
          var r2 = await c3.auth.signInWithOtp({ email: otpForm.dataset.otpEmail, options:{ shouldCreateUser:false } });
          if(r2.error) throw r2.error;
          status(otpForm,'Kode baru telah dikirim.',true);
        }catch(err){
          status(otpForm, authMessage(err), false);
        }
        resendBtn.dataset.cooling = '1';
        var oldText = resendBtn.textContent;
        var left = 30;
        resendBtn.textContent = 'Kirim Ulang (' + left + 's)';
        var iv = setInterval(function(){
          left -= 1;
          if(left <= 0){
            clearInterval(iv);
            resendBtn.dataset.cooling = '0';
            resendBtn.textContent = oldText;
          } else {
            resendBtn.textContent = 'Kirim Ulang (' + left + 's)';
          }
        },1000);
      });
    }

    var backBtn = document.getElementById('memberOtpBackBtn');
    if(backBtn && !backBtn.__kamarOtpBackBound29E){
      backBtn.__kamarOtpBackBound29E = true;
      backBtn.addEventListener('click', function(e){
        e.preventDefault();
        otpForm.hidden = true;
        loginForm.hidden = false;
        otpForm.reset();
      });
    }
  }

  async function registerMember(form){
    var email = (val(form,'email') || val(form,'registerEmail')).toLowerCase();
    var password = val(form,'password') || val(form,'registerPassword');
    var confirm = val(form,'confirm') || val(form,'password_confirm') || val(form,'registerPasswordConfirm');
    if(!email || !password){ status(form,'Email dan password wajib diisi.',false); return; }
    if(confirm && password !== confirm){ status(form,'Konfirmasi password tidak sama.',false); return; }
    var referralInput = val(form,'referral') || val(form,'registerReferral');
    processing(form,'Mendaftarkan akun...',true);
    try{
      await ensureReady();
      var c = client(); if(!c) throw new Error(configError());
      var fullName = val(form,'full_name') || val(form,'registerFullName') || val(form,'name') || email;

      // Optional referral code: validated against the public approved-affiliate
      // view BEFORE creating the account, so a bad code fails fast instead of
      // creating an orphaned account with no referral attached.
      var affiliate = null;
      if(referralInput){
        status(form,'Memeriksa kode referral...',true);
        affiliate = await findApprovedAffiliate(c, referralInput);
        if(!affiliate){
          status(form,'Kode referral tidak ditemukan atau belum aktif. Kosongkan kolom ini jika kamu tidak punya kode referral, lalu coba lagi.',false);
          return;
        }
      }

      status(form,'Mendaftarkan akun...',true);
      var whatsapp = val(form,'whatsapp')||val(form,'registerWhatsapp');
      var telegram = val(form,'telegram')||val(form,'registerTelegram');

      // FIXED (2026-07-30): member_profiles (plus member_access and an
      // admin_todos entry) is already created automatically by a database
      // trigger the instant the auth user is created below (on_auth_user_created
      // -> handle_new_auth_user). That trigger reads full_name / whatsapp /
      // telegram_username / referral_code directly out of THIS signUp() call's
      // metadata -- it does not read a separate insert from this file. An
      // earlier version of this function tried to insert into member_profiles
      // itself right after signUp(), which always failed silently (the row
      // already existed, created by the trigger a moment earlier) and was why
      // whatsapp/telegram never actually got saved even though the request body
      // clearly had them. Do not add a manual member_profiles insert here again
      // -- pass the data through signUp's metadata instead and let the trigger
      // do the rest.
      var r = await timeout(c.auth.signUp({
        email:email,
        password:password,
        options:{data:{
          full_name:fullName,
          role:'member',
          whatsapp:whatsapp,
          telegram_username:telegram,
          referral_code: affiliate ? affiliate.affiliate_code : ''
        }}
      }),15000);
      if(r.error) throw r.error;

      // If a valid referral code was used, also log it against the affiliate so
      // it shows up for approval/commission tracking on their side. (The trigger
      // above only stores the code on member_profiles; it doesn't touch
      // affiliate_referrals.)
      if(affiliate){
        try{
          var newUserId = r.data && r.data.user && r.data.user.id;
          var prof = newUserId ? await c.from('member_profiles').select('id').eq('user_id', newUserId).maybeSingle() : null;
          await c.from('affiliate_referrals').insert({
            affiliate_id: affiliate.id,
            affiliate_code: affiliate.affiliate_code,
            member_profile_id: (prof && prof.data) ? prof.data.id : null,
            member_name: fullName,
            member_email: email,
            member_phone: whatsapp,
            facility_key: '',
            referral_status: 'PENDING',
            registration_source: 'register.html',
            notes: 'Referral tercatat otomatis saat pendaftaran member.'
          });
        }catch(e){}
      }

      status(form, affiliate
        ? ('Pendaftaran berhasil dengan kode referral dari '+affiliate.full_name+'. Jika email konfirmasi aktif, cek email kamu. Jika tidak, silakan login.')
        : 'Pendaftaran berhasil. Jika email konfirmasi aktif, cek email kamu. Jika tidak, silakan login.', true);
      form.reset();
    }catch(e){ status(form,'Gagal daftar: '+authMessage(e),false); }
    finally{ processing(form,'',false); }
  }
  async function registerAffiliate(form){
    var email = val(form,'email').toLowerCase();
    var password = val(form,'password');
    var confirm = val(form,'confirm') || val(form,'password_confirm');
    if(confirm && password !== confirm){ status(form,'Konfirmasi password tidak sama.',false); return; }
    processing(form,'Mendaftarkan affiliate...',true);
    try{
      await ensureReady();
      var c = client(); if(!c) throw new Error(configError());
      var fullName = val(form,'full_name') || email;
      var r = await timeout(c.auth.signUp({email:email,password:password,options:{data:{full_name:fullName,role:'affiliate'}}}),15000);
      if(r.error) throw r.error;
      try{ await c.from('affiliates').insert({email:email,full_name:fullName,whatsapp:val(form,'whatsapp'),telegram:val(form,'telegram'),approval_status:'PENDING',created_at:new Date().toISOString()}); }catch(e){}
      status(form,'Pendaftaran affiliate berhasil. Tunggu approval admin bila diperlukan.',true);
      form.reset();
    }catch(e){ status(form,'Gagal daftar affiliate: '+authMessage(e),false); }
    finally{ processing(form,'',false); }
  }
  function bind(id,fn){
    var f = document.getElementById(id);
    if(!f || f.__kamarBound29E) return;
    f.__kamarBound29E = true;
    f.addEventListener('submit',function(e){ e.preventDefault(); if(e.stopImmediatePropagation) e.stopImmediatePropagation(); else e.stopPropagation(); fn(f); },true);
  }
  function restoreRememberedEmails(){
    var ids = ['adminLoginForm','memberLoginForm','kamarLoginForm','affiliateLoginForm'];
    ids.forEach(function(id){
      var f = document.getElementById(id);
      if(!f) return;
      try{
        var key = 'kamarRememberedEmail_' + id;
        var saved = localStorage.getItem(key);
        var emailEl = f.elements['email'] || qs('input[type="email"]', f);
        if(saved && emailEl && !emailEl.value) emailEl.value = saved;
      }catch(e){}
    });
  }

  async function requestPasswordReset(form){
    var email = (val(form,'email') || val(form,'loginEmail')).toLowerCase();
    if(!email){ status(form,'Masukkan email akun yang terdaftar.',false); return; }
    processing(form,'Mengirim link reset...',true);
    try{
      await ensureReady();
      var c = client();
      var cc = cfg();
      if(!c || !cc.url || !cc.key) throw new Error(configError());
      var redirectTo = window.location.origin + '/reset-password.html';
      var res = await timeout(c.auth.resetPasswordForEmail(email, { redirectTo: redirectTo }), 15000);
      if(res.error) throw res.error;
      status(form,'Jika email tersebut terdaftar, link reset password sudah dikirim. Silakan cek inbox atau folder spam.',true);
      form.reset();
    }catch(e){
      status(form,authMessage(e),false);
    }finally{
      processing(form,'',false);
    }
  }

  async function updatePasswordFromRecovery(form){
    var pwEl = form.elements['password'];
    var cfEl = form.elements['password_confirm'];
    var password = pwEl ? pwEl.value : '';
    var confirm = cfEl ? cfEl.value : '';
    if(!password || password.length < 6){ status(form,'Password minimal 6 karakter.',false); return; }
    if(password !== confirm){ status(form,'Konfirmasi password tidak sama.',false); return; }
    processing(form,'Menyimpan password baru...',true);
    try{
      await ensureReady();
      var c = client();
      if(!c) throw new Error(configError());
      var res = await timeout(c.auth.updateUser({ password: password }), 15000);
      if(res.error) throw res.error;
      status(form,'Password berhasil diperbarui. Mengarahkan ke halaman login...',true);
      try{ await c.auth.signOut(); }catch(e){}
      setTimeout(function(){ location.href = 'member.html'; },1500);
    }catch(e){
      status(form,authMessage(e),false);
    }finally{
      processing(form,'',false);
    }
  }

  function initPasswordRecoveryGuard(form){
    var submitBtn = form.querySelector('button[type="submit"]');
    if(submitBtn) submitBtn.disabled = true;
    status(form,'Memeriksa link reset...',true);
    var resolved = false;
    function markReady(session){
      if(resolved) return;
      resolved = true;
      if(session){
        if(submitBtn) submitBtn.disabled = false;
        status(form,'Silakan masukkan password baru kamu.',true);
      } else {
        status(form,'Link reset tidak valid atau sudah kedaluwarsa. Silakan minta link baru dari halaman Lupa Password.',false);
      }
    }
    ensureReady().then(function(){
      var c = client();
      if(!c){ markReady(null); return; }
      try{
        c.auth.onAuthStateChange(function(event,session){
          if(event === 'PASSWORD_RECOVERY') markReady(session);
        });
      }catch(e){}
      var start = Date.now();
      (function poll(){
        if(resolved) return;
        c.auth.getSession().then(function(res){
          if(resolved) return;
          var session = res && res.data && res.data.session;
          if(session){ markReady(session); return; }
          if(Date.now() - start > 4000){ markReady(null); return; }
          setTimeout(poll, 300);
        }).catch(function(){
          if(Date.now() - start > 4000) markReady(null);
          else setTimeout(poll, 300);
        });
      })();
    }).catch(function(){ markReady(null); });
  }

  function run(){
    restoreRememberedEmails();
    bind('adminLoginForm',function(f){ doLogin(f,'admin'); });
    bind('memberLoginForm',function(f){ doLogin(f,'member',{otpGate:true}); });
    bind('kamarLoginForm',function(f){ doLogin(f,'member'); });
    bind('affiliateLoginForm',function(f){ doLogin(f,'affiliate'); });
    bind('memberRegisterForm',registerMember);
    bind('kamarRegisterForm',registerMember);
    bind('affiliateRegisterForm',registerAffiliate);
    bind('forgotPasswordForm', requestPasswordReset);
    bind('resetPasswordForm', updatePasswordFromRecovery);
    (function(){ var rf = document.getElementById('resetPasswordForm'); if(rf) initPasswordRecoveryGuard(rf); })();
    // FIXED (2026-07-29): intentionally NOT binding 'kamarAffiliateForm' here.
    // affiliate.html has its own dedicated submit handler for that exact form id,
    // which correctly writes the full application (payout account, approval_status,
    // etc.) into the "affiliates" table. This generic handler instead called
    // supabase.auth.signUp() expecting a password field that doesn't exist on that
    // form, so both handlers were firing on every submit and this one always failed,
    // showing a confusing "Gagal daftar affiliate" error even when the real
    // registration (from the other handler) had actually succeeded.
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run); else run();
  window.KamarAuthFinal29F = {login:doLogin,client:client,config:cfg,ready:ensureReady};
})();
