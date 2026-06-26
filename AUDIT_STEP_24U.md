# Step 24U - Login Email Only Copy Fix

Perubahan:
- Menghapus klaim login memakai ID member pada halaman member.html.
- Login tetap memakai email terdaftar + password.
- Pesan error non-email diperjelas.

Alasan:
Login memakai Member ID membutuhkan lookup aman di Supabase. Jika dibuat sembarangan, email member bisa terpapar lewat enumerasi Member ID.
