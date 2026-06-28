(function () {
  "use strict";

  const UI = window.KamarUI;

  const INACTIVITY_LIMIT_MS = 30 * 60 * 1000;
  const LAST_ACTIVITY_KEY = "kamarLastActivityAt";

  function touchActivity() {
    try { localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now())); } catch (e) {}
  }

  function readLastActivity() {
    try { return Number(localStorage.getItem(LAST_ACTIVITY_KEY) || Date.now()); } catch (e) { return Date.now(); }
  }

  async function logoutDueToInactivity() {
    try { await client().auth.signOut(); } catch (e) {}
    try { localStorage.removeItem(LAST_ACTIVITY_KEY); } catch (e) {}
    window.location.href = (window.KAMAR_CONFIG && window.KAMAR_CONFIG.LOGIN_PAGE) || "member.html";
  }

  function startInactivityGuard() {
    touchActivity();
    ["click", "scroll", "keydown", "mousemove", "touchstart"].forEach(function (eventName) {
      window.addEventListener(eventName, touchActivity, { passive: true });
    });
    setInterval(function () {
      if (Date.now() - readLastActivity() > INACTIVITY_LIMIT_MS) {
        logoutDueToInactivity();
      }
    }, 60 * 1000);
  }

  function client() {
    if (!window.kamarSupabase) {
      throw new Error(window.KAMAR_SUPABASE_ERROR || "Supabase client belum siap.");
    }
    return window.kamarSupabase;
  }

  async function getCurrentSession() {
    const { data, error } = await client().auth.getSession();
    if (error) throw error;
    return data.session;
  }

  async function getCurrentUser() {
    const { data, error } = await client().auth.getUser();
    if (error) throw error;
    return data.user;
  }

  async function getMyProfile() {
    const user = await getCurrentUser();
    if (!user) return null;

    const { data, error } = await client()
      .from("member_profiles")
      .select("id,user_id,member_id,full_name,email,whatsapp,telegram_username,role,account_status,payment_status,access_start_date,access_end_date")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async function redirectByRole() {
    const profile = await getMyProfile();
    const config = window.KAMAR_CONFIG || {};

    if (!profile) {
      window.location.href = config.DEFAULT_MEMBER_REDIRECT || "dashboard.html";
      return;
    }

    if (profile.role === "admin") {
      window.location.href = config.DEFAULT_ADMIN_REDIRECT || "admin.html";
      return;
    }

    window.location.href = config.DEFAULT_MEMBER_REDIRECT || "dashboard.html";
  }

  async function loginWithEmail(email, password) {
    const { data, error } = await client().auth.signInWithPassword({
      email: String(email || "").trim(),
      password: String(password || "")
    });
    if (error) throw error;
    return data;
  }

  async function registerMember(payload) {
    const metadata = {
      full_name: payload.fullName,
      whatsapp: payload.whatsapp,
      telegram_username: payload.telegramUsername,
      referral_code: payload.referralCode || null,
      source: "website_register"
    };

    const { data, error } = await client().auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        data: metadata,
        emailRedirectTo: (window.KAMAR_CONFIG && window.KAMAR_CONFIG.AUTH_REDIRECT_URL) || (window.location.origin + "/member.html")
      }
    });

    if (error) throw error;
    return data;
  }

  async function createRegistrationPaymentRequest(payload) {
    const requestNote = [
      "Pendaftaran dari website.",
      "Fasilitas: " + payload.selectedFacilities.join(", "),
      "Durasi: " + payload.durationDays + " hari",
      "Metode: " + payload.paymentMethod,
      payload.referralCode ? "Referral: " + payload.referralCode : ""
    ].filter(Boolean).join("\n");

    // Nama parameter mengikuti function database Step 10. Jika berbeda, nanti kita sesuaikan setelah test pertama.
    const { data, error } = await client().rpc("member_create_payment_request", {
      request_payment_type: "registration",
      selected_facilities: payload.selectedFacilities,
      duration_days: payload.durationDays,
      amount: null,
      payment_method: payload.paymentMethod,
      payment_link: null,
      request_note: requestNote
    });

    if (error) throw error;
    return data;
  }

  async function logout() {
    await client().auth.signOut();
    window.location.href = (window.KAMAR_CONFIG && window.KAMAR_CONFIG.LOGIN_PAGE) || "member.html";
  }

  async function requireAuth(requiredRole) {
    const session = await getCurrentSession();
    if (!session) {
      window.location.href = (window.KAMAR_CONFIG && window.KAMAR_CONFIG.LOGIN_PAGE) || "member.html";
      return null;
    }

    const profile = await getMyProfile();
    if (requiredRole === "admin" && (!profile || profile.role !== "admin")) {
      window.location.href = "dashboard.html";
      return null;
    }

    if (requiredRole === "member" && profile && profile.role === "admin") {
      window.location.href = "admin.html";
      return null;
    }

    return { session, profile };
  }

  function initLoginPage() {
    const form = UI.qs("#kamarLoginForm");
    const status = UI.qs("#loginStatus");
    if (!form) return;

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      const button = UI.qs("#loginSubmitBtn", form);
      UI.setLoading(button, true, "Memeriksa akun...");
      UI.setStatus(status, "Memeriksa akun Kawan Kamar...", "info");

      try {
        const email = UI.qs("#loginEmail", form).value;
        const password = UI.qs("#loginPassword", form).value;

        if (!email || !password) {
          throw new Error("Email dan password wajib diisi.");
        }

        if (!String(email).includes("@")) {
          throw new Error("Login saat ini hanya menggunakan email terdaftar. Masukkan email akun Kawan Kamar.");
        }

        await loginWithEmail(email, password);
        touchActivity();
        UI.setStatus(status, "Login berhasil. Mengalihkan halaman...", "success");
        await redirectByRole();
      } catch (error) {
        UI.setStatus(status, error.message || "Login gagal. Periksa email dan password.", "error");
      } finally {
        UI.setLoading(button, false);
      }
    });
  }

  function initRegisterPage() {
    const form = UI.qs("#kamarRegisterForm");
    const status = UI.qs("#registerStatus");
    if (!form) return;

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      const button = UI.qs("#registerSubmitBtn", form);
      UI.setLoading(button, true, "Mendaftarkan akun...");
      UI.setStatus(status, "Mendaftarkan akun Kawan Kamar...", "info");

      try {
        const fullName = UI.qs("#registerFullName", form).value.trim();
        const email = UI.qs("#registerEmail", form).value.trim();
        const whatsapp = UI.normalizeWhatsapp(UI.qs("#registerWhatsapp", form).value);
        const telegramUsername = UI.normalizeTelegram(UI.qs("#registerTelegram", form).value);
        const password = UI.qs("#registerPassword", form).value;
        const confirmPassword = UI.qs("#registerPasswordConfirm", form).value;
        const referralCode = UI.qs("#registerReferral", form).value.trim();
        const agreeRisk = UI.qs("#registerAgreeRisk", form).checked;
        const agreeTerms = UI.qs("#registerAgreeTerms", form).checked;
        const agreePolicy = UI.qs("#registerAgreePolicy", form) ? UI.qs("#registerAgreePolicy", form).checked : true;

        if (!fullName || !email || !whatsapp || !password || !confirmPassword) {
          throw new Error("Nama, email, WhatsApp, password, dan konfirmasi password wajib diisi.");
        }

        if (password.length < 8) {
          throw new Error("Password minimal 8 karakter.");
        }

        if (password !== confirmPassword) {
          throw new Error("Konfirmasi password tidak sama.");
        }

        if (!agreeRisk || !agreeTerms || !agreePolicy) {
          throw new Error("Centang semua persetujuan wajib terlebih dahulu.");
        }

        const payload = {
          fullName,
          email,
          whatsapp,
          telegramUsername,
          password,
          referralCode
        };

        const data = await registerMember(payload);

        if (data && data.session) {
          UI.setStatus(status, "Pendaftaran berhasil. Akun masuk status menunggu aktivasi admin. Mengalihkan ke dashboard...", "success");
          setTimeout(function () { window.location.href = "dashboard.html"; }, 900);
        } else {
          UI.setStatus(status, "Pendaftaran berhasil. Jika email confirmation aktif, cek email untuk verifikasi. Setelah itu login dan tunggu aktivasi dari Admin Kamar.", "success");
        }
      } catch (error) {
        UI.setStatus(status, error.message || "Pendaftaran gagal. Periksa kembali data yang diisi.", "error");
      } finally {
        UI.setLoading(button, false);
      }
    });
  }

  window.KamarAuth = {
    getCurrentSession,
    getCurrentUser,
    getMyProfile,
    redirectByRole,
    loginWithEmail,
    registerMember,
    createRegistrationPaymentRequest,
    logout,
    requireAuth,
    initLoginPage,
    initRegisterPage,
    startInactivityGuard,
    touchActivity
  };

  document.addEventListener("DOMContentLoaded", function () {
    initLoginPage();
    initRegisterPage();

    if (!document.body.classList.contains("public-home")) {
      startInactivityGuard();
    }

    document.querySelectorAll("[data-kamar-logout]").forEach(function (button) {
      button.addEventListener("click", function (event) {
        event.preventDefault();
        logout();
      });
    });
  });
})();
