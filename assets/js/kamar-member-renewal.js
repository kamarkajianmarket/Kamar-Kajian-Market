(function () {
  "use strict";
  function formatDate(v){ if(!v) return "-"; try { return new Intl.DateTimeFormat("id-ID", {day:"2-digit", month:"short", year:"numeric"}).format(new Date(v)); } catch(e){ return String(v); } }
  document.addEventListener("DOMContentLoaded", async function(){
    const box=document.getElementById("renewalStatusBox");
    if(!box || !window.KamarAuth) return;
    try{
      const auth=await window.KamarAuth.requireAuth("member");
      if(!auth || !auth.profile) return;
      const p=auth.profile;
      if(p.account_status === "active" && p.payment_status === "confirmed"){
        box.className="page-note";
        box.innerHTML=`<strong>Status Akun: Aktif</strong><br/>Masa akses saat ini tercatat sampai ${formatDate(p.access_end_date)}.`;
      } else if(p.account_status === "pending_activation"){
        box.className="page-note";
        box.innerHTML=`<strong>Status Akun: Menunggu Aktivasi</strong><br/>Akun sudah terdaftar. Admin akan memproses aktivasi setelah konfirmasi selesai.`;
      } else {
        box.className="expired-note";
        box.innerHTML=`<strong>Status Akun: ${p.account_status || "Perlu Pengecekan"}</strong><br/>Hubungi Admin Kamar untuk pengecekan akses.`;
      }
    } catch(error){
      box.className="expired-note";
      box.innerHTML=`<strong>Gagal Membaca Status</strong><br/>${error.message || "Silakan login ulang."}`;
    }
  });
})();
