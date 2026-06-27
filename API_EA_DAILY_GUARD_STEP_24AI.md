# Step 24AI — EA Daily Guard & Invalidasi Lock

## Rule harian yang dikunci

### Public
- Normal awal: 1 signal publik per hari.
- Target evaluasi harian: minimal +5.00 Point.
- Jika total point publik harian sudah >= +5.00 Point, API menolak signal publik baru pada hari itu.
- Jika signal pertama belum mencapai +5.00 Point atau loss, signal publik tambahan tetap boleh diterima sampai target harian tercapai.

### Member
- Normal awal: 3 signal member per hari.
- Target evaluasi harian: minimal +5.00 Point.
- Jika total point member harian sudah >= +5.00 Point, API menolak signal member baru pada hari itu.
- Jika 3 signal belum mencapai +5.00 Point atau ada loss, signal member tambahan tetap boleh diterima sampai target harian tercapai.

## Konversi pips ke point
- 10 pips EA = 1.00 Point website.
- 50 pips EA = 5.00 Point website.

## Guard yang diterapkan API
Rule harian hanya memblokir `NEW_ZONE`.
Update signal existing tetap diterima:
- ZONE_ACTIVE
- RUNNING_UPDATE
- HIT_TARGET_KAJIAN
- HIT_TARGET_LANJUTAN
- HIT_INVALIDASI, kecuali terkena invalidasi lock.

## Invalidasi lock
Jika signal sudah pernah:
- update running profit minimal 20 pips, atau
- minimal HIT Target Kajian 1,

maka API mengabaikan update loss / invalidasi untuk signal tersebut.
