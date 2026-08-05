/* KAMAR STEP 31 — Admin member actions, direct manage, delete, search button, per-facility duration */
(function(){
  'use strict';
  var VERSION='31';
  var ADMIN_EMAIL='kamarkajianmarket@gmail.com';
  function page(){return (location.pathname.split('/').pop()||'index.html').toLowerCase();}
  function qs(s,r){return (r||document).querySelector(s)}
  function qsa(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function norm(v){return String(v||'').toLowerCase().trim()}
  function toast(msg){
    var t=qs('#toast');
    if(!t){t=document.createElement('div');t.id='toast';t.className='toast';document.body.appendChild(t)}
    t.textContent=msg;t.classList.add('show');setTimeout(function(){t.classList.remove('show')},3200);
  }
  async function client(){
    try{ if(window.KamarSupabase&&window.KamarSupabase.ready) return await window.KamarSupabase.ready(); }catch(e){}
    return window.kamarSupabaseClient||window.KamarSupabaseClient||(window.KamarSupabase&&window.KamarSupabase.client)||null;
  }
  function parseManageURL(row){
    var a=qs('a[href*="admin-activation.html"]',row); if(!a)return {email:'',member:''};
    try{var u=new URL(a.href,location.href); return {email:u.searchParams.get('email')||'',member:u.searchParams.get('member')||u.searchParams.get('id')||''};}catch(e){return {email:'',member:''}}
  }
  function addSearchButtons(){
    var configs=[
      {input:'#adminMemberSearch', refresh:'#adminMemberRefresh', id:'adminMemberSearchBtn', label:'Cari Member'},
      {input:'#searchInput', refresh:'#refreshBtn', id:'searchBtn', label:'Cari Member'}
    ];
    configs.forEach(function(c){
      if(qs('#'+c.id))return; var input=qs(c.input), refresh=qs(c.refresh); if(!input||!refresh||!refresh.parentNode)return;
      var b=document.createElement('button'); b.className='btn secondary'; b.id=c.id; b.type='button'; b.textContent=c.label;
      refresh.parentNode.insertBefore(b,refresh);
      b.addEventListener('click',function(){
        input.dispatchEvent(new Event('input',{bubbles:true})); input.dispatchEvent(new Event('change',{bubbles:true}));
        setTimeout(function(){
          var detailButtons=qsa('[data-detail], [data-member-detail]').filter(function(x){return x.offsetParent!==null});
          if(detailButtons.length===1) detailButtons[0].click();
        },180);
      });
    });
  }
  function hardenManageLinks(){
    qsa('#adminMembersList a[href*="admin-activation.html"]').forEach(function(a){
      try{var u=new URL(a.href,location.href); if(!u.searchParams.get('source'))u.searchParams.set('source','admin-members'); u.searchParams.set('v',VERSION); a.href=u.pathname+u.search; a.textContent='Kelola';}catch(e){}
    });
  }
  function addDeleteButtons(){
    if(page()!=='admin-members.html')return;
    qsa('#adminMembersList .admin-row:not(.header)').forEach(function(row){
      var actions=qs('.admin-row-actions',row); if(!actions||qs('[data-delete-member]',actions))return;
      var p=parseManageURL(row); if(!p.email && !p.member)return;
      var b=document.createElement('button'); b.className='btn mini danger'; b.type='button'; b.textContent='Hapus'; b.setAttribute('data-delete-member','1'); b.dataset.email=p.email; b.dataset.member=p.member;
      actions.appendChild(b);
      b.addEventListener('click',function(){deleteMember(p.email,p.member,row,b)});
    });
  }
  async function safeSelect(c,table){var r=await c.from(table).select('*').limit(1000); if(r.error)throw r.error; return r.data||[]}
  function rowMatches(row,email,member){
    var vals=['email','member_email','user_email','member_id','memberId','member_code','code','id','profile_id','user_id'].map(function(k){return norm(row&&row[k])});
    return (!!email&&vals.indexOf(norm(email))>=0)||(!!member&&vals.indexOf(norm(member))>=0);
  }
  async function deleteByBestKey(c,table,row,email,member){
    var attempts=[];
    if(row&&row.id!=null)attempts.push(['id',row.id]);
    if(email){attempts.push(['email',email],['member_email',email],['user_email',email]);}
    if(member){attempts.push(['member_id',member],['member_code',member],['code',member]);}
    for(var i=0;i<attempts.length;i++){
      try{var res=await c.from(table).delete().eq(attempts[i][0],attempts[i][1]); if(!res.error)return true;}catch(e){}
    }
    return false;
  }
  async function deleteMember(email,member,row,btn){
    var label=email||member||'member ini';
    if(!confirm('Hapus '+label+' dari data member Kamar?\n\nCatatan: ini menghapus data member/fasilitas di tabel Kamar. User di Supabase Auth tidak ikut terhapus karena butuh akses server/service role.'))return;
    var c=await client(); if(!c)return toast('Supabase client tidak terbaca.');
    btn.disabled=true; btn.textContent='Menghapus...';
    var deleted=0, errors=[];
    try{
      try{var access=await safeSelect(c,'member_access'); for(var i=0;i<access.length;i++){if(rowMatches(access[i],email,member)){if(await deleteByBestKey(c,'member_access',access[i],email,member))deleted++;}}}catch(e){errors.push('member_access: '+(e.message||e));}
      try{var prof=await safeSelect(c,'member_profiles'); var found=false; for(var j=0;j<prof.length;j++){if(rowMatches(prof[j],email,member)){found=true;if(await deleteByBestKey(c,'member_profiles',prof[j],email,member))deleted++;}} if(!found){await deleteByBestKey(c,'member_profiles',null,email,member)}}catch(e2){errors.push('member_profiles: '+(e2.message||e2));}
      if(row)row.remove();
      toast(deleted?'Member berhasil dihapus dari data Kamar.':'Perintah hapus dikirim. Refresh untuk memastikan data terbaru.');
      setTimeout(function(){location.reload()},900);
    }catch(e){toast(window.kamarFriendlyError(e)); btn.disabled=false; btn.textContent='Hapus';}
  }
  function enhanceMemberList(){addSearchButtons();hardenManageLinks();addDeleteButtons();}

  /* Activation page: direct-open selected member from Kelola link */
  function directOpenRequestedMember(){
    if(page()!=='admin-activation.html')return;
    var params=new URLSearchParams(location.search); var target=params.get('email')||params.get('member')||params.get('id')||''; if(!target)return;
    var input=qs('#searchInput'); if(input && !input.value){input.value=target; input.dispatchEvent(new Event('input',{bubbles:true}));}
    var tries=0; var timer=setInterval(function(){
      tries++;
      var detail=qsa('#memberList [data-detail]').filter(function(b){return b.offsetParent!==null})[0];
      if(detail){clearInterval(timer); detail.click(); return;}
      if(input){input.dispatchEvent(new Event('input',{bubbles:true}));}
      if(tries>40)clearInterval(timer);
    },250);
  }

  function durationOptions(current){
    var opts=[['30','30 Hari'],['60','60 Hari'],['90','90 Hari'],['180','180 Hari'],['lifetime','Lifetime']];
    return opts.map(function(o){return '<option value="'+o[0]+'" '+(String(current||'30')===o[0]?'selected':'')+'>'+o[1]+'</option>'}).join('');
  }
  function enhanceFacilityCards(){
    if(page()!=='admin-activation.html')return;
    qsa('#facilityToggles .toggle-card').forEach(function(card){
      var cb=qs('[data-facility]',card); if(!cb||qs('.facility-duration-wrap',card))return;
      var fac=cb.getAttribute('data-facility')||'';
      var wrap=document.createElement('div'); wrap.className='facility-duration-wrap';
      wrap.innerHTML='<label>Durasi Akses<select data-fac-duration="'+esc(fac)+'">'+durationOptions('30')+'</select></label><label>Catatan<input data-fac-note="'+esc(fac)+'" placeholder="Opsional" /></label>';
      card.appendChild(wrap);
    });
  }
  function getSelectedIdentity(){
    var id='', email='';
    qsa('#detailInfo .info-box').forEach(function(box){
      var label=norm((qs('span',box)||{}).textContent||''), value=((qs('strong',box)||{}).textContent||'').trim();
      if(label.indexOf('id member')>=0) id=value;
      if(label==='email'||label.indexOf('email')>=0) email=value;
    });
    var params=new URLSearchParams(location.search); if(!email)email=params.get('email')||''; if(!id)id=params.get('member')||params.get('id')||'';
    return {id:id,email:email};
  }
  function calcExpires(duration){
    if(duration==='lifetime')return {duration_days:null,expires_at:null,access_until:null};
    var d=Number(duration||30); var dt=new Date(); dt.setDate(dt.getDate()+d);
    return {duration_days:d,expires_at:dt.toISOString(),access_until:dt.toISOString().slice(0,10)};
  }
  function facilityOf(row){return String((row&&(row.facility||row.facility_name||row.facilityName||row.product||row.service||row.access_name||row.name))||'').trim();}
  function buildUpdate(row,on,duration,note){
    var keys=Object.keys(row||{}), exp=calcExpires(duration), upd={}; function has(k){return keys.indexOf(k)>=0}
    if(has('active'))upd.active=!!on; if(has('is_active'))upd.is_active=!!on; if(has('enabled'))upd.enabled=!!on;
    if(has('status'))upd.status=on?'active':'inactive'; if(has('access_status'))upd.access_status=on?'active':'inactive';
    if(has('duration'))upd.duration=duration; if(has('duration_days'))upd.duration_days=exp.duration_days;
    ['expires_at','expired_at','end_date','access_until','valid_until'].forEach(function(k){if(has(k))upd[k]=exp.expires_at||null});
    if(has('note'))upd.note=note||''; if(has('admin_note'))upd.admin_note=note||''; if(has('updated_at'))upd.updated_at=new Date().toISOString();
    if(!Object.keys(upd).length)upd.status=on?'active':'inactive'; return upd;
  }
  function buildInsert(sample,ident,fac,on,duration,note){
    var keys=sample?Object.keys(sample):['member_id','email','facility','status','duration_days','expires_at','admin_note','created_at','updated_at']; var exp=calcExpires(duration), row={}; function has(k){return keys.indexOf(k)>=0}
    if(has('member_id'))row.member_id=ident.id; else if(has('profile_id'))row.profile_id=ident.id; else if(has('user_id'))row.user_id=ident.id;
    if(has('email'))row.email=ident.email; if(has('member_email'))row.member_email=ident.email;
    if(has('facility'))row.facility=fac; else if(has('facility_name'))row.facility_name=fac; else if(has('access_name'))row.access_name=fac; else if(has('name'))row.name=fac;
    if(has('active'))row.active=!!on; if(has('is_active'))row.is_active=!!on; if(has('enabled'))row.enabled=!!on;
    if(has('status'))row.status=on?'active':'inactive'; if(has('access_status'))row.access_status=on?'active':'inactive';
    if(has('duration'))row.duration=duration; if(has('duration_days'))row.duration_days=exp.duration_days;
    ['expires_at','expired_at','end_date','access_until','valid_until'].forEach(function(k){if(has(k))row[k]=exp.expires_at||null});
    if(has('note'))row.note=note||''; if(has('admin_note'))row.admin_note=note||''; if(has('created_at'))row.created_at=new Date().toISOString(); if(has('updated_at'))row.updated_at=new Date().toISOString();
    if(!row.facility&&!row.facility_name&&!row.access_name&&!row.name)row.facility=fac;
    if(!row.status&&!('active'in row)&&!('is_active'in row))row.status=on?'active':'inactive';
    return row;
  }
  async function upsertFacility(cb){
    var fac=cb.getAttribute('data-facility'), card=cb.closest('.toggle-card'), on=cb.checked;
    var duration=(qs('[data-fac-duration]',card)||{}).value||'30'; var note=(qs('[data-fac-note]',card)||{}).value||'';
    var ident=getSelectedIdentity(); if(!ident.email&&!ident.id){toast('Member belum dipilih. Klik Kelola dari Data Member.'); cb.checked=!on; return;}
    var c=await client(); if(!c){toast('Supabase client tidak terbaca.'); cb.checked=!on; return;}
    cb.disabled=true;
    try{
      var all=[]; try{all=await safeSelect(c,'member_access')}catch(e){}
      var matches=all.filter(function(r){return rowMatches(r,ident.email,ident.id)&&norm(facilityOf(r))===norm(fac)});
      if(matches.length){
        for(var i=0;i<matches.length;i++){
          var r=matches[i], upd=buildUpdate(r,on,duration,note), q=c.from('member_access').update(upd);
          if(r.id!=null)q=q.eq('id',r.id); else if(ident.email)q=q.eq('email',ident.email); else q=q.eq('member_id',ident.id);
          var res=await q; if(res.error)throw res.error;
        }
      }else if(on){
        var sample=all[0]||null; var row=buildInsert(sample,ident,fac,on,duration,note); var resIns=await c.from('member_access').insert(row); if(resIns.error){
          var fallback={member_id:ident.id,email:ident.email,facility:fac,status:on?'active':'inactive',duration_days:duration==='lifetime'?null:Number(duration),expires_at:calcExpires(duration).expires_at,admin_note:note,created_at:new Date().toISOString(),updated_at:new Date().toISOString()};
          var res2=await c.from('member_access').insert(fallback); if(res2.error)throw resIns.error;
        }
      }
      toast((on?'Fasilitas aktif: ':'Fasilitas nonaktif: ')+fac+' • durasi '+(duration==='lifetime'?'Lifetime':duration+' hari'));
      setTimeout(function(){location.reload()},900);
    }catch(e){toast(window.kamarFriendlyError(e)); cb.checked=!on;}
    cb.disabled=false;
  }
  function interceptFacilityChanges(){
    if(page()!=='admin-activation.html')return;
    document.addEventListener('change',function(e){
      var cb=e.target&&e.target.matches&&e.target.matches('#facilityToggles [data-facility]')?e.target:null; if(!cb)return;
      e.preventDefault(); e.stopPropagation(); if(e.stopImmediatePropagation)e.stopImmediatePropagation();
      upsertFacility(cb);
    },true);
  }
  function observe(){
    addSearchButtons(); enhanceMemberList(); directOpenRequestedMember(); enhanceFacilityCards(); interceptFacilityChanges();
    var mo=new MutationObserver(function(){addSearchButtons(); enhanceMemberList(); enhanceFacilityCards();});
    mo.observe(document.body,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',observe); else observe();
})();
