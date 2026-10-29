import { createClient } from 'npm:@supabase/supabase-js@2'

// Kamar Signal Telegram Personalized dispatcher (additive-only, mirrors
// kamar-signal-push-dispatch in structure/eligibility, beda channel saja).
// Dipanggil server-to-server oleh kamar-signal-ingest, fire-and-forget. Kalau gagal,
// pipeline sinyal utama TIDAK terpengaruh sama sekali.
//
// Pakai nama secret KAMAR_TELEGRAM_BOT_TOKEN (bukan TELEGRAM_BOT_TOKEN yang sudah ada
// dari setup lama) supaya tidak bentrok dengan apapun yang masih memakai secret lama itu.
//
// Eligibility: member_access.access_kamar_study aktif + belum expired, DAN
// notification_prefs.telegram_enabled true (default true), DAN member_profiles.telegram_chat_id terisi.
//
// LOCKED event classification (2026-08-14): NEW_ZONE (Signal FRESH baru) -- semua member eligible.
// Event lain tidak mengirim pesan Telegram, KECUALI target di bawah ini.
//
// 2026-10-29 (EA v2.14): notifikasi per target, OPT-IN per member.
//   TP1_HIT..TP3_HIT, HOLD1_HIT..HOLD3_HIT hanya dikirim ke member yang
//   notification_prefs.notify_tp1..notify_hold3 (sesuai target yang terjadi) = true
//   (bawaan false, jadi tanpa pilihan member tidak ada pesan baru) DAN telegram_enabled bukan false.
//   Dikirim sekali per event: kamar-signal-ingest hanya memanggil dispatcher untuk event_id baru.
//
// 2026-09-04: message text also includes the zone width in Pips (area_high - area_low, *10).

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const KAMAR_SIGNAL_API_KEY = Deno.env.get('KAMAR_SIGNAL_API_KEY') ?? ''
const TELEGRAM_BOT_TOKEN = Deno.env.get('KAMAR_TELEGRAM_BOT_TOKEN') ?? ''
const SITE_BASE_URL = Deno.env.get('SITE_BASE_URL') ?? 'https://www.kamarkajianmarket.com'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-kamar-signal-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// event_type -> [kolom notification_prefs, label]
const TARGET_EVENTS: Record<string, [string, string]> = {
  TP1_HIT: ['notify_tp1', 'TP 1'],
  TP2_HIT: ['notify_tp2', 'TP 2'],
  TP3_HIT: ['notify_tp3', 'TP 3'],
  HOLD1_HIT: ['notify_hold1', 'Hold 1'],
  HOLD2_HIT: ['notify_hold2', 'Hold 2'],
  HOLD3_HIT: ['notify_hold3', 'Hold 3'],
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } })
}

function str(v: unknown, fallback = ''): string {
  if (v === null || v === undefined) return fallback
  return String(v).trim()
}

async function sendTelegramMessage(chatId: number, text: string): Promise<{ ok: boolean; blocked: boolean }> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    })
    if (res.ok) return { ok: true, blocked: false }
    const errBody = await res.json().catch(() => ({}))
    const desc = str((errBody as any).description).toLowerCase()
    const blocked = res.status === 403 || desc.indexOf('blocked') !== -1 || desc.indexOf('chat not found') !== -1 || desc.indexOf('deactivated') !== -1
    return { ok: false, blocked }
  } catch (_e) {
    return { ok: false, blocked: false }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') return json({ ok: false, message: 'Method tidak didukung.' }, 405)

  const token = req.headers.get('x-kamar-signal-key') || ''
  if (!KAMAR_SIGNAL_API_KEY || token !== KAMAR_SIGNAL_API_KEY) {
    return json({ ok: false, message: 'Token tidak valid.' }, 401)
  }

  let body: any
  try {
    body = await req.json()
  } catch (_e) {
    return json({ ok: false, message: 'Body bukan JSON yang valid.' }, 400)
  }

  const eventType = str(body.event_type).toUpperCase()
  const idZona = str(body.id_zona)
  if (!idZona) return json({ ok: false, message: 'id_zona wajib diisi.' }, 400)

  const isNew = eventType === 'NEW_ZONE'
  const target = TARGET_EVENTS[eventType]
  if (!isNew && !target) {
    return json({ ok: true, skipped: true, reason: 'event_type tidak memicu notifikasi Telegram.' })
  }

  if (!TELEGRAM_BOT_TOKEN) {
    return json({ ok: true, skipped: true, reason: 'KAMAR_TELEGRAM_BOT_TOKEN belum dikonfigurasi di server.' })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const nowIso = new Date().toISOString()

  let claimed: any = null
  if (isNew) {
    try {
      const { data } = await supabase.from('signals')
        .update({ new_telegram_sent_at: nowIso })
        .eq('id_zona', idZona)
        .is('new_telegram_sent_at', null)
        .select('id_zona,pair,timeframe,skenario,jenis_zona,area_low,area_high')
        .maybeSingle()
      claimed = data
    } catch (e) {
      return json({ ok: false, message: `Gagal klaim status Telegram: ${(e as Error).message}` }, 500)
    }
    if (!claimed) {
      return json({ ok: true, skipped: true, reason: 'Sudah pernah dikirim sebelumnya, atau signal tidak ditemukan.' })
    }
  } else {
    const { data } = await supabase.from('signals')
      .select('id_zona,pair,timeframe,skenario,jenis_zona,area_low,area_high')
      .eq('id_zona', idZona)
      .maybeSingle()
    claimed = data
    if (!claimed) return json({ ok: true, skipped: true, reason: 'Signal tidak ditemukan.' })
  }

  const pair = str(claimed.pair, 'Signal')
  const tf = str(claimed.timeframe)
  const dirText = str(claimed.skenario).toUpperCase()
  let title: string
  let bodyText: string
  if (isNew) {
    let zoneText = ''
    if (claimed.area_low !== null && claimed.area_low !== undefined && claimed.area_high !== null && claimed.area_high !== undefined) {
      const pipsVal = Math.abs(Number(claimed.area_high) - Number(claimed.area_low)) * 10
      if (!Number.isNaN(pipsVal)) zoneText = ' — Zona ' + pipsVal.toFixed(1) + ' Pips'
    }
    title = 'Signal Baru: ' + pair
    bodyText = 'Ada kajian baru di ' + pair + (tf ? ' (' + tf + ')' : '') + zoneText + '. Cek detailnya sekarang.'
  } else {
    title = target[1] + ' Tercapai: ' + pair
    bodyText = 'Signal ' + pair + (tf ? ' (' + tf + ')' : '') + (dirText ? ' ' + dirText : '') + ' mencapai ' + target[1] + '. Cek detailnya sekarang.'
  }
  const url = SITE_BASE_URL.replace(/\/$/, '') + '/signal/id/' + encodeURIComponent(idZona)
  const messageText = title + '\n' + bodyText + '\n' + url

  const { data: accessRows } = await supabase
    .from('member_access')
    .select('profile_id')
    .eq('access_kamar_study', true)
    .gt('expires_kamar_study', nowIso)

  if (!accessRows || !accessRows.length) {
    return json({ ok: true, sent: 0, reason: 'Tidak ada member dengan akses aktif saat ini.' })
  }
  const eligibleProfileIds = accessRows.map((r: any) => r.profile_id)

  let finalProfileIds: string[]
  if (isNew) {
    const { data: enabledPrefsRows } = await supabase
      .from('notification_prefs')
      .select('profile_id')
      .in('profile_id', eligibleProfileIds)
      .eq('telegram_enabled', true)

    // Member tanpa baris notification_prefs dianggap default ON (telegram_enabled default true).
    const enabledIds = new Set((enabledPrefsRows || []).map((r: any) => r.profile_id))
    const { data: allPrefsRows } = await supabase
      .from('notification_prefs')
      .select('profile_id')
      .in('profile_id', eligibleProfileIds)
    const hasAnyPrefRow = new Set((allPrefsRows || []).map((r: any) => r.profile_id))
    finalProfileIds = eligibleProfileIds.filter((id: string) => enabledIds.has(id) || !hasAnyPrefRow.has(id))
  } else {
    // Target TP/Hold: wajib dipilih eksplisit oleh member (notify_* = true) dan Telegram tidak dimatikan.
    const { data: targetRows } = await supabase
      .from('notification_prefs')
      .select('profile_id')
      .in('profile_id', eligibleProfileIds)
      .eq('telegram_enabled', true)
      .eq(target[0], true)
    finalProfileIds = (targetRows || []).map((r: any) => r.profile_id)
  }

  if (!finalProfileIds.length) {
    return json({ ok: true, sent: 0, reason: 'Tidak ada member yang mengaktifkan notifikasi Telegram untuk kategori ini.' })
  }

  const { data: profiles } = await supabase
    .from('member_profiles')
    .select('id, telegram_chat_id')
    .in('id', finalProfileIds)
    .not('telegram_chat_id', 'is', null)

  if (!profiles || !profiles.length) {
    return json({ ok: true, sent: 0, reason: 'Tidak ada member yang menghubungkan Telegram.' })
  }

  let sent = 0
  let failed = 0
  const blockedProfileIds: string[] = []

  await Promise.all(profiles.map(async (p: any) => {
    const result = await sendTelegramMessage(p.telegram_chat_id, messageText)
    if (result.ok) {
      sent++
    } else {
      failed++
      if (result.blocked) blockedProfileIds.push(p.id)
    }
  }))

  if (blockedProfileIds.length) {
    await supabase.from('member_profiles')
      .update({ telegram_chat_id: null, telegram_connected_at: null })
      .in('id', blockedProfileIds)
  }

  return json({ ok: true, sent, failed, unlinked: blockedProfileIds.length })
})
