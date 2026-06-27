(function () {
  "use strict";

  const FACILITIES = [
    { key: "access_kamar_study", label: "Kamar Study", page: "member-study.html" },
    { key: "access_materi_edukasi", label: "Materi Edukasi", page: "member-materials.html" },
    { key: "access_kamar_private", label: "Kamar Private", page: "member-private.html" },
    { key: "access_kamar_indikator", label: "Kamar Indikator", page: "member-indicator.html" },
    { key: "access_kamar_robot", label: "Kamar Robot", page: "member-robot.html" }
  ];

  function client() {
    if (!window.kamarSupabase) {
      throw new Error(window.KAMAR_SUPABASE_ERROR || "Supabase client belum siap.");
    }
    return window.kamarSupabase;
  }

  function formatDate(value) {
    if (!value) return "-";
    try {
      return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
    } catch (error) {
      return String(value);
    }
  }

  function isAccessExpired(profile) {
    if (!profile || !profile.access_end_date) return false;
    return new Date(profile.access_end_date).getTime() < Date.now();
  }

  function setStatusBox(profile, access) {
    const box = document.getElementById("memberStatusBox");
    if (!box) return;

    const active = profile && profile.account_status === "active" && profile.payment_status === "confirmed" && !isAccessExpired(profile) && !access.locked_by_expired;
    box.classList.remove("expired-note", "page-note");

    if (active) {
      box.classList.add("page-note");
      box.innerHTML = `<strong>Status Akses: Aktif</strong><br/>Masa akses sampai ${formatDate(profile.access_end_date)}.`;
      return;
    }

    box.classList.add("expired-note");
    if (profile && profile.account_status === "pending_activation") {
      box.innerHTML = `<strong>Status Akses: Menunggu Aktivasi</strong><br/>Akun sudah terdaftar. Akses fasilitas akan aktif setelah konfirmasi admin.`;
      return;
    }

    if (profile && profile.account_status === "suspended") {
      box.innerHTML = `<strong>Status Akses: Ditangguhkan</strong><br/>Hubungi Admin Kamar untuk pengecekan akun.`;
      return;
    }

    if (isAccessExpired(profile) || access.locked_by_expired) {
      box.innerHTML = `<strong>Status Akses: Expired</strong><br/>Masa akses sudah berakhir. Silakan perpanjang atau tambah fasilitas.`;
      return;
    }

    box.innerHTML = `<strong>Status Akses: Belum Aktif</strong><br/>Akses fasilitas belum tersedia. Hubungi Admin Kamar untuk aktivasi.`;
  }

  function updateWelcome(profile) {
    const title = document.getElementById("memberWelcomeTitle");
    const text = document.getElementById("memberWelcomeText");
    const name = profile && profile.full_name ? profile.full_name : "Kawan Kamar";
    if (title) title.textContent = `Selamat datang, ${name}.`;
    if (text) {
      const memberId = profile && profile.member_id ? profile.member_id : "-";
      const endDate = profile && profile.access_end_date ? formatDate(profile.access_end_date) : "menunggu aktivasi";
      text.textContent = `Member ID: ${memberId}. Masa akses: ${endDate}.`;
    }
  }

  function updateSidebar(access, profile) {
    const activeAccount = profile && profile.account_status === "active" && profile.payment_status === "confirmed" && !isAccessExpired(profile) && !access.locked_by_expired;
    const links = Array.from(document.querySelectorAll(".split-sidebar a"));

    FACILITIES.forEach(function (facility) {
      const link = links.find(function (a) { return a.textContent.toLowerCase().includes(facility.label.toLowerCase()); });
      if (!link) return;

      const canAccess = Boolean(access[facility.key]) && activeAccount;
      link.classList.toggle("disabled", !canAccess);
      link.href = canAccess ? facility.page : "member-renewal.html";
      link.textContent = canAccess ? facility.label : facility.label + " 🔒";
    });
  }

  function updateFacilitySummary(access, profile) {
    const card = document.getElementById("memberFacilitySummary");
    if (!card) return;
    const activeAccount = profile && profile.account_status === "active" && profile.payment_status === "confirmed" && !isAccessExpired(profile) && !access.locked_by_expired;
    const activeFacilities = FACILITIES.filter(function (facility) { return Boolean(access[facility.key]) && activeAccount; });

    card.classList.toggle("facility-locked", activeFacilities.length === 0);
    card.classList.toggle("facility-active", activeFacilities.length > 0);

    if (activeFacilities.length === 0) {
      card.innerHTML = `<h3>Fasilitas Belum Aktif</h3><p>Belum ada fasilitas aktif. Ajukan aktivasi atau perpanjangan ke Admin Kamar.</p>`;
      return;
    }

    card.innerHTML = `<h3>Fasilitas Aktif</h3><p>${activeFacilities.map(function (f) { return f.label; }).join(", ")}.</p>`;
  }

  async function getMemberAccess(profileId) {
    const { data, error } = await client()
      .from("member_access")
      .select("access_kamar_study,access_materi_edukasi,access_kamar_private,access_kamar_indikator,access_kamar_robot,locked_by_expired,locked_reason")
      .eq("profile_id", profileId)
      .maybeSingle();

    if (error) throw error;
    return data || {};
  }



  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" }[char];
    });
  }

  function sourcePayload(row) {
    if (!row || !row.source_payload) return {};
    if (typeof row.source_payload === "object") return row.source_payload;
    try { return JSON.parse(row.source_payload); } catch (error) { return {}; }
  }

  function shouldShowMember(row) {
    const p = sourcePayload(row);
    if (p.show_member !== undefined) return Boolean(p.show_member);
    return String(row && row.visibility || "").toLowerCase() === "member";
  }

  function formatPrice(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n.toFixed(2) : "-";
  }

  function formatPoint(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "-";
    return (n > 0 ? "+" : "") + n.toFixed(2) + " Point";
  }

  function pointClass(value) {
    const n = Number(value);
    return Number.isFinite(n) && n < 0 ? "negative" : "positive";
  }

  function studyStatus(row) {
    const st = String(row && row.status || "").toUpperCase();
    if (st === "INVALID" || row.invalidated_at || row.finished_at) return "Invalid";
    if (st === "FRESH" || !row.price_entered_area_at) return "Fresh";
    return "Active";
  }

  function progressLabel(row) {
    const p = sourcePayload(row);
    const label = String(p.progress_label || "").trim();
    if (label) return label;
    const code = String(p.progress_update || "").toLowerCase();
    let m = code.match(/target_kajian[_-]([123])/);
    if (m) return "HIT Target Kajian " + m[1];
    m = code.match(/target_lanjutan[_-]([123])/);
    if (m) return "HIT Target Lanjutan " + m[1];
    if (code === "invalidasi" || code === "hit_invalidasi") return "HIT Invalidasi";
    return studyStatus(row) === "Fresh" ? "Menunggu Harga Masuk" : "Update berjalan";
  }

  function distanceToPrice(row) {
    const cp = Number(row.current_price);
    const hi = Number(row.area_high);
    const lo = Number(row.area_low);
    if (!Number.isFinite(cp) || !Number.isFinite(hi) || !Number.isFinite(lo)) return Number.MAX_SAFE_INTEGER;
    const high = Math.max(hi, lo), low = Math.min(hi, lo);
    if (cp >= low && cp <= high) return 0;
    return Math.min(Math.abs(cp - high), Math.abs(cp - low));
  }

  function sortStudyRows(rows) {
    return rows.slice().sort(function (a, b) {
      const sa = studyStatus(a), sb = studyStatus(b);
      const pa = sa === "Fresh" ? 0 : sa === "Active" ? 1 : 2;
      const pb = sb === "Fresh" ? 0 : sb === "Active" ? 1 : 2;
      if (pa !== pb) return pa - pb;
      const da = distanceToPrice(a), db = distanceToPrice(b);
      if (da !== db) return da - db;
      return new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0);
    });
  }

  async function loadMemberStudyLiveCard() {
    const box = document.getElementById("memberStudyLiveBox");
    if (!box) return;
    try {
      const { data, error } = await client()
        .from("signals")
        .select("id_zona,pair,timeframe,jenis_zona,skenario,area_high,area_low,tp1,tp2,tp3,invalidasi,status,running_point,max_running_point,visibility,source_payload,is_active,is_published,price_entered_area_at,current_price,invalidated_at,finished_at,created_at,updated_at")
        .eq("is_active", true)
        .eq("is_published", true)
        .order("updated_at", { ascending: false })
        .limit(40);
      if (error) throw error;
      const rows = sortStudyRows((data || []).filter(shouldShowMember));
      if (!rows.length) {
        box.innerHTML = "Belum ada Kamar Study member yang aktif.";
        return;
      }
      const x = rows[0];
      const p = sourcePayload(x);
      const pc = pointClass(x.running_point), mc = pointClass(x.max_running_point);
      box.className = "study-panel study-card-v3 kamar-live-member-card";
      box.innerHTML = '<div class="panel-head study-live-head"><div class="study-head-main"><span class="mini-label">Card Utama Kamar Study</span><div class="study-title-price"><h3>' + escapeHtml(x.pair || "-") + ' · ' + escapeHtml(x.timeframe || "-") + '</h3><div class="study-current-price digital-watch"><span>Harga Saat Ini</span><strong class="live-price">' + formatPrice(x.current_price) + '</strong></div></div></div><span class="status-pill ' + (studyStatus(x) === "Fresh" ? "fresh" : "running") + '">' + escapeHtml(studyStatus(x)) + '</span></div>'+
        '<div class="study-signal-title compact-title"><strong>' + escapeHtml(x.skenario || "-") + ' Study · ' + escapeHtml(x.jenis_zona || "-") + '</strong><small>ID: ' + escapeHtml(x.id_zona || "-") + '</small></div>'+
        '<div class="signal-two-rails signal-two-rails-live"><div class="rail-card left-rail"><div><span>Area Kajian</span><strong>' + formatPrice(x.area_low) + ' – ' + formatPrice(x.area_high) + '</strong></div><div><span>Invalidasi</span><strong>' + formatPrice(x.invalidasi) + '</strong></div></div>'+
        '<div class="rail-card right-rail progress-rail"><div class="study-update-hero"><span>Update Perkembangan</span><strong>' + escapeHtml(progressLabel(x)) + '</strong></div><div><span>Running Actual</span><strong class="' + pc + ' digital-watch">' + formatPoint(x.running_point) + '</strong></div><div><span>Running Terjauh</span><strong class="' + mc + ' digital-watch">' + formatPoint(x.max_running_point) + '</strong></div></div></div>'+
        '<div class="target-row target-v3 target-stack"><div><span>Target Kajian</span><strong>' + formatPrice(x.tp1) + ' · ' + formatPrice(x.tp2) + ' · ' + formatPrice(x.tp3) + '</strong></div><div><span>Target Lanjutan</span><strong>' + formatPrice(p.target_lanjutan_1) + ' · ' + formatPrice(p.target_lanjutan_2) + ' · ' + formatPrice(p.target_lanjutan_3) + '</strong></div></div>'+
        '<p class="study-note"><a class="btn btn-primary" href="member-study.html">Lihat Detail Kamar Study</a></p>';
    } catch (error) {
      console.warn("[Kamar Dashboard Study]", error);
    }
  }



  function mdEsc(value){return String(value==null?'':value).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c];});}
  function mdPayload(x){var p=x&&x.source_payload;if(!p)return {};if(typeof p==='object')return p;try{return JSON.parse(p)}catch(e){return {};}}
  function mdShowMember(x){var p=mdPayload(x); if(p.show_member!==undefined)return !!p.show_member; return String(x&&x.visibility||'').toLowerCase()==='member';}
  function mdPrice(v){var n=Number(v);return Number.isFinite(n)?n.toFixed(2):'-';}
  function mdPoint(v){var n=Number(v);if(!Number.isFinite(n))return '-';return (n>0?'+':'')+n.toFixed(2)+' Point';}
  function mdPointClass(v){var n=Number(v);if(!Number.isFinite(n)||n===0)return 'neutral';return n>0?'positive':'negative';}
  function mdStatus(x){var st=String(x&&x.status||'').toUpperCase();if(st==='INVALID'||x.invalidated_at||x.finished_at)return 'Invalid';if(st==='FRESH'||!x.price_entered_area_at)return 'Fresh';return 'Active';}
  function mdDistance(x){var cp=Number(x&&x.current_price), lo=Number(x&&x.area_low), hi=Number(x&&x.area_high); if(!Number.isFinite(cp)||!Number.isFinite(lo)||!Number.isFinite(hi))return Number.MAX_VALUE; var low=Math.min(lo,hi), high=Math.max(lo,hi); if(cp>=low&&cp<=high)return 0; return Math.min(Math.abs(cp-low),Math.abs(cp-high));}
  async function loadMemberStudyMainCard(){
    const box=document.getElementById('memberStudyMainCard'); if(!box) return;
    try{
      const {data,error}=await client().from('signals').select('id_zona,pair,timeframe,jenis_zona,skenario,area_high,area_low,tp1,tp2,tp3,invalidasi,status,running_point,max_running_point,current_price,visibility,source_payload,is_active,is_published,price_entered_area_at,invalidated_at,finished_at,created_at,updated_at').eq('is_active',true).eq('is_published',true).order('updated_at',{ascending:false}).limit(30);
      if(error) throw error;
      const rows=(data||[]).filter(mdShowMember).sort(function(a,b){var sa=mdStatus(a),sb=mdStatus(b);if(sa==='Fresh'&&sb!=='Fresh')return -1;if(sa!=='Fresh'&&sb==='Fresh')return 1;var da=mdDistance(a),db=mdDistance(b);if(da!==db)return da-db;return new Date(b.updated_at||0)-new Date(a.updated_at||0);});
      if(!rows.length){box.innerHTML='<span class="mini-label">Kamar Study Terdekat</span><div class="page-note"><strong>Belum ada data aktif</strong><br/>Signal member akan muncul otomatis saat tersedia.</div>';return;}
      const x=rows[0];
      box.classList.remove('live-updated'); void box.offsetWidth; box.classList.add('live-updated');
      box.innerHTML='<span class="mini-label">Kamar Study Terdekat</span><div class="admin-detail-row"><div><div class="study-title-price"><h2>'+mdEsc(x.pair||'-')+' · '+mdEsc(x.timeframe||'-')+'</h2><div class="study-current-price digital-watch"><span>Harga Saat Ini</span><strong>'+mdPrice(x.current_price)+'</strong></div></div><p>'+mdEsc(x.skenario||'-')+' Study · '+mdEsc(x.jenis_zona||'-')+' · Status Zona: '+mdEsc(mdStatus(x))+'</p><div class="study-live-meta"><span>Running Actual: <strong class="'+mdPointClass(x.running_point)+' digital-watch">'+mdPoint(x.running_point)+'</strong></span><span>Running Terjauh: <strong class="'+mdPointClass(x.max_running_point)+' digital-watch">'+mdPoint(x.max_running_point)+'</strong></span></div><p class="study-live-note">ID Zona: '+mdEsc(x.id_zona||'-')+'</p></div><a class="btn secondary" href="member-study.html">Lihat Detail Kamar Study</a></div>';
    }catch(error){box.innerHTML='<span class="mini-label">Kamar Study Terdekat</span><div class="expired-note"><strong>Gagal memuat Kamar Study</strong><br/>'+mdEsc(error.message||error)+'</div>';}
  }
  function startMemberStudyPolling(access, profile){
    const activeAccount=profile&&profile.account_status==='active'&&profile.payment_status==='confirmed'&&!isAccessExpired(profile)&&!access.locked_by_expired&&access.access_kamar_study;
    if(!activeAccount) return;
    loadMemberStudyMainCard();
    setInterval(function(){ if(!document.hidden) loadMemberStudyMainCard(); },30000);
    document.addEventListener('visibilitychange',function(){ if(!document.hidden) loadMemberStudyMainCard(); });
  }

  async function initDashboard() {
    if (!window.KamarAuth) return;

    try {
      const auth = await window.KamarAuth.requireAuth("member");
      if (!auth || !auth.profile) return;

      const access = await getMemberAccess(auth.profile.id);
      updateWelcome(auth.profile);
      setStatusBox(auth.profile, access);
      updateSidebar(access, auth.profile);
      updateFacilitySummary(access, auth.profile);
      startMemberStudyPolling(access, auth.profile);
      loadMemberStudyLiveCard();
      window.setInterval(loadMemberStudyLiveCard, 15000);
    } catch (error) {
      console.error("[Kamar Dashboard]", error);
      const box = document.getElementById("memberStatusBox");
      if (box) {
        box.classList.remove("page-note");
        box.classList.add("expired-note");
        box.innerHTML = `<strong>Gagal Membaca Data</strong><br/>${error.message || "Silakan refresh halaman atau login ulang."}`;
      }
    }
  }

  document.addEventListener("DOMContentLoaded", initDashboard);
})();
