(function(){
  "use strict";

  const FACILITY_LABELS = {
    access_kamar_study: "Kamar Study",
    access_materi_edukasi: "Materi Edukasi",
    access_kamar_private: "Kamar Private",
    access_kamar_indikator: "Kamar Indikator",
    access_kamar_robot: "Kamar Robot"
  };

  let members = [];
  let accessByProfile = new Map();
  let openDetailId = null;

  function qs(sel){ return document.querySelector(sel); }
  function client(){
    if(!window.kamarSupabase) throw new Error(window.KAMAR_SUPABASE_ERROR || "Supabase client belum siap.");
    return window.kamarSupabase;
  }
  function esc(value){
    return String(value ?? "").replace(/[&<>"']/g, function(ch){
      return ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"})[ch];
    });
  }
  function formatDate(value){
    if(!value) return "-";
    try { return new Intl.DateTimeFormat("id-ID", { day:"2-digit", month:"short", year:"numeric" }).format(new Date(value)); }
    catch(e){ return String(value); }
  }
  function statusLabel(status){
    const map = { active:"Aktif", pending_activation:"Pending Aktivasi", expired:"Expired", suspended:"Suspended" };
    return map[status] || status || "-";
  }
  function paymentLabel(status){
    const map = { confirmed:"Confirmed", pending:"Pending", rejected:"Rejected", failed:"Failed", refunded:"Refunded" };
    return map[status] || status || "-";
  }
  function statusChipClass(status){
    if(status === "active") return "on";
    if(status === "pending_activation") return "warn";
    return "off";
  }
  function getAccess(profileId){ return accessByProfile.get(profileId) || {}; }
  function activeFacilities(access){ return Object.keys(FACILITY_LABELS).filter(function(key){ return Boolean(access[key]); }); }
  function waUrl(member){
    const number = String(member.whatsapp || "").replace(/[^0-9]/g, "");
    if(!number) return "";
    const msg = `Halo ${member.full_name || "Kawan Kamar"}, saya Admin Kamar Kajian Market. Kami ingin follow up terkait status akun/fasilitas member Anda.`;
    return `https://wa.me/${encodeURIComponent(number)}?text=${encodeURIComponent(msg)}`;
  }
  function tgUrl(member){
    const username = String(member.telegram_username || "").replace(/^@+/, "").trim();
    return username ? `https://t.me/${encodeURIComponent(username)}` : "";
  }

  async function loadMembers(){
    const statusEl = qs("#adminMembersStatus");
    const listEl = qs("#adminMembersList");
    if(statusEl) { statusEl.className = "page-note"; statusEl.textContent = "Memuat data member dari Supabase..."; }
    if(listEl) listEl.innerHTML = "";

    if(window.KamarAuth){ await window.KamarAuth.requireAuth("admin"); }

    const { data: profiles, error: profileError } = await client()
      .from("member_profiles")
      .select("id,member_id,full_name,email,whatsapp,telegram_username,role,account_status,payment_status,access_start_date,access_end_date,created_at")
      .neq("role", "admin")
      .order("created_at", { ascending:false });
    if(profileError) throw profileError;

    const ids = (profiles || []).map(function(m){ return m.id; });
    let accesses = [];
    if(ids.length){
      const { data: accessRows, error: accessError } = await client()
        .from("member_access")
        .select("profile_id,access_kamar_study,access_materi_edukasi,access_kamar_private,access_kamar_indikator,access_kamar_robot,locked_by_expired,locked_reason")
        .in("profile_id", ids);
      if(accessError) throw accessError;
      accesses = accessRows || [];
    }

    accessByProfile = new Map(accesses.map(function(row){ return [row.profile_id, row]; }));
    members = profiles || [];
    renderMembers();
  }

  function filterMembers(){
    const q = String(qs("#adminMemberSearch")?.value || "").trim().toLowerCase();
    const status = qs("#adminMemberStatusFilter")?.value || "all";
    const facility = qs("#adminMemberFacilityFilter")?.value || "all";
    return members.filter(function(member){
      const access = getAccess(member.id);
      const haystack = [member.member_id, member.full_name, member.email, member.whatsapp, member.telegram_username, member.account_status, member.payment_status].join(" ").toLowerCase();
      return (!q || haystack.includes(q)) && (status === "all" || member.account_status === status) && (facility === "all" || Boolean(access[facility]));
    });
  }

  function renderDetailBlock(member, access){
    const facilities = Object.keys(FACILITY_LABELS).map(function(key){
      return `<span class="kamar-chip ${access[key] ? "on" : "off"}">${esc(FACILITY_LABELS[key])}: ${access[key] ? "ON" : "OFF"}</span>`;
    }).join(" ");
    const wa = waUrl(member);
    const tg = tgUrl(member);
    return `
      <div class="admin-inline-detail" id="detail-${esc(member.id)}">
        <div class="admin-detail-panel">
          <div class="setting-card"><span>Nama</span><strong>${esc(member.full_name || "-")}</strong></div>
          <div class="setting-card"><span>Member ID</span><strong>${esc(member.member_id || "-")}</strong></div>
          <div class="setting-card"><span>Email</span><strong>${esc(member.email || "-")}</strong></div>
          <div class="setting-card"><span>WhatsApp</span><strong>${esc(member.whatsapp || "-")}</strong></div>
          <div class="setting-card"><span>Telegram</span><strong>${esc(member.telegram_username ? "@" + String(member.telegram_username).replace(/^@+/, "") : "-")}</strong></div>
          <div class="setting-card"><span>Status</span><strong>${esc(statusLabel(member.account_status))} · ${esc(paymentLabel(member.payment_status))}</strong></div>
          <div class="setting-card"><span>Masa Akses</span><strong>${formatDate(member.access_start_date)} — ${formatDate(member.access_end_date)}</strong></div>
          <div class="setting-card"><span>Locked</span><strong>${access.locked_by_expired ? "Ya" : "Tidak"}</strong></div>
          <div class="setting-card full" style="grid-column:1/-1"><span>Fasilitas</span><div class="member-meta">${facilities}</div></div>
          <div class="setting-card full" style="grid-column:1/-1"><span>Catatan Lock</span><strong>${esc(access.locked_reason || "-")}</strong></div>
        </div>
        <div class="button-row">
          ${wa ? `<a class="btn mini" href="${wa}" target="_blank" rel="noopener">WhatsApp</a>` : `<button class="btn mini secondary" type="button" disabled>WhatsApp Kosong</button>`}
          ${tg ? `<a class="btn mini secondary" href="${tg}" target="_blank" rel="noopener">Telegram</a>` : `<button class="btn mini secondary" type="button" disabled>Telegram Kosong</button>`}
          <a class="btn mini secondary" href="admin-activation.html?member=${encodeURIComponent(member.email || "")}">Aktivasi / Ubah Akses</a>
          <a class="btn mini secondary" href="admin-renewal.html?member=${encodeURIComponent(member.email || "")}">Renewal</a>
        </div>
      </div>`;
  }

  function renderMembers(){
    const listEl = qs("#adminMembersList");
    const statusEl = qs("#adminMembersStatus");
    const countEl = qs("#adminMemberCount");
    const pendingEl = qs("#adminPendingCount");
    if(!listEl) return;

    const filtered = filterMembers();
    const pending = members.filter(function(m){ return m.account_status === "pending_activation"; }).length;
    if(countEl) countEl.textContent = "Total: " + members.length + " | Tampil: " + filtered.length;
    if(pendingEl) pendingEl.textContent = "Pending: " + pending;

    if(!members.length){
      if(statusEl){ statusEl.className = "expired-note"; statusEl.innerHTML = "<strong>Belum ada data member.</strong><br/>Jika sudah ada pendaftaran, cek RLS/policy admin untuk tabel member_profiles."; }
      listEl.innerHTML = "";
      return;
    }
    if(!filtered.length){
      if(statusEl){ statusEl.className = "page-note"; statusEl.textContent = "Data member ada, tetapi tidak cocok dengan filter saat ini."; }
      listEl.innerHTML = '<div class="admin-empty-state">Tidak ada member yang cocok dengan filter.</div>';
      return;
    }
    if(statusEl){ statusEl.className = "page-note"; statusEl.innerHTML = "<strong>Data member terbaca.</strong><br/>Klik Detail untuk membuka data lengkap, kontak, dan aksi admin."; }

    listEl.innerHTML = filtered.map(function(member){
      const access = getAccess(member.id);
      const facilities = activeFacilities(access);
      const chips = facilities.length
        ? facilities.map(function(key){ return '<span class="kamar-chip on">'+esc(FACILITY_LABELS[key])+'</span>'; }).join("")
        : '<span class="kamar-chip off">Belum ada fasilitas aktif</span>';
      const isOpen = openDetailId === member.id;
      return `
        <article class="admin-member-card ${isOpen ? "is-open" : ""}" data-member-card="${esc(member.id)}">
          <div>
            <h3>${esc(member.full_name || "Tanpa Nama")}</h3>
            <p><strong>${esc(member.member_id || "-")}</strong> · ${esc(member.email || "-")}</p>
            <div class="member-meta">
              <span class="kamar-chip ${statusChipClass(member.account_status)}">${esc(statusLabel(member.account_status))}</span>
              <span class="kamar-chip ${member.payment_status === "confirmed" ? "on" : "warn"}">${esc(paymentLabel(member.payment_status))}</span>
              ${chips}
            </div>
          </div>
          <div>
            <p>WA: ${esc(member.whatsapp || "-")}</p>
            <p>Telegram: ${esc(member.telegram_username ? "@" + String(member.telegram_username).replace(/^@+/, "") : "-")}</p>
            <p>Masa akses: ${formatDate(member.access_start_date)} — ${formatDate(member.access_end_date)}</p>
          </div>
          <div class="admin-member-actions">
            <button class="btn mini secondary" type="button" data-detail-id="${esc(member.id)}">${isOpen ? "Tutup" : "Detail"}</button>
          </div>
          ${isOpen ? renderDetailBlock(member, access) : ""}
        </article>`;
    }).join("");
  }

  document.addEventListener("DOMContentLoaded", function(){
    ["#adminMemberSearch", "#adminMemberStatusFilter", "#adminMemberFacilityFilter"].forEach(function(sel){
      const el = qs(sel);
      if(el) el.addEventListener(sel.includes("Search") ? "input" : "change", function(){ openDetailId = null; renderMembers(); });
    });
    qs("#adminMemberRefresh")?.addEventListener("click", function(){ loadMembers().catch(showError); });
    qs("#adminMembersList")?.addEventListener("click", function(event){
      const btn = event.target.closest("[data-detail-id]");
      if(!btn) return;
      const id = btn.getAttribute("data-detail-id");
      openDetailId = openDetailId === id ? null : id;
      renderMembers();
      if(openDetailId){ setTimeout(function(){ qs(`[data-member-card="${CSS.escape(openDetailId)}"]`)?.scrollIntoView({behavior:"smooth", block:"center"}); }, 30); }
    });
    loadMembers().catch(showError);
  });

  function showError(error){
    console.error("[Admin Members]", error);
    const statusEl = qs("#adminMembersStatus");
    if(statusEl){
      statusEl.className = "expired-note";
      statusEl.innerHTML = "<strong>Gagal memuat data member.</strong><br/>" + esc(error.message || "Periksa policy Supabase/RLS untuk admin.");
    }
  }
})();
