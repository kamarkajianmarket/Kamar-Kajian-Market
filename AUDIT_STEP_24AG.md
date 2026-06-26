# AUDIT STEP 24AG — EA Website Payload Standard

## Tujuan

Membuat jalur awal agar EA MT5 bisa mengirim update Kamar Study ke website melalui API server-side.

## File Ditambahkan

1. `api/kamar-study-update.js`
   - Endpoint POST untuk menerima update EA.
   - Validasi token `X-Kamar-EA-Token`.
   - Update/insert data ke tabel `signals` via Supabase REST menggunakan service role dari Vercel Environment Variable.
   - Normalisasi status zona: Fresh / Active / Invalid.
   - Normalisasi progress: HIT Target Kajian 1-3, HIT Target Lanjutan 1-3, HIT Invalidasi.
   - Konversi pips EA ke point website: `point = pips / 10`.

2. `vercel.json`
   - Menetapkan runtime Node.js 20 untuk API function.

3. `API_EA_PAYLOAD_STANDARD_STEP_24AG.md`
   - Dokumentasi payload final EA ke website.

## Konsep yang Dikunci

- Telegram tetap menggunakan bahasa kajian.
- Website tidak menerima teks Telegram mentah, tetapi JSON terstruktur.
- EA pips dikonversi menjadi Website Point dengan rumus `10 Pips = 1.00 Point`.
- `running_point` = Running Actual.
- `max_running_point` = Running Terjauh.
- Profit berwarna hijau dan loss berwarna merah tetap mengikuti frontend Step 24AE/24AF.

## Catatan Keamanan

- `SUPABASE_SERVICE_ROLE_KEY` tidak boleh masuk frontend atau EA.
- Key tersebut wajib disimpan di Vercel Environment Variable.
- EA hanya memakai token khusus `KAMAR_EA_API_TOKEN`.
