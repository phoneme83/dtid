/* ═══════════════════════════════════════════════════════════════
   시안 B · 여행 탐색 퍼스트 — 전 페이지 공통 테마 스크립트
   (data.js / common.js 로드 이후, body 끝에서 실행됩니다)
   1) 상단 데모 바
   2) 우하단 플로팅 "내 QR" 버튼 + QR 제시 오버레이 (로그인 시)
   ═══════════════════════════════════════════════════════════════ */

/* 파싱 시점에 실행되는 코드가 있으므로 최상위 선언은 모두 위쪽에 배치 (TDZ 주의) */
var tbUser=null;

try{tbUser=(typeof getUser==='function')?getUser():null;}catch(e){tbUser=null;}

/* ── 1) 상단 데모 바 ── */
(function(){
  var bar=document.createElement('div');
  bar.className='tb-demo-bar';
  var label=document.createElement('span');
  label.textContent='시안 B · 여행 탐색 퍼스트 적용판';
  var link=document.createElement('a');
  link.href='../sites.html';
  link.textContent='다른 시안 보기';
  bar.appendChild(label);
  bar.appendChild(link);
  document.body.insertBefore(bar,document.body.firstChild);
})();

/* ── 2) 플로팅 "내 QR" 버튼 + QR 제시 오버레이 (로그인 상태에서만) ── */
(function(){
  if(!tbUser)return;

  var fab=document.createElement('button');
  fab.type='button';
  fab.className='tb-fab';
  fab.setAttribute('aria-label','내 QR 제시하기');
  fab.innerHTML='<i>▦</i><span>내 QR</span>';
  fab.onclick=tbOpenQr;
  document.body.appendChild(fab);

  var ov=document.createElement('div');
  ov.className='tb-qr-ov';
  ov.id='tbQrOv';
  ov.setAttribute('role','dialog');
  ov.setAttribute('aria-modal','true');
  ov.setAttribute('aria-label','나의 통합 관광주민증 QR');
  ov.innerHTML=
    '<button type="button" class="cls" onclick="tbCloseQr()" aria-label="닫기">✕</button>'+
    '<div class="ttl">나의 통합 관광주민증</div>'+
    '<img src="../assets/img/qr-code.svg" alt="나의 관광주민증 QR코드">'+
    '<div class="nm" id="tbQrName"></div>'+
    '<div class="gd">QR코드를 가맹점에 제시하세요<br>화면 밝기가 자동으로 최대가 됩니다</div>';
  document.body.appendChild(ov);
  document.getElementById('tbQrName').textContent=tbUser.name+'님';
})();

function tbOpenQr(){
  var ov=document.getElementById('tbQrOv');
  if(!ov)return;
  ov.classList.add('on');
  document.body.style.overflow='hidden';
}
function tbCloseQr(){
  var ov=document.getElementById('tbQrOv');
  if(!ov)return;
  ov.classList.remove('on');
  document.body.style.overflow='';
}

/* ESC로 테마 오버레이 닫기 */
document.addEventListener('keydown',function(e){
  if(e.key!=='Escape')return;
  tbCloseQr();
});

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
