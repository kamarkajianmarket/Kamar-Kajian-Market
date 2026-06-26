# AUDIT STEP 24AG REV1 — Vercel Runtime Config Fix

## Masalah
Deployment Vercel gagal dengan error:

`Function Runtimes must have a valid version`

Penyebab: konfigurasi `vercel.json` berisi runtime `nodejs20.x` yang tidak diterima oleh project/Vercel runtime saat deploy.

## Perbaikan
- `vercel.json` dihapus.
- Endpoint API tetap dipertahankan di `api/kamar-study-update.js`.
- Vercel akan memakai runtime default Node.js untuk Serverless Function.

## Endpoint Tetap
`POST /api/kamar-study-update`

## Environment Variable Tetap Diperlukan
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `KAMAR_EA_API_TOKEN`

## Catatan
Setelah upload ke GitHub, lakukan redeploy. Jika endpoint dibuka via browser dengan GET dan hasilnya `Method tidak valid. Gunakan POST.`, itu tanda endpoint sudah terbaca.
