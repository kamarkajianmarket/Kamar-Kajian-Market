module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }

  try {
    var supabaseUrl = process.env.KAMAR_SUPABASE_URL || process.env.SUPABASE_URL || '';
    var supabaseAnonKey = process.env.KAMAR_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(500).json({ ok: false, message: 'Config server belum siap (env Supabase kosong)' });
    }

    var authHeader = req.headers['authorization'] || '';
    var token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) {
      return res.status(401).json({ ok: false, message: 'Token login tidak ada' });
    }

    var userId = req.query && req.query.user_id;
    if (!userId) {
      return res.status(400).json({ ok: false, message: 'user_id wajib diisi' });
    }

    // Query GABUNGAN (profile + access via PostgREST embed) dilakukan DARI SERVER Vercel,
    // BUKAN dari HP pengguna -- ini dibuat 2026-08-24 karena permintaan yang SAMA PERSIS
    // kalau dikirim langsung dari sebagian device iOS (iPhone/iPad tertentu) terbukti
    // bisa macet total tanpa batas waktu (bug WebKit/iOS network-level, sudah diselidiki
    // sangat mendalam -- lihat memory project_kamar_ios_signal_login_hang_fix). Server ke
    // server (Vercel ke Supabase) tidak melalui WebKit sama sekali, jadi seharusnya aman.
    var select = 'id,account_status,full_name,email,telegram_chat_id,member_access(access_kamar_study,locked_by_expired,expires_kamar_study,activation_source)';
    var url = supabaseUrl + '/rest/v1/member_profiles?select=' + encodeURIComponent(select) + '&user_id=eq.' + encodeURIComponent(userId);

    var supaRes = await fetch(url, {
      method: 'GET',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: 'Bearer ' + token
      }
    });
    var text = await supaRes.text();
    res.status(supaRes.status);
    res.setHeader('Content-Type', 'application/json');
    return res.send(text);
  } catch (err) {
    return res.status(500).json({ ok: false, message: 'Error server: ' + (err && err.message) });
  }
};
