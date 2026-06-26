# Kamar Full Website Audit - Step 24N

Status koneksi Supabase per halaman:

- Public index: static branding, belum perlu login. Nanti bisa dihubungkan ke banners/site_settings.
- member.html: login real Supabase.
- register.html: register real Supabase, form bersih tanpa fasilitas/durasi/payment.
- dashboard.html: dashboard member real.
- member-profile.html: profil member real.
- member-renewal.html: status member real, form kontak admin.
- member-study.html: guard + feed get_member_kamar_study_feed.
- member-materials.html: guard + get_member_materials.
- member-private.html: guard + get_member_videos filter private.
- member-indicator.html: guard + get_member_tools_files filter indikator.
- member-robot.html: guard + get_member_tools_files filter robot.
- admin.html: dashboard count real.
- admin-members.html: daftar member real.
- admin-activation.html/admin-renewal.html: aktivasi/update akses via update tabel Supabase.
- admin-maintenance.html: read/update maintenance_settings.
- admin-banner/admin-video/admin-materials/admin-tools/admin-study-control: read tabel real. Form tambah/edit detail disiapkan fase final.
- admin-links/admin-payment/admin-settings/admin-page-control/admin-dashboard-control: read/update site_settings JSON.

Catatan teknis: jika halaman admin gagal membaca/menyimpan, penyebab paling mungkin adalah RLS/policy admin untuk tabel terkait.
