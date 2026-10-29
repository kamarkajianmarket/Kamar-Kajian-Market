-- Notifikasi per target (TP1-TP3, Hold1-Hold3) untuk member. Hanya MENAMBAH kolom; data lama tidak berubah.
-- Bawaan false (opt-in): member yang belum memilih tidak menerima notifikasi TP/Hold, sama seperti sebelumnya.
alter table public.notification_prefs
  add column if not exists notify_tp1   boolean not null default false,
  add column if not exists notify_tp2   boolean not null default false,
  add column if not exists notify_tp3   boolean not null default false,
  add column if not exists notify_hold1 boolean not null default false,
  add column if not exists notify_hold2 boolean not null default false,
  add column if not exists notify_hold3 boolean not null default false;
