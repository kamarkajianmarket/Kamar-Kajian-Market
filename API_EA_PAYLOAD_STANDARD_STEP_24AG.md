# Step 24AG — Standard Payload EA ke Website

Endpoint yang disiapkan:

```text
POST /api/kamar-study-update
```

## Environment Variable Vercel

Wajib diisi di Vercel Project Settings:

```text
SUPABASE_URL=https://moxcqojvtglssftskouj.supabase.co
SUPABASE_SERVICE_ROLE_KEY=ISI_SERVICE_ROLE_KEY_SUPABASE
KAMAR_EA_API_TOKEN=TOKEN_RAHASIA_UNTUK_EA
```

Catatan penting:

- `SUPABASE_SERVICE_ROLE_KEY` hanya boleh disimpan di Vercel Environment Variable.
- Jangan masukkan `SUPABASE_SERVICE_ROLE_KEY` ke frontend atau EA MT5.
- EA cukup memakai `KAMAR_EA_API_TOKEN`.

## Header Request dari EA

```text
Content-Type: application/json
X-Kamar-EA-Token: TOKEN_RAHASIA_UNTUK_EA
```

## Format Payload Utama

```json
{
  "id_zona": "KM-STUDY/Buy/M30-047",
  "pair": "XAUUSD",
  "timeframe": "M30",
  "zone_status": "ACTIVE",
  "scenario": "BUY",
  "jenis_zona": "Demand",
  "area_high": 4021.55,
  "area_low": 4005.73,
  "target_kajian_1": 4024.55,
  "target_kajian_2": 4026.55,
  "target_kajian_3": 4031.55,
  "target_lanjutan_1": 4046.55,
  "target_lanjutan_2": 4071.55,
  "target_lanjutan_3": 4121.55,
  "invalidasi": 4004.73,
  "current_price": 4071.55,
  "progress_update": "target_lanjutan_2",
  "running_pips": 506,
  "max_running_pips": 506,
  "visibility": "member"
}
```

## Konversi Pips EA ke Point Website

Rumus resmi:

```text
Point Website = Pips EA / 10
```

Contoh:

| EA | Website |
|---:|---:|
| 10 Pips | 1.00 Point |
| 100 Pips | 10.00 Point |
| 506 Pips | 50.60 Point |
| -80 Pips | -8.00 Point |

Endpoint akan menyimpan:

```text
running_point = running_pips / 10
max_running_point = max_running_pips / 10
```

Website tetap menampilkan:

```text
+50.60 Point
-8.00 Point
```

## Status Zona

| Payload EA | Website |
|---|---|
| `FRESH` | Fresh |
| `ACTIVE` / `AKTIF` | Active |
| `INVALID` / `INVALIDASI` / `TERINVALIDASI` | Invalid |

## Update Perkembangan

| Payload EA | Tampilan Website |
|---|---|
| `target_kajian_1` | HIT Target Kajian 1 |
| `target_kajian_2` | HIT Target Kajian 2 |
| `target_kajian_3` | HIT Target Kajian 3 |
| `target_lanjutan_1` | HIT Target Lanjutan 1 |
| `target_lanjutan_2` | HIT Target Lanjutan 2 |
| `target_lanjutan_3` | HIT Target Lanjutan 3 |
| `invalidasi` | HIT Invalidasi |

Endpoint juga masih bisa membaca variasi lama seperti `TP1`, `TP2`, `Hold 1`, `Cut Loss`, lalu menormalkannya ke bahasa website.

## Respons Berhasil

```json
{
  "ok": true,
  "message": "Signal website berhasil diupdate.",
  "id_zona": "KM-STUDY/Buy/M30-047",
  "status": "ACTIVE",
  "progress_update": "target_lanjutan_2",
  "progress_label": "HIT Target Lanjutan 2",
  "running_actual_point": 50.6,
  "running_terjauh_point": 50.6
}
```

## Prinsip Integrasi

Telegram tetap memakai format bahasa kajian yang sudah ada.
Website menerima data terstruktur agar card dapat menampilkan status, update, harga, Running Actual, dan Running Terjauh secara konsisten.
