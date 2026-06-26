(function () {
  "use strict";

  function fail(message) {
    console.error("[Kamar Supabase]", message);
    window.KAMAR_SUPABASE_ERROR = message;
  }

  if (!window.KAMAR_CONFIG) {
    fail("KAMAR_CONFIG belum tersedia. Pastikan kamar-config.js dimuat sebelum kamar-supabase.js.");
    return;
  }

  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    fail("Supabase CDN belum termuat. Pastikan script @supabase/supabase-js dimuat sebelum kamar-supabase.js.");
    return;
  }

  const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.KAMAR_CONFIG;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes("PASTE_")) {
    fail("Supabase URL / anon key belum lengkap. Isi assets/js/kamar-config.js terlebih dahulu.");
    return;
  }

  window.kamarSupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
})();
