// Kamar Step 26 compatibility.
// v1: status fasilitas dinamis (AKTIF -> tombol RENEWAL, expired/belum aktif -> tombol AKTIFKAN)
// + baris masa aktif per card. Read-only query ke member_access, tidak ubah data apapun.
// v2 (2026-08-16): tombol untuk fasilitas AKTIF diganti jadi PERPANJANGAN - klik langsung
// mengajukan perpanjangan pakai data lama lewat RPC member_request_facility_renewal,
// masuk otomatis ke TO DO ADMIN (tinggal admin Setujui/Tolak). Tidak lagi mengarahkan
// member ke halaman aktivasi dari awal. Konfirmasi & pesan pakai UI inline (klik-2x),
// BUKAN window.confirm/alert - dialog native itu memblokir thread & jelek di mobile.
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

  function escText(v){
    return String(v==null||v===''?'-':v).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  function computeSourceInfo(key, ctx){
    var candidates = [];
    if(ctx.ibApp && key === 'kamar_study'){
      candidates.push({
        source:'ib_kamar',
        label:'IB TradeMax' + (ctx.ibApp.broker_name ? ' (' + ctx.ibApp.broker_name + ')' : ''),
        ts: ctx.ibApp.reviewed_at ? new Date(ctx.ibApp.reviewed_at) : new Date(0),
        detail: [
          {label:'Broker', value: ctx.ibApp.broker_name},
          {label:'Akun Trading', value: ctx.ibApp.trading_account_id},
          {label:'Kode Pengajuan', value: ctx.ibApp.application_code},
          {label:'Disetujui', value: fmtDate(ctx.ibApp.reviewed_at)}
        ]
      });
    }
    if(ctx.trial && key === 'kamar_study'){
      candidates.push({
        source:'trial',
        label:'Trial 24 Jam',
        ts: ctx.trial.reviewed_at ? new Date(ctx.trial.reviewed_at) : new Date(0),
        detail: [
          {label:'Disetujui', value: fmtDate(ctx.trial.reviewed_at)},
          {label:'Berlaku s.d', value: fmtDate(ctx.trial.expires_at)}
        ]
      });
    }
    var pay = (ctx.payments||[]).find(function(p){ return Array.isArray(p.selected_facilities) && p.selected_facilities.indexOf(key) >= 0; });
    if(pay){
      candidates.push({
        source:'paid',
        label:'Berbayar',
        ts: pay.confirmed_at ? new Date(pay.confirmed_at) : (pay.paid_at ? new Date(pay.paid_at) : new Date(0)),
        detail: [
          {label:'Jumlah', value: pay.amount!=null ? ('Rp' + Number(pay.amount).toLocaleString('id-ID')) : '-'},
          {label:'Metode', value: pay.payment_method},
          {label:'Durasi', value: pay.duration_days ? (pay.duration_days + ' hari') : '-'},
          {label:'Dikonfirmasi', value: fmtDate(pay.confirmed_at || pay.paid_at)}
        ]
      });
    }
    if(!candidates.length){
      return {source:'admin', label:'Admin (aktivasi langsung)', detail:[]};
    }
    candidates.sort(function(a,b){ return b.ts - a.ts; });
    return candidates[0];
  }

  function renderSourceBlock(card, info){
    if(!info) return;
    var activateRow = card.querySelector('.activate-row');
    if(!activateRow) return;
    var wrap = card.querySelector('.facility-source-wrap');
    if(!wrap){
      wrap = document.createElement('div');
      wrap.className = 'facility-source-wrap';
      wrap.style.cssText = 'margin-top:8px;';
      activateRow.parentNode.insertBefore(wrap, activateRow);
    }
    var detailHtml = '';
    if(info.detail && info.detail.length){
      detailHtml = '<div class="facility-source-detail" style="margin-top:6px;background:rgba(0,0,0,.03);border:1px solid rgba(0,0,0,.08);border-radius:10px;padding:8px 10px;">' +
        info.detail.map(function(d){
          return '<div style="display:flex;justify-content:space-between;gap:10px;font-size:11px;padding:2px 0;"><span style="color:#7a7568;font-weight:700;">'+escText(d.label)+'</span><span style="color:#2b2a26;font-weight:700;text-align:right;">'+escText(d.value)+'</span></div>';
        }).join('') +
      '</div>';
    }
    wrap.innerHTML = '<div class="facility-source-line" style="font-size:11px;font-weight:800;color:#8a5a12;">Diaktifkan via: '+escText(info.label)+'</div>' + detailHtml;
  }

  function removeSourceBlock(card){
    var wrap = card.querySelector('.facility-source-wrap');
    if(wrap) wrap.remove();
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

  function setMsg(msgEl, text, isError){
    if(!msgEl) return;
    msgEl.textContent = text || '';
    msgEl.style.color = isError ? '#963F3F' : '#1c6141';
  }

  function ensureMsgEl(link){
    var row = link.closest('.activate-row') || link.parentNode;
    var msgEl = row.querySelector('.renewal-msg');
    if(!msgEl){
      msgEl = document.createElement('div');
      msgEl.className = 'renewal-msg';
      msgEl.style.cssText = 'font-size:11px;font-weight:700;margin-top:6px;width:100%;';
      row.appendChild(msgEl);
    }
    return msgEl;
  }

  function bindRenewalClick(link, meta, isPending){
    link.removeAttribute('href');
    link.style.cursor = 'pointer';
    var msgEl = ensureMsgEl(link);
    if(isPending){
      setLinkState(link, 'MENUNGGU ADMIN', true);
      setMsg(msgEl, 'Pengajuan perpanjangan sedang menunggu persetujuan admin.', false);
    } else {
      setLinkState(link, 'PERPANJANGAN', false);
    }
    if(link.dataset.renewalBound) return;
    link.dataset.renewalBound = '1';
    var confirmTimer = null;
    link.addEventListener('click', function(e){
      e.preventDefault();
      if(link.getAttribute('aria-disabled') === 'true') return;
      if(link.dataset.confirmStep !== '1'){
        link.dataset.confirmStep = '1';
        setLinkState(link, 'YAKIN? KLIK LAGI', false);
        setMsg(msgEl, 'Klik sekali lagi untuk ajukan perpanjangan pakai data yang sama seperti sebelumnya.', false);
        confirmTimer = setTimeout(function(){
          link.dataset.confirmStep = '';
          setLinkState(link, 'PERPANJANGAN', false);
          setMsg(msgEl, '', false);
        }, 5000);
        return;
      }
      clearTimeout(confirmTimer);
      link.dataset.confirmStep = '';
      setLinkState(link, 'MENGIRIM...', true);
      setMsg(msgEl, 'Mengirim pengajuan...', false);
      var client = window.kamarSupabaseClient;
      if(!client){
        setLinkState(link, 'PERPANJANGAN', false);
        setMsg(msgEl, 'Koneksi belum siap, coba lagi sebentar.', true);
        return;
      }
      client.rpc('member_request_facility_renewal', { p_facility_key: meta.key }).then(function(res){
        var data = res && res.data;
        if(!res || res.error || !data || data.success !== true){
          setLinkState(link, 'PERPANJANGAN', false);
          setMsg(msgEl, (data && data.message) || (res && res.error && res.error.message) || 'Gagal mengirim pengajuan perpanjangan.', true);
          return;
        }
        setLinkState(link, 'MENUNGGU ADMIN', true);
        setMsg(msgEl, data.message || 'Pengajuan perpanjangan terkirim. Menunggu persetujuan admin.', false);
      }).catch(function(err){
        setLinkState(link, 'PERPANJANGAN', false);
        setMsg(msgEl, (err && err.message) || 'Gagal mengirim pengajuan perpanjangan.', true);
      });
    });
  }

  function applyStatus(card, meta, row, pendingSet, sourceInfo){
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
        statusEl.style.color = '#1c6141';
      } else {
        statusEl.textContent = 'Aktif \u2014 tanpa batas waktu';
        statusEl.style.color = '#1c6141';
      }
      renderSourceBlock(card, sourceInfo);
    } else {
      link.textContent = 'AKTIFKAN';
      if(isExpired){
        statusEl.textContent = 'Kedaluwarsa pada ' + fmtDate(expIso);
        statusEl.style.color = '#963F3F';
      } else {
        statusEl.textContent = '';
      }
      removeSourceBlock(card);
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
            .eq('todo_type', 'facility_renewal_request')
            .in('todo_status', ['new','processing']),
          client.from('payments')
            .select('selected_facilities,duration_days,amount,payment_method,confirmed_at,paid_at')
            .eq('profile_id', profileId).eq('payment_status', 'confirmed')
            .order('confirmed_at', { ascending: false }),
          client.from('ib_kamar_applications')
            .select('broker_name,trading_account_id,application_code,reviewed_at')
            .eq('profile_id', profileId).eq('status', 'approved')
            .order('reviewed_at', { ascending: false }).limit(1),
          client.from('kamar_signal_trial_requests')
            .select('reviewed_at,expires_at')
            .eq('profile_id', profileId).eq('status', 'approved')
            .order('reviewed_at', { ascending: false }).limit(1)
        ]);
      }).then(function(results){
        if(!results) return;
        var ares = results[0];
        var tres = results[1];
        var payRes = results[2];
        var ibRes = results[3];
        var trialRes = results[4];
        if(!ares || ares.error || !ares.data) return;
        var row = ares.data;
        var srcCtx = {
          payments: (payRes && !payRes.error && payRes.data) ? payRes.data : [],
          ibApp: (ibRes && !ibRes.error && ibRes.data && ibRes.data[0]) ? ibRes.data[0] : null,
          trial: (trialRes && !trialRes.error && trialRes.data && trialRes.data[0]) ? trialRes.data[0] : null
        };
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
          var sourceInfo = computeSourceInfo(meta.key, srcCtx);
          applyStatus(card, meta, row, pendingSet, sourceInfo);
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
