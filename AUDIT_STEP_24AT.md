# AUDIT STEP 24AT — Force Fresh Current TF Final Fix

## Tujuan
Memastikan zona Fresh masuk ke Admin Study Control dan website saat zona valid muncul pada chart MT5.

## Perubahan utama EA
1. Menambahkan input:
   - `Website_Force_Send_Fresh_Current_TF = true`
   - `Website_Max_Fresh_Per_Scan = 0`
2. Menambahkan fungsi:
   - `WebsiteForceSendFreshCurrentTF(reason)`
3. Fresh website tidak lagi bergantung pada antrean Telegram, alert distance, initial snapshot, atau filter zona lama.
4. Setelah `RebuildZones()`, EA langsung mengirim Fresh dari symbol/timeframe chart aktif sebelum proses Active/running.
5. Pada candle yang sama, EA tetap melakukan scan Fresh tertinggal sebelum lifecycle update.
6. Saat symbol/timeframe berubah, zona chart lama dan tracking website lokal dibersihkan.

## Logic final
- Zona Fresh valid pada chart aktif -> kirim `NEW_ZONE` ke website.
- Baru setelah itu harga masuk zona -> update `ZONE_ACTIVE`.
- Zona timeframe sebelumnya tidak ikut dipreserve/dikirim setelah timeframe MT5 diganti.
- Jarak harga tidak memblokir Fresh. Jarak hanya metadata/prioritas tampilan website.
- Running Actual boleh naik/turun.
- Running Terjauh hanya boleh naik/tetap.

## Log yang harus muncul di Experts
- `Website Fresh sent to website`
- `Website FORCE Fresh current TF scan`
- `Website update HTTP 200`
