# AUDIT STEP 24AL — API Environment Diagnostic Fix

Perbaikan:
- GET `/api/kamar-study-update` sekarang menampilkan status env tanpa membuka value rahasia.
- Response error payload menampilkan `missing_env` agar tidak menebak lagi.
- API mendukung alias env tambahan: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_SECRET_KEY`, `KAMAR_API_TOKEN` sebagai fallback.
- Tidak mengubah rule daily guard dan signal lifecycle.
