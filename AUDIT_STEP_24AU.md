# AUDIT STEP 24AU — Signal Hiatus & Website Focus Cleanup

Keputusan terbaru: project signal live website dihentikan sementara. Website difokuskan sebagai pusat informasi komunitas, pusat pendaftaran Kamar Study berbasis Telegram, pusat fasilitas, dan pusat pembayaran.

## Perubahan utama
- Menghapus tampilan card signal dari halaman publik `index.html`.
- Mengganti section Kamar Study publik menjadi informasi fasilitas + CTA daftar/login/admin Telegram.
- Menghapus card signal live dari dashboard member.
- Mengganti halaman `member-study.html` menjadi halaman informasi Kamar Study dan CTA pendaftaran/perpanjangan.
- Menonaktifkan fetch signal pada `kamar-member-dashboard.js` dan `kamar-member-study.js`.
- Mengganti `admin-study-control.html` menjadi halaman notice hiatus signal live.
- Menghapus link `Kamar Study Control` dari sidebar admin agar tidak membingungkan.

## Catatan
API signal masih berada di folder `/api` tetapi tidak lagi ditampilkan di UI website. Jika nanti fitur signal ingin dibangun ulang, disarankan dibuat dari desain arsitektur baru, bukan melanjutkan patch lama.
