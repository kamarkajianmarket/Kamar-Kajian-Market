/**
 * Kamar Kajian Market — EA Study Update API
 * Step 24AG
 *
 * Endpoint: POST /api/kamar-study-update
 * Runtime: Vercel Serverless Function / Node.js 18+
 *
 * Required environment variables in Vercel:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - KAMAR_EA_API_TOKEN
 *
 * IMPORTANT:
 * - Do not expose SUPABASE_SERVICE_ROLE_KEY in frontend code or inside MT5 EA.
 * - EA only sends KAMAR_EA_API_TOKEN to this API endpoint.
 */

const ALLOWED_STATUS = new Set(["FRESH", "ACTIVE", "INVALID"]);

function send(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function asString(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return String(value).trim();
}

function asNumber(value, fallback = null) {
  if (value === null || value === undefined || value === "") return fallback;
  const n = Number(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
}

function round2(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100) / 100;
}

function pipsToPoint(value) {
  const n = asNumber(value, null);
  if (n === null) return null;
  return round2(n / 10);
}

function normalizeStatus(input, payload) {
  const raw = asString(input || payload.zoneStatus || payload.jenis_zona_status || payload.status, "").toUpperCase();
  if (raw === "AKTIF") return "ACTIVE";
  if (raw === "VALID" || raw === "BARU" || raw === "FRESH") return "FRESH";
  if (raw === "INVALID" || raw === "INVALIDASI" || raw === "TERINVALIDASI") return "INVALID";
  if (ALLOWED_STATUS.has(raw)) return raw;

  const progress = asString(payload.progress_update || payload.progress_label || payload.update, "").toLowerCase();
  if (progress.includes("invalid")) return "INVALID";
  if (payload.price_entered_area_at || payload.current_price || payload.running_pips || payload.running_actual_pips) return "ACTIVE";
  return "FRESH";
}

function normalizeProgressCode(value) {
  const raw = asString(value, "");
  const key = raw.toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");

  let m = key.match(/target_?kajian_?([123])/);
  if (m) return `target_kajian_${m[1]}`;

  m = key.match(/target_?lanjutan_?([123])/);
  if (m) return `target_lanjutan_${m[1]}`;

  m = key.match(/\btp_?([123])\b/);
  if (m) return `target_kajian_${m[1]}`;

  m = key.match(/\bhold_?([123])\b/);
  if (m) return `target_lanjutan_${m[1]}`;

  if (key.includes("invalidasi") || key.includes("cut_loss") || key.includes("invalid")) return "invalidasi";
  return "";
}

function progressLabelFromCode(code) {
  const key = asString(code, "").toLowerCase();
  let m = key.match(/target_kajian_([123])/);
  if (m) return `HIT Target Kajian ${m[1]}`;
  m = key.match(/target_lanjutan_([123])/);
  if (m) return `HIT Target Lanjutan ${m[1]}`;
  if (key === "invalidasi" || key === "hit_invalidasi") return "HIT Invalidasi";
  return "";
}

function highestTargetLevel(progressCode, existingLevel = 0) {
  const key = asString(progressCode, "").toLowerCase();
  const m = key.match(/target_kajian_([123])/);
  if (!m) return Number(existingLevel || 0);
  return Math.max(Number(existingLevel || 0), Number(m[1]));
}

function highestLanjutanLevel(progressCode, existingLevel = 0) {
  const key = asString(progressCode, "").toLowerCase();
  const m = key.match(/target_lanjutan_([123])/);
  if (!m) return Number(existingLevel || 0);
  return Math.max(Number(existingLevel || 0), Number(m[1]));
}

function normalizePayload(body) {
  const now = new Date().toISOString();
  const idZona = asString(body.id_zona || body.zone_id || body.idZona);
  if (!idZona) throw new Error("id_zona wajib dikirim oleh EA.");

  const pair = asString(body.pair || body.symbol, "XAUUSD").toUpperCase();
  const timeframe = asString(body.timeframe || body.tf, "-").toUpperCase();
  const scenario = asString(body.scenario || body.skenario || body.direction, "").toUpperCase();
  const isBuy = scenario.includes("BUY") || idZona.toLowerCase().includes("/buy/");
  const jenisZona = asString(body.jenis_zona || body.zone_type, isBuy ? "Demand" : "Supply");

  const runningPips = asNumber(body.running_pips ?? body.running_actual_pips ?? body.hasil_pips, null);
  const maxRunningPips = asNumber(body.max_running_pips ?? body.running_terjauh_pips ?? body.best_pips ?? runningPips, null);

  const runningPoint = body.running_actual !== undefined
    ? round2(asNumber(body.running_actual, 0))
    : pipsToPoint(runningPips);
  const maxRunningPoint = body.running_terjauh !== undefined
    ? round2(asNumber(body.running_terjauh, 0))
    : pipsToPoint(maxRunningPips);

  const progressCode = normalizeProgressCode(body.progress_update || body.progress_code || body.progress_label || body.update_perkembangan || body.last_update);
  const progressLabel = asString(body.progress_label || progressLabelFromCode(progressCode), "");
  const zoneStatus = normalizeStatus(body.zone_status || body.status_zona || body.status, { ...body, progress_update: progressCode });

  const currentPrice = asNumber(body.current_price || body.harga_berjalan || body.price, null);
  const visibility = asString(body.visibility || body.website_visibility, "member").toLowerCase() === "public" ? "public" : "member";

  return {
    now,
    idZona,
    pair,
    timeframe,
    scenario: scenario || (isBuy ? "BUY" : "SELL"),
    jenisZona,
    zoneStatus,
    visibility,
    currentPrice,
    progressCode,
    progressLabel,
    runningPips,
    maxRunningPips,
    runningPoint: runningPoint ?? 0,
    maxRunningPoint: maxRunningPoint ?? runningPoint ?? 0,
    areaHigh: asNumber(body.area_high ?? body.zone_top ?? body.area_kajian_high, null),
    areaLow: asNumber(body.area_low ?? body.zone_bottom ?? body.area_kajian_low, null),
    tp1: asNumber(body.target_kajian_1 ?? body.tp1, null),
    tp2: asNumber(body.target_kajian_2 ?? body.tp2, null),
    tp3: asNumber(body.target_kajian_3 ?? body.tp3, null),
    invalidasi: asNumber(body.invalidasi ?? body.invalidasi_skenario ?? body.cut_loss, null),
    targetLanjutan1: asNumber(body.target_lanjutan_1 ?? body.hold1, null),
    targetLanjutan2: asNumber(body.target_lanjutan_2 ?? body.hold2, null),
    targetLanjutan3: asNumber(body.target_lanjutan_3 ?? body.hold3, null),
    raw: body,
  };
}

async function supabaseFetch(path, options = {}) {
  const url = `${process.env.SUPABASE_URL}/rest/v1/${path}`;
  const headers = {
    apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
    ...(options.headers || {}),
  };
  const response = await fetch(url, { ...options, headers });
  const text = await response.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch (_) { json = text; }
  if (!response.ok) {
    const message = typeof json === "object" && json && (json.message || json.details)
      ? `${json.message || "Supabase error"}${json.details ? ` — ${json.details}` : ""}`
      : text || `Supabase request failed: ${response.status}`;
    throw new Error(message);
  }
  return json;
}

function buildSourcePayload(normalized, previousPayload = {}) {
  return {
    ...(previousPayload || {}),
    source: "ea",
    source_name: "Kamar Signal Advisor v2.05",
    progress_update: normalized.progressCode || previousPayload.progress_update || "",
    progress_label: normalized.progressLabel || previousPayload.progress_label || "",
    progress_updated_at: normalized.progressCode ? normalized.now : previousPayload.progress_updated_at || null,
    running_pips: normalized.runningPips,
    max_running_pips: normalized.maxRunningPips,
    pips_to_point_formula: "website_point = ea_pips / 10",
    target_lanjutan_1: normalized.targetLanjutan1,
    target_lanjutan_2: normalized.targetLanjutan2,
    target_lanjutan_3: normalized.targetLanjutan3,
    last_ea_payload: normalized.raw,
    last_ea_update_at: normalized.now,
  };
}

function buildSignalPatch(normalized, previous = {}) {
  const patch = {
    pair: normalized.pair,
    timeframe: normalized.timeframe,
    jenis_zona: normalized.jenisZona,
    skenario: normalized.scenario,
    status: normalized.zoneStatus,
    visibility: normalized.visibility,
    is_active: true,
    is_published: true,
    current_price: normalized.currentPrice,
    running_point: normalized.runningPoint,
    max_running_point: normalized.maxRunningPoint,
    updated_at: normalized.now,
  };

  if (normalized.areaHigh !== null) patch.area_high = normalized.areaHigh;
  if (normalized.areaLow !== null) patch.area_low = normalized.areaLow;
  if (normalized.tp1 !== null) patch.tp1 = normalized.tp1;
  if (normalized.tp2 !== null) patch.tp2 = normalized.tp2;
  if (normalized.tp3 !== null) patch.tp3 = normalized.tp3;
  if (normalized.invalidasi !== null) patch.invalidasi = normalized.invalidasi;

  const previousPayload = previous.source_payload && typeof previous.source_payload === "object" ? previous.source_payload : {};
  patch.source_payload = buildSourcePayload(normalized, previousPayload);

  if (normalized.zoneStatus === "ACTIVE" && !previous.price_entered_area_at) {
    patch.price_entered_area_at = normalized.now;
    patch.first_reaction_at = previous.first_reaction_at || normalized.now;
  }

  if (normalized.zoneStatus === "INVALID" || normalized.progressCode === "invalidasi") {
    patch.status = "INVALID";
    patch.invalidated_at = previous.invalidated_at || normalized.now;
    patch.finished_at = previous.finished_at || normalized.now;
    patch.invalidation_reason = "HIT Invalidasi dari EA Kamar Signal Advisor.";
    patch.finish_reason = "Zona selesai karena invalidasi dari EA.";
  }

  const targetLevel = highestTargetLevel(normalized.progressCode, previous.tp_hit_level);
  if (targetLevel > 0) {
    patch.tp_hit_level = targetLevel;
    patch.farthest_tp_level = Math.max(Number(previous.farthest_tp_level || 0), targetLevel);
    if (targetLevel >= 1) patch.tp1_hit_at = previous.tp1_hit_at || normalized.now;
    if (targetLevel >= 2) patch.tp2_hit_at = previous.tp2_hit_at || normalized.now;
    if (targetLevel >= 3) patch.tp3_hit_at = previous.tp3_hit_at || normalized.now;
  }

  const lanjutanLevel = highestLanjutanLevel(normalized.progressCode, previous.farthest_tp_level);
  if (lanjutanLevel > 0) {
    patch.farthest_tp_level = Math.max(Number(patch.farthest_tp_level || previous.farthest_tp_level || 0), lanjutanLevel);
  }

  return patch;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return send(res, 405, { ok: false, message: "Method tidak valid. Gunakan POST." });
    }

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.KAMAR_EA_API_TOKEN) {
      return send(res, 500, { ok: false, message: "Environment variable API belum lengkap." });
    }

    const token = req.headers["x-kamar-ea-token"] || req.headers["authorization"]?.replace(/^Bearer\s+/i, "") || req.body?.api_token;
    if (!token || token !== process.env.KAMAR_EA_API_TOKEN) {
      return send(res, 401, { ok: false, message: "Token EA tidak valid." });
    }

    const normalized = normalizePayload(req.body || {});

    const existingRows = await supabaseFetch(
      `signals?select=id,id_zona,source_payload,tp_hit_level,farthest_tp_level,tp1_hit_at,tp2_hit_at,tp3_hit_at,price_entered_area_at,first_reaction_at,invalidated_at,finished_at&id_zona=eq.${encodeURIComponent(normalized.idZona)}&limit=1`,
      { method: "GET" }
    );
    const existing = Array.isArray(existingRows) && existingRows.length ? existingRows[0] : null;
    const patch = buildSignalPatch(normalized, existing || {});

    let saved;
    if (existing && existing.id) {
      saved = await supabaseFetch(`signals?id=eq.${encodeURIComponent(existing.id)}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
    } else {
      const insertPayload = {
        ...patch,
        id_zona: normalized.idZona,
        setup_title: `${normalized.pair} ${normalized.timeframe} ${normalized.jenisZona} ${normalized.scenario}`,
        setup_description: "Update otomatis dari EA Kamar Signal Advisor.",
        source_type: "admin",
        created_at: normalized.now,
      };
      saved = await supabaseFetch("signals", {
        method: "POST",
        body: JSON.stringify(insertPayload),
      });
    }

    return send(res, 200, {
      ok: true,
      message: existing ? "Signal website berhasil diupdate." : "Signal website berhasil dibuat.",
      id_zona: normalized.idZona,
      status: patch.status,
      progress_update: normalized.progressCode,
      progress_label: normalized.progressLabel,
      running_actual_point: patch.running_point,
      running_terjauh_point: patch.max_running_point,
      saved,
    });
  } catch (error) {
    return send(res, 400, { ok: false, message: error.message || "Gagal memproses update EA." });
  }
}
