# Step 24Z - Zone Status Standard Fix

Menstandarkan status zona Kamar Study hanya menjadi Fresh, Active, Invalid.

- Fresh: harga belum masuk zona.
- Active: harga sudah masuk zona / sedang running.
- Invalid: zona sudah dibreak/invalidasi.

Perbaikan dilakukan pada member-study dan admin-study-control renderer. Status teknis lama seperti RUNNING, TP1_HIT, TP2_HIT, TP3_HIT tidak lagi ditampilkan sebagai status utama.
