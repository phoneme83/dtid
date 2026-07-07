/* ═══════════════════════════════════════════════════════════════
   시안 B · 여행 탐색 퍼스트 — 전 페이지 공통 테마 스크립트
   (data.js / common.js 로드 이후, body 끝에서 실행됩니다)
   1) 상단 데모 바
   2) 우하단 플로팅 "내 QR" 버튼 + QR 제시 오버레이 (로그인 시)
   3) 30초 주민증 발급 퍼널 오버레이 (tbOpenIssue) — main/region에서 공용
   ═══════════════════════════════════════════════════════════════ */

/* 파싱 시점에 실행되는 코드가 있으므로 최상위 선언은 모두 위쪽에 배치 (TDZ 주의) */
var TB_ISSUED_KEY='dgtour_b_issued';
var tbUser=null;
var tbIssueRegionLabel='';
var tbIssueOnDone=null;

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

/* ── 3) 30초 발급 퍼널 ─────────────────────────────────────────
   tbOpenIssue('평창군', function(){ ... })  형태로 호출.
   발급 이력은 localStorage(dgtour_b_issued)에 목업으로 저장됩니다. */
function tbIssuedList(){
  try{return JSON.parse(localStorage.getItem(TB_ISSUED_KEY)||'[]');}
  catch(e){return [];}
}
function tbIsIssued(label){return tbIssuedList().indexOf(label)>=0;}
function tbMarkIssued(label){
  var list=tbIssuedList();
  if(list.indexOf(label)<0){
    list.push(label);
    localStorage.setItem(TB_ISSUED_KEY,JSON.stringify(list));
  }
}

function tbEnsureIssueOv(){
  if(document.getElementById('tbIssueOv'))return;
  var ov=document.createElement('div');
  ov.className='tb-issue-ov';
  ov.id='tbIssueOv';
  ov.setAttribute('role','dialog');
  ov.setAttribute('aria-modal','true');
  ov.innerHTML=
    '<div class="tb-issue">'+
      '<div class="hd"><span id="tbIssueTtl">주민증 발급 (1/2)</span>'+
      '<button type="button" onclick="tbCloseIssue()" aria-label="발급 창 닫기">✕</button></div>'+
      '<div id="tbIssueStep1">'+
        '<div class="q">본인 확인이 필요해요</div>'+
        '<div class="s">통신사 인증(PASS) 한 번이면 끝나요 · 약 30초</div>'+
        '<button type="button" class="opt hero" onclick="tbIssueStep(2)">📱 휴대폰으로 인증하기</button>'+
        '<button type="button" class="opt" onclick="tbIssueStep(2)">🔐 간편인증 (카카오·네이버)</button>'+
        '<label class="agree"><input type="checkbox" checked> 약관 전체 동의 (필수 3 · 선택 1)</label>'+
      '</div>'+
      '<div id="tbIssueStep2" style="display:none">'+
        '<div class="done-wrap">'+
          '<div class="big">🎉</div>'+
          '<div class="t1"><span id="tbIssueRegion"></span> 관광주민이<br>되셨어요!</div>'+
          '<div class="t2">웰컴 쿠폰 3장 도착</div>'+
        '</div>'+
        '<button type="button" class="go" onclick="tbIssueFinish()">혜택 보러가기</button>'+
      '</div>'+
    '</div>';
  ov.addEventListener('click',function(e){if(e.target===ov)tbCloseIssue();});
  document.body.appendChild(ov);
}

function tbOpenIssue(regionLabel,onDone){
  tbEnsureIssueOv();
  tbIssueRegionLabel=regionLabel||'';
  tbIssueOnDone=(typeof onDone==='function')?onDone:null;
  document.getElementById('tbIssueRegion').textContent=tbIssueRegionLabel||'디지털';
  tbIssueStep(1);
  document.getElementById('tbIssueOv').classList.add('on');
  document.body.style.overflow='hidden';
}
function tbIssueStep(n){
  document.getElementById('tbIssueStep1').style.display=(n===1)?'block':'none';
  document.getElementById('tbIssueStep2').style.display=(n===2)?'block':'none';
  document.getElementById('tbIssueTtl').textContent=(n===1)?'주민증 발급 (1/2)':'발급 완료 (2/2)';
  if(n===2)tbMarkIssued(tbIssueRegionLabel);
}
function tbCloseIssue(){
  var ov=document.getElementById('tbIssueOv');
  if(!ov)return;
  ov.classList.remove('on');
  document.body.style.overflow='';
}
function tbIssueFinish(){
  tbCloseIssue();
  if(typeof toast==='function')toast('웰컴 쿠폰 3장이 지급되었습니다');
  if(tbIssueOnDone)tbIssueOnDone(tbIssueRegionLabel);
}

/* ESC로 테마 오버레이 닫기 */
document.addEventListener('keydown',function(e){
  if(e.key!=='Escape')return;
  tbCloseQr();
  tbCloseIssue();
});
