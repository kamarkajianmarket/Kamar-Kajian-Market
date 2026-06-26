# AUDIT STEP 24AG REV2 — Vercel Runtime Config Fix

Perbaikan:
- Menambahkan `vercel.json` minimal `{ "version": 2 }` untuk menimpa konfigurasi lama yang masih tersimpan di GitHub.
- Tidak memakai konfigurasi `functions.runtime` karena menyebabkan error Vercel: `Function Runtimes must have a valid version`.
- Endpoint API tetap: `/api/kamar-study-update`.
- Payload EA dan konversi pips ke point tetap mengikuti Step 24AG.

Catatan upload:
- Pastikan file `vercel.json` lama di GitHub tertimpa oleh file ini.
- Jika GitHub masih menyimpan file `vercel.json` lama dengan isi `runtime`, hapus file tersebut atau replace dengan isi minimal ini.
