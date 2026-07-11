/* ═══════════════════════════════════════════════════════════════
   시안 A · 월렛 퍼스트 — 전 페이지 공통 주입 스크립트
   ① 상단 데모 바 ② 전체화면 QR 제시 오버레이(1탭)
   ③ 하단 탭바 + 중앙 오렌지 QR FAB (로그인 상태에서만, 데스크톱 숨김)
   data.js / common.js 뒤, </body> 직전에 로드된다.
   ═══════════════════════════════════════════════════════════════ */
(function(){
  var PAGE=(location.pathname.split('/').pop()||'index.html').toLowerCase();

  /* ── 로그인 사용자 (common.js의 getUser 재사용) ── */
  var taUser=null;
  try{ if(typeof getUser==='function') taUser=getUser(); }catch(e){ taUser=null; }

  /* ── ① 상단 데모 바 ── */
  var bar=document.createElement('div');
  bar.className='ta-demo-bar';
  var barMsg=document.createElement('span');
  barMsg.textContent='시안 A · 월렛 퍼스트 적용판';
  var barLink=document.createElement('a');
  barLink.href='../sites.html';
  barLink.textContent='다른 시안 보기';
  bar.appendChild(barMsg);
  bar.appendChild(barLink);
  document.body.insertBefore(bar,document.body.firstChild);

  /* ── ② 전체화면 QR 제시 오버레이 ── */
  var ov=document.createElement('div');
  ov.className='ta-ov';
  ov.innerHTML=
    '<button type="button" class="ta-ov-cls" aria-label="닫기">✕</button>'+
    '<div class="ta-ov-ttl">나의 통합 관광주민증</div>'+
    '<img class="ta-ov-qr" src="../assets/img/qr-code.svg" alt="나의 통합 관광주민증 QR코드">'+
    '<div class="ta-ov-nm"></div>'+
    '<div class="ta-ov-gd">QR코드를 가맹점에 제시하세요</div>'+
    '<div class="ta-ov-tm">01:00 후 자동 갱신 ↻</div>'+
    '<div class="ta-ov-brt">화면 밝기가 자동으로 최대로 조정되었습니다</div>';
  document.body.appendChild(ov);
  ov.querySelector('.ta-ov-nm').textContent=taUser?taUser.name+'님':'통합 관광주민증';
  ov.querySelector('.ta-ov-cls').addEventListener('click',function(){window.themeACloseQr();});

  var qrTimer=null;
  window.themeAOpenQr=function(){
    ov.classList.add('on');
    var s=60,tm=ov.querySelector('.ta-ov-tm');
    tm.textContent='01:00 후 자동 갱신 ↻';
    clearInterval(qrTimer);
    qrTimer=setInterval(function(){
      s--;
      if(s<=0){s=60; if(typeof toast==='function')toast('QR이 갱신되었습니다');}
      tm.textContent='00:'+String(s).padStart(2,'0')+' 후 자동 갱신 ↻';
    },1000);
  };
  window.themeACloseQr=function(){
    ov.classList.remove('on');
    clearInterval(qrTimer);
  };

  /* ── ③ 하단 탭바 + 중앙 QR FAB (로그인 전 화면에는 표시하지 않음) ── */
  if(!taUser || PAGE==='index.html' || PAGE==='') return;

  /* 현재 페이지 → 활성 탭 매핑 */
  var ACTIVE_MAP={
    'main.html':'home','region.html':'home','tour50.html':'home',
    'event.html':'bene','mypage-coupon.html':'bene',
    'my.html':'card','exp.html':'card','mypage-history.html':'card',
    'mypage-report.html':'card','mypage-favorite.html':'card',
    'mypage-cardbox.html':'card','mypage-card-detail.html':'card',
    'service-intro.html':'all'
  };
  var active=ACTIVE_MAP[PAGE]||'';

  var TABS=[
    {key:'home',label:'홈',icon:'🏠',go:function(){location.href='main.html';}},
    {key:'bene',label:'혜택',icon:'🎁',go:function(){location.href='event.html';}},
    {key:'card',label:'주민증',icon:'🪪',go:function(){location.href='my.html';}},
    {key:'all',label:'전체',icon:'☰',go:function(){
      if(document.getElementById('drawer')&&typeof openDrawer==='function'){openDrawer();}
      else{location.href='service-intro.html';}
    }}
  ];

  var tab=document.createElement('nav');
  tab.className='ta-tab';
  tab.setAttribute('aria-label','시안 A 하단 메뉴');
  TABS.forEach(function(t,i){
    if(i===2){ /* 중앙 QR 자리 확보용 빈 슬롯 */
      var sp=document.createElement('span');
      sp.className='ta-ti';
      sp.style.visibility='hidden';
      sp.textContent='.';
      tab.appendChild(sp);
    }
    var b=document.createElement('button');
    b.type='button';
    b.className='ta-ti'+(t.key===active?' on':'');
    var ic=document.createElement('i');
    ic.textContent=t.icon;
    b.appendChild(ic);
    b.appendChild(document.createTextNode(t.label));
    b.addEventListener('click',t.go);
    tab.appendChild(b);
  });
  var fab=document.createElement('button');
  fab.type='button';
  fab.className='ta-fab';
  fab.setAttribute('aria-label','QR 제시하기');
  fab.textContent='▦';
  fab.addEventListener('click',function(){window.themeAOpenQr();});
  tab.appendChild(fab);
  document.body.appendChild(tab);
  document.body.classList.add('ta-has-tab');
})();

/* ── 반값여행 통합신청 메뉴 주입: GNB(데스크톱) + 드로어(모바일) ── */
(function(){
  var gnbNav=document.querySelector('.gnb-nav');
  if(gnbNav&&!gnbNav.querySelector('a[href="t50-apply.html"]')){
    var apA=document.createElement('a');
    apA.href='t50-apply.html';apA.textContent='반값 신청';
    gnbNav.insertBefore(apA,gnbNav.children[3]||null);
  }
  var dNav=document.querySelector('.drawer-nav');
  if(dNav&&!dNav.querySelector('[data-ap]')){
    var apD=document.createElement('div');
    apD.setAttribute('data-ap','1');
    apD.textContent='🧳 반값여행 통합신청';
    apD.onclick=function(){location.href='t50-apply.html';};
    dNav.insertBefore(apD,dNav.children[3]||null);
  }
})();
