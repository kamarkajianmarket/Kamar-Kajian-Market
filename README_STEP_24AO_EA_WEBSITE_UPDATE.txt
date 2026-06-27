KAMAR SIGNAL ADVISOR v2.05 — STEP 24AO

Input penting:
- Website_Update_ON = true
- Website_API_URL = https://kamar-kajian-market.vercel.app/api/kamar-study-update
- Website_API_Token = token KAMAR_EA_API_TOKEN dari Vercel
- Website_Visibility = public atau member
- Website_Zone_ID_Prefix = KM-PUBLIC / KM-MEMBER
- Website_Send_New_Zone = true
- Website_Send_Progress = true
- Website_Price_Heartbeat_Seconds = 30
- Website_Send_Test_On_Start = false setelah test selesai

Wajib MT5:
Tools > Options > Expert Advisors > Allow WebRequest for listed URL:
https://kamar-kajian-market.vercel.app

Catatan:
- Telegram dibuat internal/OFF. Input utama yang dipakai adalah Website Update.
- NEW_ZONE ditolak jika zona sudah pernah disentuh harga.
- Price heartbeat memperbarui Harga Saat Ini, bukan membuat signal baru.
