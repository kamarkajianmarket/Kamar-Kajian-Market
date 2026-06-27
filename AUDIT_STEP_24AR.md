# AUDIT STEP 24AR — Running Point Guard & Fresh Slot Fix

## Tujuan
Memperbaiki kasus:
1. Running Actual dan Running Terjauh tampil 0 walaupun signal sudah HIT Target.
2. Running Terjauh tidak boleh turun setelah pernah mencapai nilai maksimal.
3. Fresh lama terlalu agresif disembunyikan lintas timeframe.

## Perubahan API
- `max_running_point` sekarang memakai nilai maksimum dari:
  - nilai lama di database,
  - nilai baru dari EA,
  - running actual positif terbaru.
- HIT Target tanpa running baru tidak lagi me-reset running actual lama ke 0.
- Cleanup Fresh lama dibatasi pada pair + timeframe + skenario yang sama, bukan semua timeframe pada pair tersebut.

## Perubahan EA
- Jika teks update HIT Target tidak membawa angka pips, EA menghitung `running_pips` dari harga aktual terhadap last call.
- `max_running_pips` tetap dikirim sebagai nilai terbaik yang pernah tercatat.
- Running Terjauh tidak boleh turun di sisi API.
