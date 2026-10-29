import { createClient } from 'npm:@supabase/supabase-js@2'

// Kamar Signal Advisor EA v2.14 -> daftar signal yang sudah dikenal website (anti-ganda).
// Dipanggil lewat proxy api/kamar-signal.js saat body EA berisi kind="state".
// Hanya MEMBACA tabel signals; tidak menulis apa pun. Balasan:
//   {"ok":true,"state":"id_zona;BUY|SELL;area_high;area_low;tp_level;finished~..."}
// EA memakainya agar zona/signal yang sudah ada tidak diterbitkan dua kali setelah
// pasang ulang / VPS restart.

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const KAMAR_SIGNAL_API_KEY = Deno.env.get('KAMAR_SIGNAL_API_KEY') ?? ''

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-kamar-signal-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } })
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

  const pair = str(body.pair, 'XAUUSD').toUpperCase()
  const timeframe = str(body.timeframe).toUpperCase()
  if (!timeframe) return json({ ok: false, message: 'timeframe wajib diisi.' }, 400)

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const sinceIso = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString()

  const { data, error } = await supabase
    .from('signals')
    .select('id_zona, skenario, area_high, area_low, tp_hit_level, farthest_tp_level, status, finished_at')
    .eq('pair', pair)
    .eq('timeframe', timeframe)
    .eq('source_type', 'ea')
    .gte('updated_at', sinceIso)
    .order('updated_at', { ascending: false })
    .limit(500)

  if (error) return json({ ok: false, message: `Gagal baca signals: ${error.message}` }, 500)

  const rows = (data || []).map((r: any) => {
    const dir = str(r.skenario).toUpperCase() === 'BUY' ? 'BUY' : 'SELL'
    const tp = Math.max(Number(r.tp_hit_level || 0), Number(r.farthest_tp_level || 0))
    const finished = (str(r.status).toUpperCase() === 'INVALID' || r.finished_at) ? '1' : '0'
    return [str(r.id_zona), dir, r.area_high ?? 0, r.area_low ?? 0, tp, finished].join(';')
  })

  return json({ ok: true, state: rows.join('~'), count: rows.length })
})
