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
