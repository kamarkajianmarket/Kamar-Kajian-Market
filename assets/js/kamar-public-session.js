(function () {
  "use strict";

  const LIMIT_MS = 30 * 60 * 1000;
  const KEY = "kamarLastActivityAt";

  function touch() { try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {} }
  function last() { try { return Number(localStorage.getItem(KEY) || Date.now()); } catch (e) { return Date.now(); } }
  function page() { return (window.KAMAR_CONFIG && window.KAMAR_CONFIG.DEFAULT_MEMBER_REDIRECT) || "dashboard.html"; }

  async function getSession() {
    if (!window.kamarSupabase) return null;
    const { data } = await window.kamarSupabase.auth.getSession();
    return data && data.session ? data.session : null;
  }

  async function getProfile() {
    if (!window.KamarAuth) return null;
    try { return await window.KamarAuth.getMyProfile(); } catch (e) { return null; }
  }

  async function logoutExpired() {
    try { await window.kamarSupabase.auth.signOut(); } catch (e) {}
    try { localStorage.removeItem(KEY); } catch (e) {}
    updatePublicHeader(null);
  }

  function updatePublicHeader(profile) {
    const actions = document.querySelector(".site-header .header-actions");
    if (!actions) return;
    if (!profile) return;
    const name = profile.full_name || "Kawan Kamar";
    actions.innerHTML = '<a class="header-cta" href="https://t.me/kamarkajianmarket" rel="noopener" target="_blank">Join Grup Telegram</a>'+
      '<a class="header-cta header-member-name" href="dashboard.html">'+escapeHtml(name)+'</a>'+
      '<a class="header-cta header-member-cta" href="dashboard.html">Dashboard</a>';
  }

  function escapeHtml(v) {
    return String(v || "").replace(/[&<>\"']/g, function(m){ return ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[m]; });
  }

  function bindBrand(profile) {
    const brand = document.querySelector(".site-header .brand");
    if (!brand || !profile) return;
    brand.setAttribute("href", "dashboard.html");
    brand.addEventListener("click", function (event) {
      event.preventDefault();
      window.location.href = "dashboard.html";
    });
  }

  async function boot() {
    const session = await getSession();
    if (!session) return;
    if (Date.now() - last() > LIMIT_MS) { await logoutExpired(); return; }
    touch();
    const profile = await getProfile();
    if (!profile) return;
    updatePublicHeader(profile);
    bindBrand(profile);
    ["click", "scroll", "keydown", "mousemove", "touchstart"].forEach(function (eventName) {
      window.addEventListener(eventName, touch, { passive: true });
    });
    setInterval(function(){ if (Date.now() - last() > LIMIT_MS) logoutExpired(); }, 60 * 1000);
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
