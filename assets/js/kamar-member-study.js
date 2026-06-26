(function () {
  "use strict";

  function client() {
    if (!window.kamarSupabase) {
      throw new Error(window.KAMAR_SUPABASE_ERROR || "Supabase client belum siap.");
    }
    return window.kamarSupabase;
  }

  function qs(selector) {
    return document.querySelector(selector);
  }

  function text(value, fallback) {
    if (value === null || value === undefined || value === "") return fallback || "-";
    return String(value);
  }

  function formatDate(value) {
    if (!value) return "-";
    try {
      return new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }).format(new Date(value));
    } catch (error) {
      return String(value);
    }
  }

  function isExpired(profile) {
    if (!profile || !profile.access_end_date) return false;
    return new Date(profile.access_end_date).getTime() < Date.now();
  }

  function isAllowed(profile, access) {
    return Boolean(
      profile &&
      profile.account_status === "active" &&
      profile.payment_status === "confirmed" &&
      !isExpired(profile) &&
      access &&
      access.access_kamar_study &&
      !access.locked_by_expired
    );
  }

  async function getAccess(profileId) {
    const { data, error } = await client()
      .from("member_access")
      .select("access_kamar_study,locked_by_expired,locked_reason")
      .eq("profile_id", profileId)
      .maybeSingle();

    if (error) throw error;
    return data || {};
  }

  function valueFrom(item, names, fallback) {
    for (const name of names) {
      if (item && item[name] !== undefined && item[name] !== null && item[name] !== "") return item[name];
    }
    return fallback;
  }

  function renderStatus(message, type) {
    const box = qs("#studyFeedStatus");
    if (!box) return;
    box.className = type === "error" ? "expired-note" : "page-note";
    box.innerHTML = message;
  }

  function renderEmpty() {
    const list = qs("#studyFeedList");
    if (list) list.innerHTML = "";
    renderStatus("<strong>Belum Ada Data Kamar Study</strong><br/>Zona kajian member belum tersedia untuk filter ini.", "info");
  }

  function renderFeed(items) {
    const list = qs("#studyFeedList");
    if (!list) return;

    if (!items || !items.length) {
      renderEmpty();
      return;
    }

    renderStatus("<strong>Data Kamar Study Aktif</strong><br/>Menampilkan data kajian dari Supabase sesuai akses member.", "info");

    list.innerHTML = items.map(function (item) {
      const pair = valueFrom(item, ["pair", "symbol", "instrument"], "Market");
      const timeframe = valueFrom(item, ["timeframe", "tf"], "-");
      const status = valueFrom(item, ["status", "signal_status", "zone_status"], "-");
      const direction = valueFrom(item, ["direction", "bias", "side", "entry_side"], "-");
      const zoneType = valueFrom(item, ["zone_type", "type", "zona_type"], "-");
      const title = valueFrom(item, ["title", "signal_title", "id_zona"], pair + " " + timeframe);
      const note = valueFrom(item, ["analysis_note", "description", "notes", "setup_note", "market_logic"], "Detail kajian mengikuti data yang tersedia dari admin.");
      const areaLow = valueFrom(item, ["area_low", "zone_low", "price_low", "entry_low"], null);
      const areaHigh = valueFrom(item, ["area_high", "zone_high", "price_high", "entry_high"], null);
      const invalid = valueFrom(item, ["invalid_price", "invalidation_price", "sl", "stop_loss"], "-");
      const tp1 = valueFrom(item, ["tp1", "take_profit_1"], "-");
      const tp2 = valueFrom(item, ["tp2", "take_profit_2"], "-");
      const tp3 = valueFrom(item, ["tp3", "take_profit_3"], "-");
      const updated = valueFrom(item, ["updated_at", "created_at", "published_at"], null);
      const area = areaLow !== null || areaHigh !== null ? text(areaLow) + " - " + text(areaHigh) : "-";

      return `
        <article class="study-card">
          <div class="study-card-head">
            <div>
              <h3>${text(title)}</h3>
              <div class="study-meta">
                <span class="study-pill on">${text(pair)}</span>
                <span class="study-pill">${text(timeframe)}</span>
                <span class="study-pill">${text(direction)}</span>
                <span class="study-pill">${text(zoneType)}</span>
                <span class="study-pill">${text(status)}</span>
              </div>
            </div>
          </div>
          <p class="study-note">${text(note)}</p>
          <div class="study-levels">
            <div><span>Zona</span><strong>${area}</strong></div>
            <div><span>Invalidasi</span><strong>${text(invalid)}</strong></div>
            <div><span>TP 1</span><strong>${text(tp1)}</strong></div>
            <div><span>TP 2 / TP 3</span><strong>${text(tp2)} / ${text(tp3)}</strong></div>
          </div>
          <p class="study-note"><small>Update: ${formatDate(updated)}</small></p>
        </article>
      `;
    }).join("");
  }

  async function loadFeed() {
    const list = qs("#studyFeedList");
    if (list) list.innerHTML = "";
    renderStatus("<strong>Memuat Data</strong><br/>Mengambil feed Kamar Study dari Supabase...", "info");

    const pair = qs("#studyFilterPair") ? qs("#studyFilterPair").value || null : null;
    const timeframe = qs("#studyFilterTimeframe") ? qs("#studyFilterTimeframe").value || null : null;
    const status = qs("#studyFilterStatus") ? qs("#studyFilterStatus").value || null : null;

    const { data, error } = await client().rpc("get_member_kamar_study_feed", {
      filter_pair: pair,
      filter_timeframe: timeframe,
      filter_status: status,
      result_limit: 20
    });

    if (error) throw error;
    renderFeed(Array.isArray(data) ? data : []);
  }

  async function initStudyPage() {
    if (!qs("#studyFeedList")) return;

    try {
      if (!window.KamarAuth) throw new Error("KamarAuth belum dimuat.");
      const auth = await window.KamarAuth.requireAuth("member");
      if (!auth || !auth.profile) return;

      const access = await getAccess(auth.profile.id);
      if (!isAllowed(auth.profile, access)) {
        return;
      }

      await loadFeed();
    } catch (error) {
      console.error("[Kamar Study]", error);
      renderStatus("<strong>Gagal Memuat Kamar Study</strong><br/>" + (error.message || "Silakan refresh halaman atau login ulang."), "error");
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    const refresh = qs("#studyRefreshBtn");
    if (refresh) refresh.addEventListener("click", function () { loadFeed().catch(function (error) { renderStatus("<strong>Gagal Memuat Data</strong><br/>" + (error.message || "Silakan coba lagi."), "error"); }); });
    ["#studyFilterPair", "#studyFilterTimeframe", "#studyFilterStatus"].forEach(function (selector) {
      const el = qs(selector);
      if (el) el.addEventListener("change", function () { loadFeed().catch(function (error) { renderStatus("<strong>Gagal Memuat Data</strong><br/>" + (error.message || "Silakan coba lagi."), "error"); }); });
    });
    initStudyPage();
  });
})();
