(function () {
  "use strict";

  const FACILITY_PAGES = {
    "member-study.html": { key: "access_kamar_study", label: "Kamar Study" },
    "member-materials.html": { key: "access_materi_edukasi", label: "Materi Edukasi" },
    "member-private.html": { key: "access_kamar_private", label: "Kamar Private" },
    "member-indicator.html": { key: "access_kamar_indikator", label: "Kamar Indikator" },
    "member-robot.html": { key: "access_kamar_robot", label: "Kamar Robot" }
  };

  const MEMBER_SAFE_PAGES = new Set([
    "dashboard.html",
    "member-profile.html",
    "member-renewal.html"
  ]);

  function client() {
    if (!window.kamarSupabase) {
      throw new Error(window.KAMAR_SUPABASE_ERROR || "Supabase client belum siap.");
    }
    return window.kamarSupabase;
  }

  function currentPage() {
    const page = window.location.pathname.split("/").pop();
    return page || "index.html";
  }

  function formatDate(value) {
    if (!value) return "-";
    try {
      return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
    } catch (error) {
      return String(value);
    }
  }

  function isExpired(profile) {
    if (!profile || !profile.access_end_date) return false;
    return new Date(profile.access_end_date).getTime() < Date.now();
  }

  function isActiveAccount(profile, access) {
    return Boolean(
      profile &&
      profile.account_status === "active" &&
      profile.payment_status === "confirmed" &&
      !isExpired(profile) &&
      !(access && access.locked_by_expired)
    );
  }

  function updateMemberSidebar(access, profile) {
    const activeAccount = isActiveAccount(profile, access || {});
    const links = Array.from(document.querySelectorAll(".split-sidebar a"));
    Object.keys(FACILITY_PAGES).forEach(function (pageName) {
      const facility = FACILITY_PAGES[pageName];
      const link = links.find(function (a) {
        return String(a.textContent || "").toLowerCase().includes(facility.label.toLowerCase());
      });
      if (!link) return;
      const canAccess = Boolean(access && access[facility.key]) && activeAccount;
      link.classList.toggle("disabled", !canAccess);
      link.href = canAccess ? pageName : "member-renewal.html";
      link.textContent = canAccess ? facility.label : facility.label + " 🔒";
    });
  }

  async function getAccess(profileId) {
    const { data, error } = await client()
      .from("member_access")
      .select("access_kamar_study,access_materi_edukasi,access_kamar_private,access_kamar_indikator,access_kamar_robot,locked_by_expired,locked_reason")
      .eq("profile_id", profileId)
      .maybeSingle();

    if (error) throw error;
    return data || {};
  }

  function showLockedPage(facility, profile, access) {
    const main = document.querySelector(".split-main") || document.querySelector("main") || document.body;
    const reason = access && access.locked_reason ? access.locked_reason : "Fasilitas ini belum aktif untuk akun Anda.";
    const dateText = profile && profile.access_end_date ? "Masa akses tercatat sampai " + formatDate(profile.access_end_date) + "." : "Masa akses belum aktif.";

    main.innerHTML = `
      <section class="split-card member-page-panel">
        <span class="eyebrow">Akses Terkunci</span>
        <h1>${facility.label} Terkunci</h1>
        <p>${reason}</p>
      </section>
      <section class="split-card">
        <div class="expired-note">
          <strong>Status Fasilitas: Belum Aktif</strong><br/>
          ${dateText} Silakan ajukan aktivasi, perpanjangan, atau tambah fasilitas ke Admin Kamar.
        </div>
        <div class="button-row">
          <a class="btn" href="member-renewal.html">Perpanjangan / Tambah Fasilitas</a>
          <a class="btn secondary" href="dashboard.html">Kembali ke Dashboard</a>
        </div>
      </section>
    `;
  }

  function showPendingProfile(profile) {
    const page = currentPage();
    if (page !== "member-renewal.html") return;
    if (!profile || profile.account_status !== "pending_activation") return;

    const main = document.querySelector(".split-main") || document.querySelector("main");
    if (!main) return;
    const note = document.createElement("section");
    note.className = "split-card";
    note.innerHTML = `
      <div class="page-note">
        <strong>Akun Menunggu Aktivasi</strong><br/>
        Akun sudah terdaftar. Admin akan mengecek pembayaran/permintaan akses sebelum fasilitas diaktifkan.
      </div>
    `;
    main.insertBefore(note, main.firstChild);
  }

  async function guard() {
    const page = currentPage();
    const isAdminPage = page.startsWith("admin");
    const facility = FACILITY_PAGES[page];
    const isMemberPage = Boolean(facility) || MEMBER_SAFE_PAGES.has(page);

    if (!isAdminPage && !isMemberPage) return;
    if (!window.KamarAuth) throw new Error("KamarAuth belum dimuat.");

    if (isAdminPage) {
      await window.KamarAuth.requireAuth("admin");
      return;
    }

    const auth = await window.KamarAuth.requireAuth("member");
    if (!auth || !auth.profile) return;

    const access = await getAccess(auth.profile.id);
    updateMemberSidebar(access, auth.profile);

    if (!facility) {
      showPendingProfile(auth.profile);
      return;
    }
    const allowed = Boolean(access[facility.key]) && isActiveAccount(auth.profile, access);
    if (!allowed) showLockedPage(facility, auth.profile, access);
  }

  document.addEventListener("DOMContentLoaded", function () {
    guard().catch(function (error) {
      console.error("[Kamar Guard]", error);
      const main = document.querySelector(".split-main") || document.querySelector("main") || document.body;
      main.innerHTML = `
        <section class="split-card member-page-panel">
          <span class="eyebrow">Akses Tidak Valid</span>
          <h1>Session Tidak Terbaca</h1>
          <p>${error.message || "Silakan login ulang untuk membuka halaman ini."}</p>
          <div class="button-row"><a class="btn" href="member.html">Login Ulang</a></div>
        </section>
      `;
    });
  });
})();
