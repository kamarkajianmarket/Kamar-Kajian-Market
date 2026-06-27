# AUDIT STEP 24AJ — Website Standalone Diagnostic Fix

Perbaikan:
1. Admin Study Control refresh dibuat lebih jelas:
   - tombol menampilkan status Merefresh
   - toast setelah refresh
   - list Kamar Study diurutkan dari updated_at terbaru, bukan hanya created_at
2. API GET sekarang mengembalikan status aktif agar endpoint bisa dicek dari browser.
3. EA Step 24AJ menambahkan input test koneksi:
   - Website_Send_Test_On_Start
   - jika true, EA mengirim 1 payload dummy NEW_ZONE untuk memastikan jalur MT5 → API → Supabase hidup.

Catatan:
- Telegram tetap boleh OFF.
- Test payload hanya untuk diagnosis; setelah berhasil, kembalikan Website_Send_Test_On_Start=false.
