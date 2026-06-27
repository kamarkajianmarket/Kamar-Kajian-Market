# AUDIT STEP 24AN — Publish Toggle & Public Feed Fix

## Tujuan
Memperbaiki alur Kamar Study setelah EA berhasil mengirim data ke Supabase:

1. Admin Study Control tidak lagi memakai dropdown Visibility tunggal.
2. Admin Study Control memiliki toggle ON/OFF eksplisit:
   - Tampilkan di Publik
   - Tampilkan di Member
   - Data Aktif
   - Published
3. Signal EA default tetap otomatis aktif dan published dari API.
4. Halaman publik utama membaca feed Kamar Study public dari Supabase secara dinamis.
5. Member Study membaca toggle member dari source_payload bila tersedia.

## Catatan Kompatibilitas
Untuk menghindari migrasi database, toggle publik/member disimpan di `source_payload`:

- `source_payload.show_public`
- `source_payload.show_member`
- `source_payload.visibility_mode`

Field lama `visibility` tetap dipertahankan sebagai fallback kompatibilitas.

## Rule Display
Signal tampil di halaman publik jika:

- `is_active = true`
- `is_published = true`
- `source_payload.show_public = true` atau fallback `visibility = public`

Signal tampil di member study jika:

- `is_active = true`
- `is_published = true`
- `source_payload.show_member = true` atau fallback `visibility = member`

## File Diubah
- `assets/js/kamar-admin-core.js`
- `assets/js/kamar-member-study.js`
- `api/kamar-study-update.js`
- `index.html`

## Status
Siap upload ke GitHub/Vercel.
