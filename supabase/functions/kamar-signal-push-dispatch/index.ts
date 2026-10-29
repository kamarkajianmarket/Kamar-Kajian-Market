import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

// Kamar Signal Push Notification dispatcher (V2, additive-only).
// Called server-to-server by kamar-signal-ingest right after it finishes its own
// existing work. This function NEVER changes signal business logic, NEVER blocks
// or affects the Website/PWA/Telegram/Timeline/unread pipeline, and if it fails
// for any reason, the caller simply ignores the failure (fire-and-forget).
//
// LOCKED event classification (updated 2026-08-14 per explicit user instruction):
//   Push-eligible : NEW_ZONE (Signal FRESH baru) -- ke semua member berhak yang notify_new = true.
//   Never push    : ZONE_ACTIVE, RUNNING_UPDATE, RR_1_1_REACHED, HIGH_RISK_WARNING,
//                   CRITICAL_ZONE_WARNING, HIT_INVALIDASI.
//
// 2026-10-29 (EA v2.14): notifikasi per target, OPT-IN per member.
//   TP1_HIT..TP3_HIT, HOLD1_HIT..HOLD3_HIT hanya dikirim ke member yang
//   notification_prefs.notify_tp1..notify_hold3 (sesuai target yang terjadi) = true
//   dan push_enabled = true. Bawaan kolom false, jadi member yang belum memilih
//   tidak menerima apa pun (perilaku lama tidak berubah).
//   Event ini dikirim sekali per event: kamar-signal-ingest hanya memanggil dispatcher
//   untuk event_id baru (duplikat dari EA tidak sampai ke sini).
//
// 2026-09-04: body text also includes the zone width in Pips (area_high - area_low, *10).

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const KAMAR_SIGNAL_API_KEY = Deno.env.get('KAMAR_SIGNAL_API_KEY') ?? ''
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') ?? ''
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:kamarkajianmarket@gmail.com'

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
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

function str(v: unknown, fallback = ''): string {
  if (v === null || v === undefined) return fallback
  return String(v).trim()
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
    return json({ ok: true, skipped: true, reason: 'event_type tidak memicu notifikasi.' })
  }

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    // VAPID belum dikonfigurasi -- no-op, tidak menganggap ini error fatal.
    return json({ ok: true, skipped: true, reason: 'VAPID belum dikonfigurasi di server.' })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const nowIso = new Date().toISOString()

  let claimed: any = null
  if (isNew) {
    try {
      const { data } = await supabase.from('signals')
        .update({ new_push_sent_at: nowIso })
        .eq('id_zona', idZona)
        .is('new_push_sent_at', null)
        .select('id_zona,pair,timeframe,skenario,jenis_zona,area_low,area_high')
        .maybeSingle()
      claimed = data
    } catch (e) {
      return json({ ok: false, message: `Gagal klaim status push: ${(e as Error).message}` }, 500)
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
  const url = '/signal/id/' + encodeURIComponent(idZona)

  const { data: accessRows } = await supabase
    .from('member_access')
    .select('profile_id')
    .eq('access_kamar_study', true)
    .gt('expires_kamar_study', nowIso)

  if (!accessRows || !accessRows.length) {
    return json({ ok: true, sent: 0, reason: 'Tidak ada member dengan akses aktif saat ini.' })
  }
  const eligibleProfileIds = accessRows.map((r: any) => r.profile_id)

  const prefColumn = isNew ? 'notify_new' : target[0]
  const { data: prefsRows } = await supabase
    .from('notification_prefs')
    .select('profile_id')
    .in('profile_id', eligibleProfileIds)
    .eq('push_enabled', true)
    .eq(prefColumn, true)

  if (!prefsRows || !prefsRows.length) {
    return json({ ok: true, sent: 0, reason: 'Tidak ada member yang mengaktifkan notifikasi untuk kategori ini.' })
  }
  const finalProfileIds = prefsRows.map((r: any) => r.profile_id)

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth_key')
    .in('profile_id', finalProfileIds)

  if (!subs || !subs.length) {
    return json({ ok: true, sent: 0, reason: 'Tidak ada perangkat terdaftar untuk notifikasi.' })
  }

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
  const payload = JSON.stringify({ title, body: bodyText, url })

  let sent = 0
  let failed = 0
  const staleIds: number[] = []

  await Promise.all(subs.map(async (s: any) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth_key } },
        payload,
      )
      sent++
    } catch (err: any) {
      failed++
      const statusCode = err && (err.statusCode || err.status)
      if (statusCode === 404 || statusCode === 410) {
        staleIds.push(s.id)
      }
    }
  }))

  if (staleIds.length) {
    await supabase.from('push_subscriptions').delete().in('id', staleIds)
  }

  return json({ ok: true, sent, failed, pruned: staleIds.length })
})
