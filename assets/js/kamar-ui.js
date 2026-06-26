(function () {
  "use strict";

  function qs(selector, root) {
    return (root || document).querySelector(selector);
  }

  function qsa(selector, root) {
    return Array.from((root || document).querySelectorAll(selector));
  }

  function setStatus(target, message, type) {
    const el = typeof target === "string" ? qs(target) : target;
    if (!el) return;
    el.hidden = false;
    el.textContent = message || "";
    el.dataset.status = type || "info";
    el.classList.remove("status-info", "status-success", "status-error", "status-warning");
    el.classList.add("status-" + (type || "info"));
  }

  function setLoading(button, isLoading, loadingText) {
    if (!button) return;
    if (isLoading) {
      button.dataset.originalText = button.textContent;
      button.textContent = loadingText || "Memproses...";
      button.disabled = true;
    } else {
      button.textContent = button.dataset.originalText || button.textContent;
      button.disabled = false;
    }
  }

  function normalizeTelegram(value) {
    return String(value || "").trim().replace(/^@+/, "");
  }

  function normalizeWhatsapp(value) {
    const raw = String(value || "").replace(/[^0-9]/g, "");
    if (!raw) return "";
    if (raw.startsWith("0")) return "62" + raw.slice(1);
    return raw;
  }

  function durationToDays(value) {
    const text = String(value || "").toLowerCase();
    if (text.includes("90")) return 90;
    if (text.includes("180")) return 180;
    if (text.includes("tahun") || text.includes("365")) return 365;
    return 30;
  }

  function facilityToKey(value) {
    const text = String(value || "").toLowerCase();
    if (text.includes("materi")) return "materi_edukasi";
    if (text.includes("private")) return "kamar_private";
    if (text.includes("indikator")) return "kamar_indikator";
    if (text.includes("robot")) return "kamar_robot";
    if (text.includes("lengkap")) return "all_paid";
    return "kamar_study";
  }

  window.KamarUI = {
    qs,
    qsa,
    setStatus,
    setLoading,
    normalizeTelegram,
    normalizeWhatsapp,
    durationToDays,
    facilityToKey
  };
})();
