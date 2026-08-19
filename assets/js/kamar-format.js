/* ==========================================================================
   KAMAR FORMAT — utilitas format nominal/uang, dipakai di seluruh website.
   Tujuan: semua nominal (harga, komisi, reward, deposit, pencairan, dst)
   tampil dengan pemisah ribuan otomatis ("Rp 1.234.567"), dan setiap kali
   admin/member MENGETIK nominal ke input, pemisah ribuan muncul otomatis
   saat itu juga (bukan cuma di angka saved).

   Cara pakai:
   1. Tampilan (read-only): KamarFormat.rupiah(1234567) -> "Rp1.234.567"
                             KamarFormat.number(1234567) -> "1.234.567" (tanpa "Rp")
   2. Input yang diketik admin/member: panggil KamarFormat.liveFormat(inputEl)
      SEKALI saat elemen dibuat (baik input statis di HTML, maupun input yang
      di-generate ulang lewat innerHTML). Ini mengubah tampilan input jadi
      "1.234.567" otomatis saat diketik. Untuk baca nilai bersih (angka saja,
      tanpa titik) sebelum disimpan ke DB, pakai KamarFormat.raw(inputEl)
      atau KamarFormat.raw(el.value).
   3. Untuk input yang di-generate ulang via innerHTML (list dinamis, misalnya
      reward per baris), lebih aman pakai KamarFormat.delegate(containerEl,
      selector) SEKALI saat halaman load — ini otomatis menangani input baru
      yang muncul belakangan tanpa perlu attach ulang satu-satu.

   Tidak menyentuh markup/struktur apapun; ini murni helper JS tambahan.
   ========================================================================== */
(function(){
  function toDigits(v){
    return String(v == null ? '' : v).replace(/[^0-9]/g, '');
  }

  function number(n){
    var digits = toDigits(n).replace(/^0+(?=\d)/, '');
    if(!digits) return '0';
    return Number(digits).toLocaleString('id-ID');
  }

  function rupiah(n){
    return 'Rp' + number(n);
  }

  function raw(v){
    if(v && v.tagName) v = v.value;
    return toDigits(v);
  }

  function rawNumber(v){
    var d = raw(v);
    return d ? Number(d) : 0;
  }

  function formatKeepingCaret(input){
    var before = input.value;
    var caretFromEnd = before.length - (input.selectionStart == null ? before.length : input.selectionStart);
    var digits = toDigits(before).replace(/^0+(?=\d)/, '');
    var after = digits ? Number(digits).toLocaleString('id-ID') : '';
    input.value = after;
    var pos = Math.max(0, after.length - caretFromEnd);
    try{ input.setSelectionRange(pos, pos); }catch(e){}
  }

  // Sekali pasang ke satu <input> statis (mis. input tunggal di form).
  function liveFormat(input){
    if(!input || input.__kamarFormatBound) return;
    input.__kamarFormatBound = true;
    if(input.tagName === 'INPUT' && input.type === 'number') input.type = 'text';
    input.setAttribute('inputmode', 'numeric');
    if(input.value) formatKeepingCaret(input);
    input.addEventListener('input', function(){ formatKeepingCaret(input); });
  }

  // Event-delegation: pasang SEKALI ke container yang isinya di-generate ulang
  // (innerHTML) berkali-kali, mis. daftar reward per baris. selector contoh:
  // '[data-reward-amount]', '.money-input', dst. Otomatis menangani baris baru.
  function delegate(container, selector){
    if(!container || container.__kamarFormatDelegated) return;
    container.__kamarFormatDelegated = true;
    container.addEventListener('input', function(e){
      var t = e.target;
      if(!t || !t.matches || !t.matches(selector)) return;
      if(t.tagName === 'INPUT' && t.type === 'number') t.type = 'text';
      formatKeepingCaret(t);
    });
  }

  window.KamarFormat = {
    number: number,
    rupiah: rupiah,
    raw: raw,
    rawNumber: rawNumber,
    liveFormat: liveFormat,
    delegate: delegate
  };
})();
