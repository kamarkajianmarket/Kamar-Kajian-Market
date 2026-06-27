# AUDIT STEP 24AK — Website Payload Fallback & Telegram Input Hide

## Tujuan
Memperbaiki kondisi EA berhasil HTTP 200 tetapi API hanya membalas status endpoint aktif, sehingga data dummy/signal belum masuk Supabase.

## Perubahan Website/API
- Endpoint `/api/kamar-study-update` tetap menerima POST normal.
- Ditambahkan fallback GET terstruktur untuk kondisi khusus MT5/domain redirect ketika POST terbaca sebagai GET.
- Fallback hanya aktif jika ada query `payload` dan token EA valid.
- Response API kini mengembalikan `transport`: `POST` atau `GET_FALLBACK`.

## Perubahan EA
- Ditambahkan fallback GET otomatis jika response POST hanya berisi pesan API aktif.
- Test start sekarang bisa benar-benar membuat dummy signal jika API fallback dipakai.
- Input Telegram/Channel/Report/Push disembunyikan dari tab input.
- Default internal Telegram dibuat OFF agar tidak membingungkan dan tidak mencoba kirim Telegram.
- Input website tetap tampil ringkas di section `03C. WEBSITE UPDATE`.

## Cara Test
1. Upload website Step 24AK ke GitHub dan tunggu Vercel Ready.
2. Pasang EA Step 24AK.
3. Set `Website_Send_Test_On_Start=true`.
4. Restart EA.
5. Cek Experts:
   - `Website update HTTP 200` lalu jika perlu `Website fallback GET HTTP 200`.
6. Refresh Admin Study Control.
7. Harus muncul ID zona prefix test, misalnya `KM-PUBLIC-TEST/...`.
