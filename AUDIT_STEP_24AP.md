# AUDIT STEP 24AP — Public Study Live Display Polish

## Fokus Perbaikan
- Harga Saat Ini dipindahkan ke samping nama pair/timeframe dengan ukuran besar.
- Chip kecil `Update` dihapus dari posisi lama.
- Update perkembangan dipindahkan ke blok besar agar lebih terlihat.
- Efek live/digital pulse ditambahkan untuk harga, running actual, running terjauh, dan perubahan card.
- Polling public feed diperkuat: interval 30 detik, refresh saat focus/pageshow/online, dan pause saat tab tidak aktif.
- Filter tab diperbaiki agar benar-benar membaca `data-study-card`.
- Member dashboard card diselaraskan dengan format Harga Saat Ini besar.

## Catatan
- Website tetap hemat request: polling 30 detik.
- Update hanya muncul otomatis jika EA/API sudah mengirim data baru ke Supabase.
- EA heartbeat tetap memakai Step 24AO.
