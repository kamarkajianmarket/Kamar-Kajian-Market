(function(){
  "use strict";

  const FACILITY_LABELS = {
    access_kamar_study: "Kamar Study",
    access_materi_edukasi: "Kamar Edukasi",
    access_kamar_private: "Kamar Private",
    access_kamar_indikator: "Kamar Indikator",
    access_kamar_robot: "Kamar Robot"
  };

  let members = [];
  let accessByProfile = new Map();
  let openDetailId = null;
  let savingFacility = false;

  function qs(sel, root){ return (root || document).querySelector(sel); }
  function client(){
    if(!window.kamarSupabase) throw new Error(window.KAMAR_SUPABASE_ERROR || "Supabase client belum siap.");
    return window.kamarSupabase;
  }
  function toast(message){
    if(window.KamarUI && typeof window.KamarUI.toast === "function") return window.KamarUI.toast(message);
    if(typeof window.toast === "function") return window.toast(message);
    console.log(message);
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
    const map = { confirmed:"Terkonfirmasi", pending:"Pending", rejected:"Ditolak", failed:"Gagal", refunded:"Refunded" };
    return map[status] || status || "-";
  }
  function chipClass(status){
    if(status === "active" || status === "confirmed") return "on";
    if(status === "pending_activation" || status === "pending") return "warn";
    return "off";
  }
  function getAccess(profileId){ return accessByProfile.get(profileId) || {}; }
  function activeFacilityKeys(access){ return Object.keys(FACILITY_LABELS).filter(function(key){ return Boolean(access[key]); }); }
  function activeFacilitiesText(access){
    const keys = activeFacilityKeys(access);
    return keys.length ? keys.map(function(k){ return FACILITY_LABELS[k]; }).join(", ") : "Belum ada fasilitas aktif";
  }
  function normalizeTelegram(username){ return String(username || "").replace(/^@+/, "").trim(); }
  function waUrl(member){
    const number = String(member.whatsapp || "").replace(/[^0-9]/g, "");
    if(!number) return "";
    const msg = `Halo ${member.full_name || "Kawan Kamar"}, saya Admin Kamar Kajian Market. Saya ingin follow up terkait status akun/fasilitas member Anda.`;
    return `https://wa.me/${encodeURIComponent(number)}?text=${encodeURIComponent(msg)}`;
  }
  function tgUrl(member){
    const username = normalizeTelegram(member.telegram_username);
    return username ? `https://t.me/${encodeURIComponent(username)}` : "";
  }

  async function loadMembers(){
    const statusEl = qs("#adminMembersStatus");
    const listEl = qs("#adminMembersList");
    if(statusEl){ statusEl.className = "page-note"; statusEl.textContent = "Memuat data member dari Supabase..."; }
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
      const haystack = [member.member_id, member.full_name, member.email, member.whatsapp, member.telegram_username, member.account_status, member.payment_status, activeFacilitiesText(access)].join(" ").toLowerCase();
      return (!q || haystack.includes(q)) && (status === "all" || member.account_status === status) && (facility === "all" || Boolean(access[facility]));
    });
  }

  function renderFacilityToggles(member, access){
    return Object.keys(FACILITY_LABELS).map(function(key){
      const checked = Boolean(access[key]);
      return `
        <label class="kamar-access-toggle">
          <span>
            <strong>${esc(FACILITY_LABELS[key])}</strong>
            <small>${checked ? "Aktif untuk member ini" : "Belum aktif"}</small>
          </span>
          <input type="checkbox" data-facility-toggle="${esc(key)}" data-profile-id="${esc(member.id)}" ${checked ? "checked" : ""}/>
          <i aria-hidden="true"></i>
        </label>`;
    }).join("");
  }

  function renderDetail(member, access){
    const wa = waUrl(member);
    const tg = tgUrl(member);
    return `
      <div class="admin-member-detail" data-detail-panel="${esc(member.id)}">
        <div class="admin-detail-list">
          <div class="admin-detail-row-clean"><span>Nama</span><strong>${esc(member.full_name || "-")}</strong></div>
          <div class="admin-detail-row-clean"><span>Member ID</span><strong>${esc(member.member_id || "-")}</strong></div>
          <div class="admin-detail-row-clean"><span>Email</span><strong>${esc(member.email || "-")}</strong></div>
          <div class="admin-detail-row-clean"><span>WhatsApp</span><strong>${esc(member.whatsapp || "-")}</strong></div>
          <div class="admin-detail-row-clean"><span>Telegram</span><strong>${esc(normalizeTelegram(member.telegram_username) ? "@" + normalizeTelegram(member.telegram_username) : "-")}</strong></div>
          <div class="admin-detail-row-clean"><span>Status</span><strong>${esc(statusLabel(member.account_status))} · ${esc(paymentLabel(member.payment_status))}</strong></div>
          <div class="admin-detail-row-clean"><span>Masa Akses</span><strong>${formatDate(member.access_start_date)} — ${formatDate(member.access_end_date)}</strong></div>
          <div class="admin-detail-row-clean"><span>Fasilitas Aktif</span><strong>${esc(activeFacilitiesText(access))}</strong></div>
          <div class="admin-detail-row-clean"><span>Locked</span><strong>${access.locked_by_expired ? "Ya" : "Tidak"}</strong></div>
          <div class="admin-detail-row-clean"><span>Catatan Lock</span><strong>${esc(access.locked_reason || "-")}</strong></div>
        </div>
        <div class="admin-member-contact-actions">
          ${wa ? `<a class="btn mini" href="${wa}" target="_blank" rel="noopener">WhatsApp</a>` : `<button class="btn mini secondary" type="button" disabled>WhatsApp Kosong</button>`}
          ${tg ? `<a class="btn mini secondary" href="${tg}" target="_blank" rel="noopener">Telegram</a>` : `<button class="btn mini secondary" type="button" disabled>Telegram Kosong</button>`}
          <a class="btn mini secondary" href="admin-activation.html?member=${encodeURIComponent(member.email || "")}">Halaman Aktivasi</a>
          <a class="btn mini secondary" href="admin-renewal.html?member=${encodeURIComponent(member.email || "")}">Halaman Renewal</a>
        </div>
        <div class="admin-access-editor">
          <div class="admin-access-editor-head">
            <h3>ON/OFF Fasilitas Member</h3>
            <p>Toggle ini langsung mengubah hak akses fasilitas member di Supabase.</p>
          </div>
          <div class="admin-access-toggle-list">
            ${renderFacilityToggles(member, access)}
          </div>
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
    if(statusEl){ statusEl.className = "page-note"; statusEl.innerHTML = "<strong>Data member terbaca.</strong><br/>Klik Detail untuk membuka data lengkap dan mengubah fasilitas member."; }

    listEl.innerHTML = filtered.map(function(member){
      const access = getAccess(member.id);
      const isOpen = openDetailId === member.id;
      const facilities = activeFacilityKeys(access);
      const facilityText = facilities.length ? facilities.map(function(k){ return FACILITY_LABELS[k]; }).join(", ") : "Belum ada fasilitas aktif";
      return `
        <article class="admin-member-list-item ${isOpen ? "is-open" : ""}" data-member-card="${esc(member.id)}">
          <div class="admin-member-summary-row">
            <div class="admin-member-primary">
              <h3>${esc(member.full_name || "Tanpa Nama")}</h3>
              <span>${esc(member.member_id || "-")}</span>
            </div>
            <div class="admin-member-contact">
              <strong>${esc(member.email || "-")}</strong>
              <span>WA: ${esc(member.whatsapp || "-")} · TG: ${esc(normalizeTelegram(member.telegram_username) ? "@" + normalizeTelegram(member.telegram_username) : "-")}</span>
            </div>
            <div class="admin-member-statuses">
              <span class="kamar-chip ${chipClass(member.account_status)}">${esc(statusLabel(member.account_status))}</span>
              <span class="kamar-chip ${chipClass(member.payment_status)}">${esc(paymentLabel(member.payment_status))}</span>
            </div>
            <div class="admin-member-access-summary">
              <strong>${formatDate(member.access_end_date)}</strong>
              <span>${esc(facilityText)}</span>
            </div>
            <div class="admin-member-actions-clean">
              <button class="btn mini secondary" type="button" data-detail-id="${esc(member.id)}">${isOpen ? "Tutup" : "Detail"}</button>
            </div>
          </div>
          ${isOpen ? renderDetail(member, access) : ""}
        </article>`;
    }).join("");
  }

  async function toggleFacility(profileId, key, checked){
    if(savingFacility) return;
    savingFacility = true;
    const listEl = qs("#adminMembersList");
    if(listEl) listEl.classList.add("is-saving");
    try{
      const current = getAccess(profileId);
      const next = Object.assign({}, current, { [key]: checked });
      const payload = {};
      Object.keys(FACILITY_LABELS).forEach(function(f){ payload[f] = Boolean(next[f]); });

      const { error } = await client()
        .from("member_access")
        .update(payload)
        .eq("profile_id", profileId);
      if(error) throw error;

      accessByProfile.set(profileId, Object.assign({}, current, payload));
      toast(`${FACILITY_LABELS[key]} ${checked ? "diaktifkan" : "dinonaktifkan"}.`);
      renderMembers();
    }catch(error){
      console.error("[Admin Members Toggle]", error);
      toast("Gagal mengubah fasilitas. Cek RLS/policy admin untuk update member_access.");
      renderMembers();
    }finally{
      savingFacility = false;
      if(listEl) listEl.classList.remove("is-saving");
    }
  }

  document.addEventListener("DOMContentLoaded", function(){
    ["#adminMemberSearch", "#adminMemberStatusFilter", "#adminMemberFacilityFilter"].forEach(function(sel){
      const el = qs(sel);
      if(el) el.addEventListener(sel.includes("Search") ? "input" : "change", function(){ openDetailId = null; renderMembers(); });
    });
    qs("#adminMemberRefresh")?.addEventListener("click", function(){ loadMembers().catch(showError); });
    qs("#adminMembersList")?.addEventListener("click", function(event){
      const detailBtn = event.target.closest("[data-detail-id]");
      if(detailBtn){
        event.preventDefault();
        const id = detailBtn.getAttribute("data-detail-id");
        openDetailId = openDetailId === id ? null : id;
        renderMembers();
        return;
      }
    });
    qs("#adminMembersList")?.addEventListener("change", function(event){
      const toggle = event.target.closest("[data-facility-toggle]");
      if(!toggle) return;
      const profileId = toggle.getAttribute("data-profile-id");
      const key = toggle.getAttribute("data-facility-toggle");
      toggleFacility(profileId, key, toggle.checked);
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
