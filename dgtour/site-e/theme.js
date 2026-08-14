/* ═══════════════════════════════════════════════════════════════
   시안 E · 통합안 테마 스크립트 — site-e 전 페이지 공통 주입
   D 뼈대(과업형·글자 확대·전화 탈출구) + A QR(중앙 플로팅 1탭·전체화면 제시)
   + C 라이트(QR 사용 시 스탬프 자동 적립, 랭킹 없음) + B 부분(지도 중심 탐색)
   ─ 페이지 스크립트와의 전역 const 충돌을 막기 위해 전체를 IIFE로 감쌉니다.
   ═══════════════════════════════════════════════════════════════ */
(function(){
'use strict';

/* ── 유틸 (선언을 항상 사용부보다 위에 둔다 — TDZ 주의) ── */
function $(sel,root){return (root||document).querySelector(sel);}
function el(tag,cls,html){
  var e=document.createElement(tag);
  if(cls)e.className=cls;
  if(html!=null)e.innerHTML=html;
  return e;
}
function say(msg){
  if(typeof window.toast==='function'&&document.getElementById('toastEl')){window.toast(msg);}
}
var me=(typeof window.getUser==='function')?window.getUser():null;
var isLogin=!!document.querySelector('.login-content'); /* index.html(로그인)에서는 탭바/QR 미노출 */

/* ── 스탬프 상태 (C 라이트) : site-e 전용 localStorage 키 ── */
var STAMP_KEY='dtidSiteE_stamps';
var DEF_STATE={use:12,stamps:[
  {e:'🏔️',n:'레일바이크',got:true},{e:'🐑',n:'양떼목장',got:true},{e:'🎣',n:'송어축제',got:true},
  {e:'🍜',n:'한우마을',got:true},{e:'☕',n:'감자밭카페',got:false},{e:'⛰️',n:'발왕산',got:false},
  {e:'🛶',n:'동강래프팅',got:false},{e:'🌸',n:'육백마지기',got:false},{e:'🎁',n:'?',got:false}]};
function loadState(){
  try{
    var s=JSON.parse(localStorage.getItem(STAMP_KEY)||'null');
    if(s&&s.stamps&&s.stamps.length)return s;
  }catch(err){}
  return JSON.parse(JSON.stringify(DEF_STATE));
}
var S=loadState();
function saveState(){try{localStorage.setItem(STAMP_KEY,JSON.stringify(S));}catch(err){}}
function gotCount(){
  var c=0;
  for(var i=0;i<S.stamps.length;i++){if(S.stamps[i].got)c++;}
  return c;
}
/* 페이지 안에 있는 스탬프 위젯(#eStamp*)을 모두 갱신 */
function renderStamps(){
  var got=gotCount(),total=S.stamps.length;
  var cnt=$('#eStampCnt');if(cnt)cnt.textContent=got+'/'+total;
  var cnt2=$('#eStampCnt2');if(cnt2)cnt2.textContent=got+'/'+total;
  var bar=$('#eStampBar');if(bar)bar.style.width=Math.round(got/total*100)+'%';
  var cap=$('#eStampCap');
  if(cap)cap.textContent=(got>=total)?'완주! 반값여행 우선 배정 대상입니다 🎉':(total-got)+'개만 더 모으면 반값여행 우선 배정!';
  var grid=$('#eStampGrid');
  if(grid){
    grid.innerHTML=S.stamps.map(function(s){
      return '<div class="e-stamp '+(s.got?'got':'no')+'"><span class="e">'+s.e+'</span>'+s.n+'</div>';
    }).join('');
  }
}

/* ── 1. 슬림 데모 바 + 글자 크게 토글 (D) ── */
var FONT_KEY='dtidSiteE_font';
var FONT_NAMES=['보통','크게','아주 크게'];
var fi=parseInt(localStorage.getItem(FONT_KEY)||'0',10);
if(isNaN(fi)||fi<0||fi>2)fi=0;
function applyFont(){
  document.documentElement.classList.remove('e-f2','e-f3');
  if(fi===1)document.documentElement.classList.add('e-f2');
  if(fi===2)document.documentElement.classList.add('e-f3');
  var st=$('#eFontState');if(st)st.textContent=FONT_NAMES[fi];
}
window.themeEFontUp=function(){
  fi=(fi+1)%3;
  try{localStorage.setItem(FONT_KEY,String(fi));}catch(err){}
  applyFont();
  say('글자 크기: '+FONT_NAMES[fi]);
};

var demoBar=el('div','e-demo-bar',
  '<span>시안 E · 통합안 적용판 <b>추천</b></span>'+
  '<a href="../sites.html">다른 시안 보기</a>'+
  '<button type="button" class="e-font-btn" onclick="themeEFontUp()">가⁺ 글자 크게 · <span id="eFontState">보통</span></button>');
document.body.insertBefore(demoBar,document.body.firstChild);
applyFont();

/* ── 로그인 페이지는 여기까지 (탭바/QR/스탬프는 로그인 후 화면에만) ── */
if(isLogin)return;

/* ── 2. 하단 탭바 + 중앙 플로팅 1탭 QR (A) ── */
var page=location.pathname.split('/').pop()||'main.html';
function isActive(key){
  if(key==='home')return page==='main.html';
  if(key==='bene')return page==='mypage-coupon.html'||page==='event.html'||page==='tour50.html';
  if(key==='card')return page==='my.html'||page==='exp.html'||(page.indexOf('mypage-')===0&&page!=='mypage-coupon.html');
  return false;
}
window.themeEMenu=function(){
  if(typeof window.openDrawer==='function'&&document.getElementById('drawer')){window.openDrawer();}
  else{location.href='main.html';}
};
var tabBar=el('nav','e-tab',
  '<button type="button" class="e-ti'+(isActive('home')?' on':'')+'" onclick="location.href=\'main.html\'"><i>🏠</i>홈</button>'+
  '<button type="button" class="e-ti'+(isActive('bene')?' on':'')+'" onclick="location.href=\'mypage-coupon.html\'"><i>🎁</i>혜택</button>'+
  '<span class="e-ti e-spacer" aria-hidden="true"><i>▦</i>QR</span>'+
  '<button type="button" class="e-ti'+(isActive('card')?' on':'')+'" onclick="location.href=\'my.html\'"><i>🪪</i>주민증</button>'+
  '<button type="button" class="e-ti" onclick="themeEMenu()"><i>☰</i>전체메뉴</button>'+
  '<button type="button" class="e-qr-fab" onclick="themeEOpenQr()" aria-label="주민증 QR 보여주기">▦</button>');
tabBar.setAttribute('aria-label','시안 E 하단 메뉴');
document.body.appendChild(tabBar);

/* ── 3. QR 전체화면 제시 (A) + 사용 시 스탬프 자동 적립 (C 라이트) ── */
var ovQr=el('div','e-ov e-ov-qr',
  '<button type="button" class="cls" onclick="themeECloseQr()" aria-label="닫기">✕</button>'+
  '<div class="ttl">나의 통합 관광주민증</div>'+
  '<img class="qim" src="../assets/img/qr-code.svg" alt="나의 통합 관광주민증 QR코드">'+
  '<div class="nm">'+(me?me.name:'관광주민')+'님</div>'+
  '<div class="gd">QR코드를 가맹점에 제시하세요</div>'+
  '<div class="tm" id="eQrTimer">00:60 후 자동 갱신 ↻</div>'+
  '<button type="button" class="sim" onclick="themeEScanDone()">📷 가맹점 사용 시뮬레이션 (스탬프 자동 적립)</button>'+
  '<div class="brt">화면 밝기가 자동으로 최대로 조정되었습니다</div>');
document.body.appendChild(ovQr);

var ovDone=el('div','e-ov e-ov-done',
  '<div class="big2">✅</div>'+
  '<div class="dt1">할인 적용 완료</div>'+
  '<div class="dt2" id="eDoneTxt">-</div>'+
  '<div class="dt3" id="eDoneSub">-</div>'+
  '<button type="button" class="btn2" onclick="themeECloseDone()">확인</button>');
document.body.appendChild(ovDone);

var qrTimer=null;
window.themeEOpenQr=function(){
  ovQr.classList.add('on');
  var s=60;
  var tm=$('#eQrTimer');
  clearInterval(qrTimer);
  qrTimer=setInterval(function(){
    s--;
    if(s<=0){s=60;say('QR이 갱신되었습니다');}
    if(tm)tm.textContent='00:'+('0'+s).slice(-2)+' 후 자동 갱신 ↻';
  },1000);
};
window.themeECloseQr=function(){
  ovQr.classList.remove('on');
  clearInterval(qrTimer);
};
window.themeECloseDone=function(){ovDone.classList.remove('on');};
window.themeEScanDone=function(){
  window.themeECloseQr();
  S.use++;
  var next=null;
  for(var i=0;i<S.stamps.length;i++){if(!S.stamps[i].got){next=S.stamps[i];break;}}
  var sub='이용내역에 자동 적립되었습니다 ('+S.use+'회차)';
  if(next){
    next.got=true;
    sub='🏅 '+next.n+' 스탬프 획득! '+(S.stamps.length-gotCount())+'개 남음';
  }
  saveState();
  renderStamps();
  $('#eDoneTxt').textContent='가맹점 할인이 적용되었습니다';
  $('#eDoneSub').textContent=sub;
  ovDone.classList.add('on');
};

/* ── 4. 메인 과업 버튼: 지역 목록(지도)으로 스크롤 ── */
window.themeEGoRegions=function(){
  var m=document.querySelector('.map-section');
  if(m){
    m.scrollIntoView({behavior:'smooth'});
    say('지도에서 지역을 누르면 지역별 혜택을 볼 수 있습니다');
  }else{
    location.href='main.html';
  }
};

/* ── 5. 페이지별 마무리 훅 ── */
/* 메인: 인사말에 사용자 이름 */
var hello=$('#eHello');
if(hello&&me)hello.textContent=me.name+'님, 무엇을 도와드릴까요?';

/* 기존 QR 플로팅 배너 → 탭하면 전체화면 QR 제시 */
var qrFloatCard=document.querySelector('#qrFloat .qr-card');
if(qrFloatCard){
  qrFloatCard.addEventListener('click',function(ev){
    if(ev.target.closest('.qr-close'))return;
    window.themeEOpenQr();
  });
}

/* 드로어에 전화 탈출구 추가 (D) */
var drawerNav=document.querySelector('.drawer-nav');
if(drawerNav&&!drawerNav.querySelector('.e-drawer-call')){
  var call=el('div','e-drawer-call','📞 사용이 어려우면 전화 문의 (1588-0000)');
  call.onclick=function(){location.href='tel:15880000';};
  drawerNav.appendChild(call);
}

/* ESC로 오버레이 닫기 */
document.addEventListener('keydown',function(ev){
  if(ev.key!=='Escape')return;
  window.themeECloseQr();
  window.themeECloseDone();
});

renderStamps();
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
