// Kamar Step 26 compatibility.
// v1: status fasilitas dinamis (AKTIF -> tombol RENEWAL, expired/belum aktif -> tombol AKTIFKAN)
// + baris masa aktif per card. Read-only query ke member_access, tidak ubah data apapun.
(function(){
  'use strict';

  var FACILITY_MAP = {
    'Kamar Edukasi':   { access: 'access_materi_edukasi',  expires: 'expires_materi_edukasi' },
    'Kamar Signal':    { access: 'access_kamar_study',     expires: 'expires_kamar_study' },
    'Kamar Private':   { access: 'access_kamar_private',   expires: 'expires_kamar_private' },
    'Kamar Indikator': { access: 'access_kamar_indikator', expires: 'expires_kamar_indikator' },
    'Kamar Robot':     { access: 'access_kamar_robot',     expires: 'expires_kamar_robot' }
  };

  function fmtDate(iso){
    var d = new Date(iso);
    if(isNaN(d.getTime())) return '-';
    var bulan = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
    return d.getDate()+' '+bulan[d.getMonth()]+' '+d.getFullYear();
  }

  function applyStatus(card, meta, row){
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
      link.textContent = 'RENEWAL';
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
        return client.from('member_access')
          .select('access_kamar_study,expires_kamar_study,access_materi_edukasi,expires_materi_edukasi,access_kamar_private,expires_kamar_private,access_kamar_indikator,expires_kamar_indikator,access_kamar_robot,expires_kamar_robot')
          .eq('profile_id', pres.data.id).maybeSingle();
      }).then(function(ares){
        if(!ares || ares.error || !ares.data) return;
        var row = ares.data;
        var cards = grid.querySelectorAll('.member-payment-card');
        cards.forEach(function(card){
          var h3 = card.querySelector('h3');
          if(!h3) return;
          var meta = FACILITY_MAP[h3.textContent.trim()];
          if(!meta) return;
          applyStatus(card, meta, row);
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
