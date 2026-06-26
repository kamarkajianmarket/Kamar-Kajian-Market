# Step 24AF — Signal Progress Level Fix

Perubahan utama:

1. Status zona tetap hanya:
   - Fresh
   - Active
   - Invalid

2. Update Perkembangan dipisahkan dari status zona dan dibuat bertingkat:
   - HIT Target Kajian 1
   - HIT Target Kajian 2
   - HIT Target Kajian 3
   - HIT Target Lanjutan 1
   - HIT Target Lanjutan 2
   - HIT Target Lanjutan 3
   - HIT Invalidasi

3. Admin Study Control:
   - Dropdown update perkembangan sudah memakai level 1/2/3.
   - Quick action sudah memakai level 1/2/3.
   - Update disimpan ke signals dan source_payload agar label perkembangan lebih presisi.

4. Member Study:
   - Badge update perkembangan membaca level dari source_payload.
   - Fallback membaca tp_hit_level/timestamp untuk Target Kajian.
   - Invalidasi tetap prioritas tertinggi.

5. Warna badge tetap mengikuti sistem Step24AB:
   - Target Kajian = biru elegan
   - Target Lanjutan = ungu premium
   - Invalidasi = warna warning/merah-oranye
