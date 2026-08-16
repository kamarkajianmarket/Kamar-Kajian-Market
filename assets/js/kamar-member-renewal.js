// Kamar Step 26 compatibility.
// v1: status fasilitas dinamis (AKTIF -> tombol RENEWAL, expired/belum aktif -> tombol AKTIFKAN)
// + baris masa aktif per card. Read-only query ke member_access, tidak ubah data apapun.
// v2 (2026-08-16): tombol untuk fasilitas AKTIF diganti jadi PERPANJANGAN - klik langsung
// mengajukan perpanjangan pakai data lama lewat RPC member_request_facility_renewal,
// masuk otomatis ke TO DO ADMIN (tinggal admin Setujui/Tolak). Tidak lagi mengarahkan
// member ke halaman aktivasi dari awal.
(function(){
  'use strict';

  var FACILITY_MAP = {
    'Kamar Edukasi':   { access: 'access_materi_edukasi',  expires: 'expires_materi_edukasi',  key: 'materi_edukasi' },
    'Kamar Signal':    { access: 'access_kamar_study',     expires: 'expires_kamar_study',      key: 'kamar_study' },
    'Kamar Private':   { access: 'access_kamar_private',   expires: 'expires_kamar_private',    key: 'kamar_private' },
    'Kamar Indikator': { access: 'access_kamar_indikator', expires: 'expires_kamar_indikator',  key: 'kamar_indikator' },
    'Kamar Robot':     { access: 'access_kamar_robot',     expires: 'expires_kamar_robot',      key: 'kamar_robot' }
  };

  function fmtDate(iso){
    var d = new Date(iso);
    if(isNaN(d.getTime())) return '-';
    var bulan = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
    return d.getDate()+' '+bulan[d.getMonth()]+' '+d.getFullYear();
  }

  function setLinkState(link, text, disabled){
    link.textContent = text;
    if(disabled){
      link.setAttribute('aria-disabled','true');
      link.style.pointerEvents = 'none';
      link.style.opacity = '.6';
    } else {
      link.removeAttribute('aria-disabled');
      link.style.pointerEvents = '';
      link.style.opacity = '';
    }
  }

  function bindRenewalClick(link, meta, isPending){
    link.removeAttribute('href');
    link.style.cursor = 'pointer';
    if(isPending){
      setLinkState(link, 'MENUNGGU ADMIN', true);
    } else {
      setLinkState(link, 'PERPANJANGAN', false);
    }
    if(link.dataset.renewalBound) return;
    link.dataset.renewalBound = '1';
    link.addEventListener('click', function(e){
      e.preventDefault();
      if(link.getAttribute('aria-disabled') === 'true') return;
      var confirmMsg = 'Ajukan perpanjangan fasilitas ini menggunakan data yang sama seperti sebelumnya? Pengajuan langsung masuk ke admin untuk disetujui.';
      if(!window.confirm(confirmMsg)) return;
      setLinkState(link, 'MENGIRIM...', true);
      var client = window.kamarSupabaseClient;
      if(!client){
        setLinkState(link, 'PERPANJANGAN', false);
        window.alert('Koneksi belum siap, coba lagi sebentar.');
        return;
      }
      client.rpc('member_request_facility_renewal', { p_facility_key: meta.key }).then(function(res){
        var data = res && res.data;
        if(!res || res.error || !data || data.success !== true){
          setLinkState(link, 'PERPANJANGAN', false);
          window.alert((data && data.message) || (res && res.error && res.error.message) || 'Gagal mengirim pengajuan perpanjangan.');
          return;
        }
        setLinkState(link, 'MENUNGGU ADMIN', true);
        window.alert(data.message || 'Pengajuan perpanjangan terkirim. Menunggu persetujuan admin.');
      }).catch(function(err){
        setLinkState(link, 'PERPANJANGAN', false);
        window.alert((err && err.message) || 'Gagal mengirim pengajuan perpanjangan.');
      });
    });
  }

  function applyStatus(card, meta, row, pendingSet){
    if(!row) return;
    var accessOn = row[meta.access] === true;
    var expIso = row[meta.expires];
    var now = new Date();
    var isExpired = !!expIso && new Date(expIso) <= now;
    var isActive = accessOn && !isExpired;

    var link = card.querySelector('.activate-row a.btn');
    if(!link) return;

    var statusEl = card.querySelector('.facility-status-line');
    if(!statusEl){
      statusEl = document.createElement('div');
      statusEl.className = 'facility-status-line';
      statusEl.style.cssText = 'font-size:12px;font-weight:800;margin:6px 0 2px;';
      var p = card.querySelector('p');
      if(p && p.parentNode) p.parentNode.insertBefore(statusEl, p.nextSibling);
    }

    if(isActive){
      bindRenewalClick(link, meta, !!(pendingSet && pendingSet[meta.key]));
      if(expIso){
        var daysLeft = Math.ceil((new Date(expIso) - now) / 86400000);
        statusEl.textContent = 'Aktif \u2014 ' + (daysLeft>0 ? daysLeft+' hari tersisa' : 'berakhir hari ini') + ' (s.d ' + fmtDate(expIso) + ')';
        statusEl.style.color = daysLeft<=5 ? '#9C7A3C' : '#1c6141';
      } else {
        statusEl.textContent = 'Aktif \u2014 tanpa batas waktu';
        statusEl.style.color = '#1c6141';
      }
    } else {
      link.textContent = 'AKTIFKAN';
      if(isExpired){
        statusEl.textContent = 'Kedaluwarsa pada ' + fmtDate(expIso);
        statusEl.style.color = '#963F3F';
      } else {
        statusEl.textContent = '';
      }
    }
  }

  function run(){
    var grid = document.querySelector('.member-payment-grid');
    if(!grid) return;
    var client = window.kamarSupabaseClient;
    if(!client){
      var tries = 0;
      var iv = setInterval(function(){
        tries++;
        if(window.kamarSupabaseClient){ clearInterval(iv); run(); }
        else if(tries > 40){ clearInterval(iv); }
      }, 150);
      return;
    }

    client.auth.getSession().then(function(res){
      var session = res && res.data ? res.data.session : null;
      if(!session || !session.user){ return; }
      return client.from('member_profiles').select('id').eq('user_id', session.user.id).maybeSingle().then(function(pres){
        if(!pres || pres.error || !pres.data) return;
        var profileId = pres.data.id;
        return Promise.all([
          client.from('member_access')
            .select('access_kamar_study,expires_kamar_study,access_materi_edukasi,expires_materi_edukasi,access_kamar_private,expires_kamar_private,access_kamar_indikator,expires_kamar_indikator,access_kamar_robot,expires_kamar_robot')
            .eq('profile_id', profileId).maybeSingle(),
          client.from('admin_todos')
            .select('action_payload')
            .eq('profile_id', profileId)
            .eq('todo_type', 'renewal_request')
            .in('todo_status', ['new','processing'])
        ]);
      }).then(function(results){
        if(!results) return;
        var ares = results[0];
        var tres = results[1];
        if(!ares || ares.error || !ares.data) return;
        var row = ares.data;
        var pendingSet = {};
        if(tres && !tres.error && tres.data){
          tres.data.forEach(function(t){
            var fk = t.action_payload && t.action_payload.facility_key;
            if(fk) pendingSet[fk] = true;
          });
        }
        var cards = grid.querySelectorAll('.member-payment-card');
        cards.forEach(function(card){
          var h3 = card.querySelector('h3');
          if(!h3) return;
          var meta = FACILITY_MAP[h3.textContent.trim()];
          if(!meta) return;
          applyStatus(card, meta, row, pendingSet);
        });
      });
    }).catch(function(){});
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
