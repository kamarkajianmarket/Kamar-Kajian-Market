/* ==========================================================================
   KAMAR MOBILE SHELL v1
   Menyuntik tombol hamburger, drawer menu, dan bottom navigation di HP/tablet.
   TIDAK mengubah logic yang sudah ada — hanya menambah elemen UI baru dan
   memakai route/link yang sudah ada di sidebar existing.
   Wajib di-load SETELAH kamar-admin-online-29f.js / kamar-global-header-script,
   supaya header sudah selesai dibangun sebelum tombol hamburger disisipkan.
   ========================================================================== */
(function(){
  'use strict';

  function ready(fn){
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  function pageName(){
    return (location.pathname.split('/').pop() || '').toLowerCase();
  }

  function svgIcon(name){
    var icons = {
      menu:  '<path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
      close: '<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
      home:  '<path d="M4 11l8-7 8 7M6 10v9h12v-9" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linejoin="round"/>',
      users: '<circle cx="9" cy="8" r="3" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M2 20c0-3.3 3.1-6 7-6s7 2.7 7 6" stroke="currentColor" stroke-width="1.6" fill="none"/><circle cx="17" cy="9" r="2.3" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M14 20c.2-2.6 2.2-4.6 4.8-4.9" stroke="currentColor" stroke-width="1.6" fill="none"/>',
      check: '<path d="M4 12l6 6L20 6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
      star:  '<path d="M12 3l2.8 5.9 6.4.8-4.7 4.5 1.2 6.4L12 17.9 6.3 20.6l1.2-6.4-4.7-4.5 6.4-.8L12 3z" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linejoin="round"/>',
      grid:  '<rect x="3" y="3" width="7" height="7" rx="1.4" stroke="currentColor" stroke-width="1.6" fill="none"/><rect x="14" y="3" width="7" height="7" rx="1.4" stroke="currentColor" stroke-width="1.6" fill="none"/><rect x="3" y="14" width="7" height="7" rx="1.4" stroke="currentColor" stroke-width="1.6" fill="none"/><rect x="14" y="14" width="7" height="7" rx="1.4" stroke="currentColor" stroke-width="1.6" fill="none"/>',
      user:  '<circle cx="12" cy="8" r="3.6" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M4.5 20c1-4 4-6 7.5-6s6.5 2 7.5 6" stroke="currentColor" stroke-width="1.6" fill="none"/>',
      link:  '<path d="M9 15l6-6M9 9h6v6" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
      clock: '<circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M12 7v5l3.5 2" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/>',
      coin:  '<circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M12 7.5v9M9 9.5c0-1 1-1.8 3-1.8s3 .8 3 1.8-1 1.5-3 1.8-3 .8-3 1.9 1 1.8 3 1.8 3-.8 3-1.8" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round"/>'
    };
    return '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">'+(icons[name]||icons.grid)+'</svg>';
  }

  /* Menu bawah per peran. Semua href memakai file/route yang SUDAH ADA
     di situs (dicek manual satu-satu, bukan tebakan). Item terakhir
     "Menu" tidak pindah halaman, cuma membuka drawer berisi menu lengkap. */
  var NAV_SETS = {
    admin: [
      {label:'Beranda',   href:'admin.html',                    icon:'home',  match:['admin.html']},
      {label:'Member',    href:'admin-members.html',             icon:'users', match:['admin-members.html']},
      {label:'Request',   href:'admin-license-requests.html',    icon:'check', match:['admin-license-requests.html','admin-activation.html']},
      {label:'Affiliate', href:'admin-affiliate-overview.html',  icon:'coin',  match:['admin-affiliate']},
      {label:'Menu',      href:'#kamar-drawer',                  icon:'menu',  isDrawerToggle:true}
    ],
    affiliate: [
      {label:'Beranda',  href:'affiliate-dashboard.html',                icon:'home',  match:['affiliate-dashboard.html']},
      {label:'Referral', href:'affiliate-dashboard.html#referredTable',  icon:'link',  match:[]},
      {label:'Komisi',   href:'affiliate-dashboard.html#commissionTable',icon:'coin',  match:[]},
      {label:'Riwayat',  href:'affiliate-dashboard.html#paymentTable',   icon:'clock', match:[]},
      {label:'Akun',     href:'member-profile.html',                     icon:'user',  match:['member-profile.html']}
    ],
    member: [
      {label:'Beranda',   href:'dashboard.html',                icon:'home',  match:['dashboard.html']},
      {label:'Fasilitas', href:'member-renewal.html',            icon:'star',  match:['member-renewal.html','member-activate','member-study','member-private','member-materials','member-indicator','member-robot']},
      {label:'Affiliate', href:'member-affiliate-activate.html', icon:'coin',  match:['member-affiliate-activate.html']},
      {label:'Akun',      href:'member-profile.html',            icon:'user',  match:['member-profile.html']},
      {label:'Menu',      href:'#kamar-drawer',                  icon:'menu',  isDrawerToggle:true}
    ]
  };

  function detectRole(){
    var p = pageName();
    if(p==='affiliate-dashboard.html' || p==='member-affiliate-activate.html') return 'affiliate';
    if(p.indexOf('admin')===0) return 'admin';
    return 'member';
  }

  function openDrawer(){ document.documentElement.classList.add('kamar-drawer-open'); }
  function closeDrawer(){ document.documentElement.classList.remove('kamar-drawer-open'); }
  function toggleDrawer(){ document.documentElement.classList.toggle('kamar-drawer-open'); }

  function setupDrawer(sidebar){
    // Backdrop di belakang drawer
    var backdrop = document.createElement('div');
    backdrop.className = 'kamar-drawer-backdrop';
    backdrop.setAttribute('aria-hidden','true');
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', closeDrawer);

    // Tutup drawer otomatis begitu salah satu menu diklik
    sidebar.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click', function(){ closeDrawer(); });
    });

    // Baris judul drawer + tombol X, brand-small dipindah ke baris ini
    var head = document.createElement('div');
    head.className = 'kamar-drawer-head';
    var brand = sidebar.querySelector('.brand-small');
    sidebar.insertBefore(head, sidebar.firstChild);
    if(brand) head.appendChild(brand);

    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'kamar-drawer-close-btn';
    closeBtn.setAttribute('aria-label','Tutup menu');
    closeBtn.innerHTML = svgIcon('close');
    closeBtn.addEventListener('click', closeDrawer);
    head.appendChild(closeBtn);

    // Tombol Escape untuk menutup drawer (aksesibilitas keyboard)
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape') closeDrawer();
    });

    // Tombol hamburger disisipkan di header (kiri)
    var header = document.querySelector('header.kamar-global-header, header.site-header');
    if(header){
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'kamar-hamburger-btn';
      btn.setAttribute('aria-label','Buka menu');
      btn.setAttribute('aria-controls','kamar-drawer');
      btn.innerHTML = svgIcon('menu');
      btn.addEventListener('click', toggleDrawer);
      header.insertBefore(btn, header.firstChild);
    }
  }

  function setupBottomNav(){
    var role = detectRole();
    var items = NAV_SETS[role];
    if(!items || !items.length) return;

    var nav = document.createElement('nav');
    nav.className = 'kamar-bottom-nav';
    nav.setAttribute('aria-label','Navigasi utama');
    var curr = pageName();

    items.forEach(function(item){
      var a = document.createElement('a');
      a.href = item.href;
      var isActive = !item.isDrawerToggle && item.match && item.match.some(function(m){
        return curr === m || curr.indexOf(m) === 0;
      });
      if(isActive) a.className = 'active';
      a.innerHTML = svgIcon(item.icon) + '<span>' + item.label + '</span>';
      if(item.isDrawerToggle){
        a.addEventListener('click', function(e){ e.preventDefault(); toggleDrawer(); });
      }
      nav.appendChild(a);
    });

    document.body.appendChild(nav);
    document.body.classList.add('kamar-has-bottom-nav');
  }

  ready(function(){
    // Hanya jalan di halaman yang memang pakai kerangka sidebar+konten (.split-app).
    // Halaman lain (homepage publik, login, register) tidak disentuh sama sekali.
    var sidebar = document.querySelector('.split-app > .split-sidebar');
    if(!sidebar) return;

    setupDrawer(sidebar);
    setupBottomNav();
  });
})();
