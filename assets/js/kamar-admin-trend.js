(function(){
  function sb(){return window.kamarSupabaseClient;}
  var css='.kad-trend{margin:14px 0;display:grid;grid-template-columns:1fr 1fr;gap:14px}@media(max-width:860px){.kad-trend{grid-template-columns:1fr}}'+
  '.kad-tc{padding:18px;border-radius:22px;background:linear-gradient(165deg,rgba(22,28,41,.92),rgba(9,12,19,.96));border:1px solid rgba(232,199,119,.2);box-shadow:0 16px 44px rgba(0,0,0,.42),inset 0 1px 0 rgba(255,255,255,.06)}'+
  '.kad-th{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:12px}'+
  '.kad-tt{font-size:10.5px;font-weight:800;letter-spacing:.2em;color:#e8c777;text-transform:uppercase}'+
  '.kad-ts{font-size:11px;color:#a9b3c4;margin-top:4px}'+
  '.kad-tv{font-size:26px;font-weight:900;color:#fff6df;font-variant-numeric:tabular-nums;line-height:1}'+
  '.kad-bars{display:flex;align-items:flex-end;gap:10px;height:150px;padding:0 2px 6px;border-bottom:1px solid rgba(255,255,255,.14)}'+
  '.kad-b{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;min-width:0}'+
  '.kad-b i{display:block;width:70%;max-width:46px;border-radius:9px 9px 3px 3px;background:linear-gradient(180deg,#f3d98d,#a87a2a);box-shadow:0 0 18px rgba(232,199,119,.3);transform-origin:bottom;animation:kadBar .9s cubic-bezier(.2,.8,.2,1) both}'+
  '.kad-b.g i{background:linear-gradient(180deg,#7dffcb,#13946a);box-shadow:0 0 18px rgba(47,230,164,.35)}'+
  '.kad-b b{font-size:11px;font-weight:800;color:#fff6df;margin-bottom:5px;font-variant-numeric:tabular-nums}'+
  '.kad-l{display:flex;gap:10px;margin-top:8px}.kad-l span,.kad-l .kad-lk{flex:1;text-align:center;font-size:10.5px;letter-spacing:.08em;color:#a9b3c4;font-weight:700;text-decoration:none}'+
  'a.kad-b{text-decoration:none;cursor:pointer;border-radius:10px;transition:background .18s,transform .18s}a.kad-b:hover,a.kad-b:focus-visible{background:rgba(232,199,119,.10);outline:0}a.kad-b:hover i{filter:brightness(1.15)}a.kad-b:focus-visible,.kad-lk:focus-visible,.kad-tta:focus-visible{outline:2px solid #f6e6a6;outline-offset:2px}.kad-lk:hover,.kad-tta:hover{color:#f6e6a6}.kad-tta{text-decoration:none;display:inline-block}@media(max-width:640px){a.kad-b{min-width:40px}}'+
  '@keyframes kadBar{from{transform:scaleY(0)}to{transform:scaleY(1)}}';
  var st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
  var MN=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  function months(){var a=[],n=new Date();for(var i=5;i>=0;i--){var d=new Date(n.getFullYear(),n.getMonth()-i,1);a.push({k:d.getFullYear()+'-'+(d.getMonth()+1),l:MN[d.getMonth()],m:0,r:0});}return a;}
  function key(iso){var d=new Date(iso);return d.getFullYear()+'-'+(d.getMonth()+1);}
  function rp(n){if(n>=1e6)return (n/1e6).toFixed(1).replace('.',',')+' jt';if(n>=1e3)return Math.round(n/1e3)+' rb';return String(Math.round(n));}
  function card(title,sub,total,list,field,cls,fmt,href,tipWord){
    function lk(k){return href+(href.indexOf('?')<0?'?':'&')+'bulan='+k;}
    var mx=Math.max.apply(null,list.map(function(x){return x[field];}).concat([1]));
    return '<div class="kad-tc"><div class="kad-th"><div><a class="kad-tt kad-tta" href="'+href+'">'+title+' &rarr;</a><div class="kad-ts">'+sub+'</div></div><div class="kad-tv">'+total+'</div></div><div class="kad-bars">'+
    list.map(function(x,i){var h=Math.max(4,x[field]/mx*112);return '<a class="kad-b '+cls+'" href="'+lk(x.k)+'" title="Buka '+tipWord+' bulan '+x.l+'" aria-label="'+tipWord+' bulan '+x.l+': '+fmt(x[field])+'"><b>'+fmt(x[field])+'</b><i style="height:'+h+'px;animation-delay:'+(i*70)+'ms"></i></a>';}).join('')+'</div><div class="kad-l">'+list.map(function(x){return '<a class="kad-lk" href="'+lk(x.k)+'">'+x.l+'</a>';}).join('')+'</div></div>';
  }
  var done=false;
  function run(){
    if(done)return;var c=sb(),K=document.getElementById('kaKpis');if(!c||!K)return;done=true;
    var since=new Date(new Date().getFullYear(),new Date().getMonth()-5,1).toISOString();
    Promise.all([c.from('member_profiles').select('created_at').gte('created_at',since).limit(5000),c.from('payments').select('amount,confirmed_at').eq('payment_status','confirmed').gte('confirmed_at',since).limit(5000)]).then(function(r){
      var ms=months(),map={};ms.forEach(function(m){map[m.k]=m;});
      (r[0].data||[]).forEach(function(x){var m=map[key(x.created_at)];if(m)m.m++;});
      (r[1].data||[]).forEach(function(x){var m=map[key(x.confirmed_at)];if(m)m.r+=Number(x.amount||0);});
      var tm=ms.reduce(function(a,b){return a+b.m;},0),tr=ms.reduce(function(a,b){return a+b.r;},0);
      var el=document.createElement('div');el.className='kad-trend';
      el.innerHTML=card('Member Baru','6 bulan terakhir',tm,ms,'m','g',function(v){return v;},'admin-members.html','data member')+card('Omzet Terkonfirmasi','6 bulan terakhir · Rp',rp(tr),ms,'r','',rp,'admin-payments.html?status=confirmed','pembayaran lunas');
      K.insertAdjacentElement('afterend',el);
    }).catch(function(){done=false;});
  }
  var n=0;(function w(){run();if(!done&&++n<40)setTimeout(w,300);})();
})();
