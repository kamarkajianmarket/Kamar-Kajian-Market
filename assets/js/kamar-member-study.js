(function () {
  "use strict";

  function client() {
    if (!window.kamarSupabase) {
      throw new Error(window.KAMAR_SUPABASE_ERROR || "Supabase client belum siap.");
    }
    return window.kamarSupabase;
  }

  function qs(selector) { return document.querySelector(selector); }

  function text(value, fallback) {
    if (value === null || value === undefined || value === "") return fallback || "-";
    return String(value);
  }

  function escapeHtml(value) {
    return text(value, "").replace(/[&<>'"]/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" }[char];
    });
  }

  function formatDate(value) {
    if (!value) return "-";
    try {
      return new Intl.DateTimeFormat("id-ID", {
        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
      }).format(new Date(value));
    } catch (error) { return String(value); }
  }

  function numberText(value) {
    if (value === null || value === undefined || value === "") return "-";
    const n = Number(value);
    if (!Number.isFinite(n)) return text(value);
    return n.toLocaleString("id-ID", { maximumFractionDigits: 3 });
  }

  function normalizeStatus(status) {
    const raw = text(status, "").toUpperCase();
    const map = {
      ACTIVE: "Aktif",
      RUNNING: "Running",
      WAITING: "Menunggu Reaksi",
      TP1_HIT: "TP1 Hit",
      TP2_HIT: "TP2 Hit",
      TP3_HIT: "TP3 Hit",
      INVALID: "Invalid",
      FINISHED: "Selesai"
    };
    return map[raw] || text(status, "-");
  }

  function normalizeDirection(value) {
    const raw = text(value, "").toUpperCase();
    if (raw === "BUY") return "Buy";
    if (raw === "SELL") return "Sell";
    return text(value, "-");
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
    renderStatus("<strong>Belum Ada Data Kamar Study</strong><br/>Belum ada kajian aktif/running yang dipublikasikan untuk member.", "info");
  }

  function normalizeItem(item) {
    return {
      idZona: valueFrom(item, ["id_zona", "zone_id", "signal_id", "id"], "-"),
      title: valueFrom(item, ["setup_title", "title", "signal_title", "id_zona"], "Kamar Study"),
      description: valueFrom(item, ["setup_description", "analysis_note", "description", "notes", "market_logic"], "Kajian mengikuti data yang dipublikasikan admin."),
      pair: valueFrom(item, ["pair", "symbol", "instrument"], "Market"),
      timeframe: valueFrom(item, ["timeframe", "tf"], "-"),
      zoneType: valueFrom(item, ["jenis_zona", "zone_type", "type", "zona_type"], "-"),
      direction: valueFrom(item, ["skenario", "direction", "bias", "side", "entry_side"], "-"),
      status: valueFrom(item, ["status", "signal_status", "zone_status"], "-"),
      areaLow: valueFrom(item, ["area_low", "zone_low", "price_low", "entry_low"], null),
      areaHigh: valueFrom(item, ["area_high", "zone_high", "price_high", "entry_high"], null),
      invalidasi: valueFrom(item, ["invalidasi", "invalid_price", "invalidation_price", "sl", "stop_loss"], "-"),
      tp1: valueFrom(item, ["tp1", "take_profit_1"], "-"),
      tp2: valueFrom(item, ["tp2", "take_profit_2"], "-"),
      tp3: valueFrom(item, ["tp3", "take_profit_3"], "-"),
      runningPoint: valueFrom(item, ["running_point", "current_point"], null),
      maxPoint: valueFrom(item, ["max_running_point", "max_point"], null),
      updated: valueFrom(item, ["updated_at", "created_at", "published_at"], null)
    };
  }

  function renderFeed(items, sourceLabel) {
    const list = qs("#studyFeedList");
    if (!list) return;
    if (!items || !items.length) return renderEmpty();

    renderStatus("<strong>Data Kamar Study Aktif</strong><br/>Menampilkan kajian aktif yang dipublikasikan untuk member.", "info");

    list.innerHTML = items.map(function (raw) {
      const item = normalizeItem(raw);
      const area = item.areaLow !== null || item.areaHigh !== null ? numberText(item.areaLow) + " - " + numberText(item.areaHigh) : "-";
      const pointInfo = item.runningPoint !== null || item.maxPoint !== null
        ? `<div><span>Point</span><strong>${numberText(item.runningPoint)} / Max ${numberText(item.maxPoint)}</strong></div>`
        : "";

      return `
        <article class="study-card data-list-item">
          <div class="study-card-head">
            <div class="data-list-main">
              <h3>${escapeHtml(item.title)}</h3>
              <p class="study-note">${escapeHtml(item.description)}</p>
              <div class="study-meta">
                <span class="study-pill on">${escapeHtml(item.pair)}</span>
                <span class="study-pill">${escapeHtml(item.timeframe)}</span>
                <span class="study-pill">${escapeHtml(item.zoneType)}</span>
                <span class="study-pill">${escapeHtml(normalizeDirection(item.direction))}</span>
                <span class="study-pill">${escapeHtml(normalizeStatus(item.status))}</span>
              </div>
            </div>
          </div>
          <div class="study-levels">
            <div><span>Zona</span><strong>${escapeHtml(area)}</strong></div>
            <div><span>Invalidasi</span><strong>${escapeHtml(numberText(item.invalidasi))}</strong></div>
            <div><span>TP 1</span><strong>${escapeHtml(numberText(item.tp1))}</strong></div>
            <div><span>TP 2 / TP 3</span><strong>${escapeHtml(numberText(item.tp2))} / ${escapeHtml(numberText(item.tp3))}</strong></div>
            ${pointInfo}
          </div>
          <p class="study-note"><small>ID Zona: ${escapeHtml(item.idZona)} · Update: ${escapeHtml(formatDate(item.updated))}</small></p>
        </article>
      `;
    }).join("");
  }

  function applyFiltersToQuery(query, pair, timeframe, status) {
    if (pair) query = query.eq("pair", pair);
    if (timeframe) query = query.eq("timeframe", timeframe);
    if (status) query = query.eq("status", status);
    return query;
  }

  async function loadByRpc(pair, timeframe, status) {
    const { data, error } = await client().rpc("get_member_kamar_study_feed", {
      filter_pair: pair,
      filter_timeframe: timeframe,
      filter_status: status,
      result_limit: 20
    });
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  }

  async function loadDirectFallback(pair, timeframe, status) {
    let query = client()
      .from("signals")
      .select("id_zona,pair,timeframe,jenis_zona,skenario,area_high,area_low,tp1,tp2,tp3,invalidasi,status,running_point,max_running_point,setup_title,setup_description,visibility,is_active,is_published,finished_at,created_at,updated_at,display_order")
      .eq("is_active", true)
      .eq("is_published", true)
      .is("finished_at", null)
      .in("visibility", ["member", "public"])
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(20);

    query = applyFiltersToQuery(query, pair, timeframe, status);
    const { data, error } = await query;
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  }

  async function loadFeed() {
    const list = qs("#studyFeedList");
    if (list) list.innerHTML = "";
    renderStatus("<strong>Memuat Data</strong><br/>Mengambil feed Kamar Study dari Supabase...", "info");

    const pair = qs("#studyFilterPair") ? qs("#studyFilterPair").value || null : null;
    const timeframe = qs("#studyFilterTimeframe") ? qs("#studyFilterTimeframe").value || null : null;
    const status = qs("#studyFilterStatus") ? qs("#studyFilterStatus").value || null : null;

    let data = [];
    let rpcError = null;

    try {
      data = await loadByRpc(pair, timeframe, status);
    } catch (error) {
      rpcError = error;
      console.warn("[Kamar Study] RPC feed gagal, mencoba direct fallback:", error);
    }

    if (!data.length) {
      try {
        data = await loadDirectFallback(pair, timeframe, status);
      } catch (fallbackError) {
        if (rpcError) throw new Error((rpcError.message || "RPC gagal") + " | Fallback gagal: " + (fallbackError.message || fallbackError));
        throw fallbackError;
      }
    }

    renderFeed(data);
  }

  async function initStudyPage() {
    if (!qs("#studyFeedList")) return;
    try {
      if (!window.KamarAuth) throw new Error("KamarAuth belum dimuat.");
      const auth = await window.KamarAuth.requireAuth("member");
      if (!auth || !auth.profile) return;

      const access = await getAccess(auth.profile.id);
      if (!isAllowed(auth.profile, access)) return;
      await loadFeed();
    } catch (error) {
      console.error("[Kamar Study]", error);
      renderStatus("<strong>Gagal Memuat Kamar Study</strong><br/>" + escapeHtml(error.message || "Silakan refresh halaman atau login ulang."), "error");
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    const refresh = qs("#studyRefreshBtn");
    if (refresh) refresh.addEventListener("click", function () {
      loadFeed().catch(function (error) {
        renderStatus("<strong>Gagal Memuat Data</strong><br/>" + escapeHtml(error.message || "Silakan coba lagi."), "error");
      });
    });

    ["#studyFilterPair", "#studyFilterTimeframe", "#studyFilterStatus"].forEach(function (selector) {
      const el = qs(selector);
      if (el) el.addEventListener("change", function () {
        loadFeed().catch(function (error) {
          renderStatus("<strong>Gagal Memuat Data</strong><br/>" + escapeHtml(error.message || "Silakan coba lagi."), "error");
        });
      });
    });

    initStudyPage();
  });
})();
