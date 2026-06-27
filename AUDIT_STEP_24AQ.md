# AUDIT STEP 24AQ — Global Price Sync & Stale Signal Cleanup

Perbaikan:
1. Harga Saat Ini per pair sekarang disamakan dari update EA terbaru untuk pair yang sama, sehingga BTCUSD tidak tampil dengan dua harga berbeda di card Fresh dan Running.
2. Card live public hanya menampilkan signal yang masih mendapat update EA terbaru dalam rentang live window. Signal lama yang tidak lagi dipantau EA tidak muncul sebagai card utama.
3. API akan menyembunyikan Fresh lama pada pair/feed yang sama saat NEW_ZONE baru diterima, agar signal lama tidak terus tampil di public/member feed.
4. Blok Update Perkembangan yang duplikat dengan status Fresh/Menunggu Harga Masuk tidak ditampilkan lagi.

Catatan:
- Data lama tetap ada di Admin Study Control sebagai riwayat/admin, tetapi tidak lagi menjadi card utama jika tidak live/relevan.
- Untuk test real, EA tetap harus mengirim heartbeat/update harga ke endpoint Vercel app.
