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
      new Promise(function(_,rej){ setTimeout(function(){ rej(new Error('Timeout koneksi Supabase. Coba ulang atau cek koneksi.')); }, ms||15000); })
    ]);
  }
  function configError(){ return 'Database Supabase belum terkoneksi. Cek KAMAR_SUPABASE_URL dan KAMAR_SUPABASE_ANON_KEY di Vercel, lalu Redeploy tanpa cache.'; }
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
  function authMessage(err){
    var m = String(err && (err.message || err.error_description) || err || 'Login gagal.');
    if(/invalid login credentials/i.test(m)) return 'Login gagal. Email atau password Supabase Auth tidak cocok.';
    if(/email not confirmed/i.test(m)) return 'Login gagal. Email akun Supabase belum dikonfirmasi.';
    if(/fetch|network|failed to fetch/i.test(m)) return 'Login gagal. Koneksi ke Supabase bermasalah atau domain belum diizinkan.';
    return m;
  }
  async function doLogin(form,requestedRole){
    var email = (val(form,'email') || val(form,'loginEmail')).toLowerCase();
    var password = val(form,'password') || val(form,'loginPassword');
    if(!email || !password){ status(form,'Email dan password wajib diisi.',false); return; }
    processing(form,'Login...',true);
    status(form,'Mengecek Supabase Auth...',true);
    try{
      await ensureReady();
      var c = client();
      var cc = cfg();
      if(!c || !cc.url || !cc.key) throw new Error(configError());

      var res = await timeout(c.auth.signInWithPassword({email:email,password:password}),15000);
      if(res.error) throw res.error;
      if(!res.data || !res.data.user) throw new Error('Login gagal. Supabase Auth tidak mengembalikan user.');

      var user = res.data.user;
      var baseMeta = Object.assign({}, user.user_metadata||{}, user.app_metadata||{});
      var profile = await tryProfile(email);
      var admin = isOfficialAdmin(email, Object.assign({}, baseMeta, profile));

      var finalRole = requestedRole;
      if(admin) finalRole = 'admin';
      if(requestedRole==='admin' && !admin) throw new Error('Akun ini berhasil login, tapi tidak terdaftar sebagai admin. Gunakan akun admin resmi.');
      if(requestedRole==='affiliate' && !admin){ finalRole = 'affiliate'; }
      if(requestedRole==='member' && !admin){ finalRole = 'member'; }

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
  async function registerMember(form){
    var email = (val(form,'email') || val(form,'registerEmail')).toLowerCase();
    var password = val(form,'password') || val(form,'registerPassword');
    var confirm = val(form,'confirm') || val(form,'password_confirm') || val(form,'registerPasswordConfirm');
    if(!email || !password){ status(form,'Email dan password wajib diisi.',false); return; }
    if(confirm && password !== confirm){ status(form,'Konfirmasi password tidak sama.',false); return; }
    processing(form,'Mendaftarkan akun...',true);
    try{
      await ensureReady();
      var c = client(); if(!c) throw new Error(configError());
      var fullName = val(form,'full_name') || val(form,'registerFullName') || val(form,'name') || email;
      var r = await timeout(c.auth.signUp({email:email,password:password,options:{data:{full_name:fullName,role:'member'}}}),15000);
      if(r.error) throw r.error;
      // FIXED (2026-07-30): the previous insert used column names that do not
      // exist on member_profiles ("status" -> real column is "account_status",
      // "telegram" -> real column is "telegram_username"), and never set
      // "user_id" at all. Because this call is wrapped in try/catch, every one
      // of those mistakes failed silently and no profile row was ever created
      // during registration. This also requires a matching Supabase RLS INSERT
      // policy ("Member can self-register profile") so a fresh auth user is
      // allowed to insert exactly one row for themselves.
      try{
        var newUserId = r.data && r.data.user && r.data.user.id;
        await c.from('member_profiles').insert({
          user_id: newUserId,
          email: email,
          full_name: fullName,
          whatsapp: val(form,'whatsapp')||val(form,'registerWhatsapp'),
          telegram_username: val(form,'telegram')||val(form,'registerTelegram'),
          account_status: 'pending_activation',
          created_at: new Date().toISOString()
        });
      }catch(e){}
      status(form,'Pendaftaran berhasil. Jika email confirmation aktif, cek email. Jika tidak, silakan login.',true);
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
  function run(){
    bind('adminLoginForm',function(f){ doLogin(f,'admin'); });
    bind('memberLoginForm',function(f){ doLogin(f,'member'); });
    bind('kamarLoginForm',function(f){ doLogin(f,'member'); });
    bind('affiliateLoginForm',function(f){ doLogin(f,'affiliate'); });
    bind('memberRegisterForm',registerMember);
    bind('kamarRegisterForm',registerMember);
    bind('affiliateRegisterForm',registerAffiliate);
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
