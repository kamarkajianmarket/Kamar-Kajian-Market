(function () {
  "use strict";
  const FACILITIES = [
    { key: "access_kamar_study", label: "Kamar Study" },
    { key: "access_materi_edukasi", label: "Materi Edukasi" },
    { key: "access_kamar_private", label: "Kamar Private" },
    { key: "access_kamar_indikator", label: "Kamar Indikator" },
    { key: "access_kamar_robot", label: "Kamar Robot" }
  ];
  function client(){ if(!window.kamarSupabase) throw new Error(window.KAMAR_SUPABASE_ERROR || "Supabase client belum siap."); return window.kamarSupabase; }
  function formatDate(v){ if(!v) return "-"; try { return new Intl.DateTimeFormat("id-ID", {day:"2-digit", month:"short", year:"numeric"}).format(new Date(v)); } catch(e){ return String(v); } }
  function set(id, value){ const el=document.getElementById(id); if(el) el.textContent = value || "-"; }
  async function getAccess(profileId){ const {data,error}=await client().from("member_access").select("access_kamar_study,access_materi_edukasi,access_kamar_private,access_kamar_indikator,access_kamar_robot,locked_by_expired").eq("profile_id", profileId).maybeSingle(); if(error) throw error; return data || {}; }
  document.addEventListener("DOMContentLoaded", async function(){
    if(!window.KamarAuth) return;
    try{
      const auth=await window.KamarAuth.requireAuth("member");
      if(!auth || !auth.profile) return;
      const p=auth.profile;
      const a=await getAccess(p.id);
      const active = FACILITIES.filter(f => a[f.key]).map(f => f.label);
      set("profileFullName", p.full_name || "Kawan Kamar");
      set("profileMemberId", p.member_id);
      set("profileEmail", p.email);
      set("profileWhatsapp", p.whatsapp);
      set("profileTelegram", p.telegram_username ? "@" + String(p.telegram_username).replace(/^@/, "") : "-");
      set("profileStatus", `${p.account_status || "-"} / ${p.payment_status || "-"}`);
      set("profileAccessDate", `${formatDate(p.access_start_date)} - ${formatDate(p.access_end_date)}`);
      set("profileFacilities", active.length ? active.join(", ") : "Belum ada fasilitas aktif");
    } catch(error){
      const main=document.querySelector(".split-main");
      if(main){ main.insertAdjacentHTML("afterbegin", `<section class="split-card"><div class="expired-note"><strong>Gagal Membaca Profil</strong><br/>${error.message || "Silakan login ulang."}</div></section>`); }
    }
  });
})();
