-- KAMAR STEP 29F - Admin Online Data Policies
-- Jalankan di Supabase SQL Editor hanya jika halaman admin masih menampilkan ERROR permission/RLS.
-- Policy ini memberi akses penuh hanya untuk email admin resmi di Supabase Auth.

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'member_profiles','member_access','payments','affiliates','affiliate_referrals','affiliate_commissions',
    'banners','videos','materials','file_tools','homepage_settings','dashboard_settings','maintenance_settings',
    'payment_gateways','link_settings','app_settings','admin_pending_todos','admin_todos',
    'kamar_licenses','kamar_license_checks','profile_change_requests','signal_events','signals'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('DROP POLICY IF EXISTS kamar_admin_select_29f ON public.%I', t);
      EXECUTE format('DROP POLICY IF EXISTS kamar_admin_insert_29f ON public.%I', t);
      EXECUTE format('DROP POLICY IF EXISTS kamar_admin_update_29f ON public.%I', t);
      EXECUTE format('DROP POLICY IF EXISTS kamar_admin_delete_29f ON public.%I', t);
      EXECUTE format('CREATE POLICY kamar_admin_select_29f ON public.%I FOR SELECT TO authenticated USING ((auth.jwt() ->> ''email'') = ''kamarkajianmarket@gmail.com'')', t);
      EXECUTE format('CREATE POLICY kamar_admin_insert_29f ON public.%I FOR INSERT TO authenticated WITH CHECK ((auth.jwt() ->> ''email'') = ''kamarkajianmarket@gmail.com'')', t);
      EXECUTE format('CREATE POLICY kamar_admin_update_29f ON public.%I FOR UPDATE TO authenticated USING ((auth.jwt() ->> ''email'') = ''kamarkajianmarket@gmail.com'') WITH CHECK ((auth.jwt() ->> ''email'') = ''kamarkajianmarket@gmail.com'')', t);
      EXECUTE format('CREATE POLICY kamar_admin_delete_29f ON public.%I FOR DELETE TO authenticated USING ((auth.jwt() ->> ''email'') = ''kamarkajianmarket@gmail.com'')', t);
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    END IF;
  END LOOP;
END $$;

-- View admin: beri izin baca untuk user authenticated. RLS tetap mengikuti base table jika view/security policy menerapkannya.
GRANT SELECT ON public.admin_member_overview TO authenticated;
GRANT SELECT ON public.admin_dashboard_summary TO authenticated;
GRANT SELECT ON public.member_dashboard_overview TO authenticated;
GRANT SELECT ON public.admin_affiliate_overview TO authenticated;
GRANT SELECT ON public.admin_kamar_study_overview TO authenticated;
GRANT SELECT ON public.admin_kamar_study_summary TO authenticated;
GRANT SELECT ON public.admin_kamar_study_events_overview TO authenticated;
