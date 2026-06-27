# AUDIT STEP 24AO — Fresh Guard, Live Feed, Public Filters, Real Recap

Perubahan utama:
- Public Kamar Study memakai filter tab ALL/Fresh/Running/Rekap/Riwayat tanpa pindah halaman.
- Public homepage auto-refresh setiap 30 detik, pause saat tab tidak aktif.
- Card utama menampilkan Harga Saat Ini, Running Actual, Running Terjauh, dan efek live pulse saat data berubah.
- Rekap dan Riwayat Kajian publik mengambil data real dari Supabase.
- Member dashboard menampilkan card utama Kamar Study terdekat dengan Harga Saat Ini dan auto-refresh 30 detik.
- Member Study auto-refresh 30 detik dan menampilkan Harga Saat Ini.
- API menolak NEW_ZONE yang sudah touched/tidak fresh/invalid berdasarkan payload EA.
- API menjaga max_running_point tidak turun.
