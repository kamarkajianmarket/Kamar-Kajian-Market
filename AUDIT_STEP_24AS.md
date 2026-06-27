# AUDIT STEP 24AS — Fresh Send On Zone Lock + XAUUSD Distance Priority Fix

## Tujuan
Memperbaiki jalur Fresh signal agar zona yang baru terkunci di chart langsung masuk ke Admin Study Control/website sebelum berubah menjadi Active.

## Perubahan EA
- NEW_ZONE tidak lagi diblokir oleh touch cepat atau histori touch.
- Jarak harga tidak lagi membatalkan pengiriman Fresh.
- Ditambahkan metadata jarak:
  - distance_pips
  - distance_point
  - fresh_priority_pips_limit
  - fresh_priority_eligible
- Default prioritas XAUUSD: 100 pips = 10.00 point website.
- Jika zona sudah touched sangat cepat, EA mengirim Fresh lebih dulu lalu mengirim Active setelahnya.
- Diagnostic log ditambahkan:
  - Website Fresh zone locked
  - Website Fresh sent to website
  - Website Active sent after quick Fresh
  - Website Fresh skip duplicate/invalid

## Perubahan API
- API tidak lagi menolak NEW_ZONE hanya karena touched_before_website_send atau is_fresh_candidate=false.
- Touch cepat/jarak disimpan sebagai metadata, bukan alasan blok.
- Running Terjauh tetap memakai max lock, tidak turun.
- Duplicate const targetLevel diperbaiki.

## Perubahan Public Website
- Fresh utama diprioritaskan hanya jika masih dalam radius 100 pips / 10.00 point.
- Zona di luar radius tetap dapat tersimpan/admin, tapi tidak dijadikan Fresh utama public.

## Rule Final
1. Zona valid terkunci di chart → EA kirim NEW_ZONE/Fresh.
2. Harga masuk zona → update ke Active.
3. Jarak tidak memblokir data masuk.
4. Radius 100 pips hanya untuk prioritas tampil utama XAUUSD.
5. Running Actual boleh naik/turun.
6. Running Terjauh hanya naik/tetap.
