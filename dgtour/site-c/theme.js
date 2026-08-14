/* ═══════════════════════════════════════════════════════════════
   시안 C · 로컬 미션 게이미피케이션 테마 스크립트
   - 모든 페이지 공통: 상단 데모 바 주입
   - 로그인 상태: 중앙 QR FAB + QR 제시 오버레이 + 스탬프/포인트 적립
   - main.html(#cHomePanel): 레벨/진행바 + 이번 주 미션 렌더
   - my.html(#cStampStrip): 스탬프판 + 포인트 내역 렌더
   - 상태 저장: localStorage 'siteC_game_<userId>' (사이트 C 전용 키)
   ═══════════════════════════════════════════════════════════════ */
(function(){
'use strict';

/* ── 상수/상태 (초기화 코드보다 먼저 선언 — TDZ 방지 규칙 준수) ── */
var MAX_STAMP=9;          /* 스탬프판 칸 수 */
var LV_STEP=3;            /* 스탬프 3개당 레벨 1 상승 */
var PTS_PER_SCAN=300;     /* QR 1회 사용 보상 */
var LVUP_BONUS=1000;      /* 레벨업 보너스 */
var CAT_EMOJI={'식음료':'🍜','체험':'🛶','관람':'🖼️','숙박':'🏨','쇼핑':'🛍️','기타':'🎁'};

var themeUser=(typeof getUser==='function')?getUser():null;
var GKEY='siteC_game_'+(themeUser?themeUser.id:'guest');

function defaultGame(){
  return {stamps:1,pts:300,log:[{t:'첫 방문 보너스',p:'+300P'}]};
}
function loadGame(){
  try{
    var s=JSON.parse(localStorage.getItem(GKEY)||'null');
    if(s&&typeof s.stamps==='number'&&typeof s.pts==='number'&&Array.isArray(s.log))return s;
  }catch(e){}
  return defaultGame();
}
var G=loadGame();
function saveGame(){localStorage.setItem(GKEY,JSON.stringify(G));}

function fmt(n){return n.toLocaleString('ko-KR');}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function cToast(m){if(typeof toast==='function')toast(m);}

/* ── 지역·가맹점 데이터(data.js) 기반 스탬프판/미션 생성 ── */
function shortRegion(card){
  var p=String(card).split(' ');
  return (p[p.length-1]||String(card)).replace(/[군시]$/,'');
}
function trimName(n){
  n=String(n).replace(/\.\.\.$/,'').trim();
  return n.length>7?n.slice(0,7)+'…':n;
}
var homeRegion=(themeUser&&themeUser.cards&&themeUser.cards.length)?shortRegion(themeUser.cards[0]):'평창';
var regionInfo=(typeof getRegionDetail==='function')?getRegionDetail(homeRegion):null;

function buildStamps(){
  var slots=[];
  if(themeUser&&themeUser.cards){
    themeUser.cards.slice(0,2).forEach(function(c){
      var icon=(typeof CARD_ICONS!=='undefined'&&CARD_ICONS[c])?CARD_ICONS[c]:'📍';
      slots.push({e:icon,n:shortRegion(c)+' 방문'});
    });
  }
  if(regionInfo&&regionInfo.venues){
    regionInfo.venues.slice(0,MAX_STAMP-1-slots.length).forEach(function(v){
      slots.push({e:CAT_EMOJI[v.cat]||'📍',n:trimName(v.name)});
    });
  }
  while(slots.length<MAX_STAMP-1)slots.push({e:'📍',n:'가맹점'});
  slots.push({e:'🎁',n:'?'});
  return slots;
}
var STAMPS=buildStamps();

function buildMissions(){
  var ms=[];
  var vs=(regionInfo&&regionInfo.venues)?regionInfo.venues.slice():[];
  vs.sort(function(a,b){return (b.pop||0)-(a.pop||0);});
  var bgs=['#fef3c7','#dcfce7'];
  vs.slice(0,2).forEach(function(v,i){
    ms.push({e:CAT_EMOJI[v.cat]||'🎯',bg:bgs[i],t:trimName(v.name)+'에서 QR 사용하기',rw:PTS_PER_SCAN,sub:homeRegion+' · '+(v.cat||'가맹점')});
  });
  var f=(regionInfo&&regionInfo.festivals&&regionInfo.festivals.length)?regionInfo.festivals[0]:null;
  if(f){
    ms.push({e:'🎪',bg:'#e0e7ff',t:trimName(f.name)+' 방문 인증',rw:500,sub:(f.month||'시즌')+' 한정 스탬프'});
  }else{
    ms.push({e:'🏅',bg:'#e0e7ff',t:homeRegion+' 가맹점 3곳 도장깨기',rw:500,sub:'한정 스탬프'});
  }
  return ms;
}
var MISSIONS=buildMissions();

/* ── 파생 값 ── */
function curLevel(){return 1+Math.floor(G.stamps/LV_STEP);}
function curPct(){
  if(G.stamps>=MAX_STAMP)return 100;
  return Math.round((G.stamps%LV_STEP)/LV_STEP*100);
}
function remainToLvup(){return LV_STEP-(G.stamps%LV_STEP);}
function missionDone(i){return G.stamps>=i+2;}

/* ── 1) 데모 바 (모든 페이지) ── */
var demoBar=document.createElement('div');
demoBar.className='c-demo-bar';
demoBar.innerHTML='<span>🎮 시안 C · 로컬 미션 적용판</span><a href="../sites.html">다른 시안 보기 ›</a>';
document.body.insertBefore(demoBar,document.body.firstChild);

/* ── 2) 중앙 QR FAB + 오버레이 (로그인 상태에서만) ── */
var ovWrap=null;
if(themeUser){
  var fab=document.createElement('button');
  fab.type='button';
  fab.className='c-qr-fab';
  fab.setAttribute('aria-label','내 QR 제시하기');
  fab.innerHTML='<span class="fab-ic">▦</span><span class="fab-tx">QR</span>';
  fab.addEventListener('click',openQrOv);
  document.body.appendChild(fab);

  ovWrap=document.createElement('div');
  ovWrap.innerHTML=
    '<div class="c-ov" id="cOvQr">'+
      '<div class="c-ov-inner">'+
        '<button type="button" class="c-ov-cls" data-cclose="cOvQr" aria-label="닫기">✕</button>'+
        '<div class="c-ov-ttl">나의 통합 관광주민증</div>'+
        '<img src="../assets/img/qr-code.svg" alt="나의 관광주민증 QR코드">'+
        '<div class="c-ov-nm">'+esc(themeUser.name)+'님</div>'+
        '<div class="c-ov-gd">가맹점에서 QR 사용 = 미션 달성 + 스탬프 적립<br>레벨이 오를수록 보상이 커져요</div>'+
        '<button type="button" class="c-ov-sim" id="cSimBtn">📷 사용 시뮬레이션 (가맹점 스캔)</button>'+
      '</div>'+
    '</div>'+
    '<div class="c-ov" id="cOvAchv">'+
      '<div class="c-ov-inner">'+
        '<div class="c-ov-big" id="cAchvEmo">🎊</div>'+
        '<div class="c-ov-dt1" id="cAchvTtl">미션 달성!</div>'+
        '<div class="c-ov-dt2" id="cAchvTxt"></div>'+
        '<div class="c-ov-dt3" id="cAchvSub"></div>'+
        '<button type="button" class="c-ov-btn2" id="cAchvOk">확인</button>'+
      '</div>'+
    '</div>';
  while(ovWrap.firstChild)document.body.appendChild(ovWrap.firstChild);

  document.getElementById('cSimBtn').addEventListener('click',simulateScan);
  document.getElementById('cAchvOk').addEventListener('click',function(){closeOv('cOvAchv');});
  Array.prototype.forEach.call(document.querySelectorAll('[data-cclose]'),function(b){
    b.addEventListener('click',function(){closeOv(b.getAttribute('data-cclose'));});
  });
  Array.prototype.forEach.call(document.querySelectorAll('.c-ov'),function(ov){
    ov.addEventListener('click',function(ev){if(ev.target===ov)ov.classList.remove('on');});
  });
}

function openQrOv(){
  var el=document.getElementById('cOvQr');
  if(el)el.classList.add('on');
}
function closeOv(id){
  var el=document.getElementById(id);
  if(el)el.classList.remove('on');
}

/* ── 3) QR 사용 시뮬레이션 → 스탬프/포인트 적립 ── */
function simulateScan(){
  closeOv('cOvQr');
  var leveled=false;
  var msg,sub;
  if(G.stamps<MAX_STAMP){
    G.stamps++;
    G.pts+=PTS_PER_SCAN;
    var st=STAMPS[G.stamps-1];
    msg='+'+fmt(PTS_PER_SCAN)+'P · '+(st?st.n:'가맹점')+' 스탬프';
    G.log.unshift({t:(st?st.n:'가맹점')+' QR 사용',p:'+'+fmt(PTS_PER_SCAN)+'P'});
    if(G.stamps%LV_STEP===0){
      leveled=true;
      G.pts+=LVUP_BONUS;
      G.log.unshift({t:'Lv.'+curLevel()+' 레벨업 보상',p:'+'+fmt(LVUP_BONUS)+'P'});
    }
  }else{
    G.pts+=100;
    msg='+100P 적립';
    G.log.unshift({t:'가맹점 QR 사용',p:'+100P'});
  }
  if(G.log.length>20)G.log.length=20;
  saveGame();
  renderAll();
  if(G.stamps>=MAX_STAMP){
    sub='🏆 스탬프판 완주! 반값여행 우선 배정권 획득';
  }else if(leveled){
    sub='🏆 '+homeRegion+' 주민 Lv.'+curLevel()+' 달성! 보너스 +'+fmt(LVUP_BONUS)+'P';
  }else{
    sub='Lv.'+(curLevel()+1)+'까지 QR '+remainToLvup()+'번 남음 · 스탬프 '+G.stamps+'/'+MAX_STAMP;
  }
  var emo=document.getElementById('cAchvEmo');
  var ttl=document.getElementById('cAchvTtl');
  var txt=document.getElementById('cAchvTxt');
  var subEl=document.getElementById('cAchvSub');
  if(emo)emo.textContent=leveled?'🏆':'🎊';
  if(ttl)ttl.textContent=leveled?'레벨 업!':'미션 달성!';
  if(txt)txt.textContent=msg;
  if(subEl)subEl.textContent=sub;
  var ov=document.getElementById('cOvAchv');
  if(ov)ov.classList.add('on');
}

/* ── 4) main.html 홈 패널 렌더 ── */
function renderHomePanel(){
  var panel=document.getElementById('cHomePanel');
  if(!panel||!themeUser)return;
  var lv=curLevel(),pct=curPct();
  var cap=(G.stamps>=MAX_STAMP)
    ?'스탬프판 완주! 반값여행 우선 배정권이 지급되었어요 🏆'
    :'가맹점 QR '+remainToLvup()+'번만 더 사용하면 레벨업! 🎁 '+fmt(LVUP_BONUS)+'P';
  var mh=MISSIONS.map(function(m,i){
    var done=missionDone(i);
    return '<div class="c-msn">'+
      '<div class="c-ic" style="background:'+m.bg+'">'+m.e+'</div>'+
      '<div><div class="c-tt">'+esc(m.t)+'</div><div class="c-rw">+'+fmt(m.rw)+'P · '+esc(m.sub)+'</div></div>'+
      '<button type="button" class="c-go'+(done?' done':'')+'" data-cgo>'+(done?'완료':'도전')+'</button>'+
    '</div>';
  }).join('');
  panel.innerHTML=
    '<div class="c-head">'+
      '<div class="c-pt">🪙 '+fmt(G.pts)+'P</div>'+
      '<div class="c-hi">'+esc(themeUser.name)+'님, 오늘의 로컬 미션 도전!</div>'+
      '<div class="c-lv">'+esc(homeRegion)+' 주민 Lv.'+lv+' · 스탬프 '+G.stamps+'/'+MAX_STAMP+' · '+esc(themeUser.level)+'</div>'+
    '</div>'+
    '<div class="c-lvcard">'+
      '<div class="c-lv-t"><span>'+esc(homeRegion)+' 주민 Lv.'+lv+' → Lv.'+(lv+1)+'</span><span>'+pct+'%</span></div>'+
      '<div class="c-bar"><i style="width:'+pct+'%"></i></div>'+
      '<div class="c-bar-cap">'+cap+'</div>'+
    '</div>'+
    '<div class="c-secttl">🔥 이번 주 미션</div>'+
    '<div class="c-msn-list">'+mh+'</div>'+
    '<div class="c-strip-link" id="cStripLink">🏅 내 스탬프판 보러가기 <b>'+G.stamps+'/'+MAX_STAMP+'</b><span class="arr">›</span></div>';
  Array.prototype.forEach.call(panel.querySelectorAll('[data-cgo]'),function(b){
    b.addEventListener('click',openQrOv);
  });
  var link=document.getElementById('cStripLink');
  if(link)link.addEventListener('click',function(){location.href='my.html';});
}

/* ── 5) my.html 스탬프판 + 포인트 내역 렌더 ── */
function renderStampStrip(){
  var strip=document.getElementById('cStampStrip');
  if(!strip)return;
  var sh=STAMPS.map(function(s,i){
    var got=i<G.stamps;
    return '<div class="c-stamp '+(got?'got':'no')+'"><span class="c-e">'+s.e+'</span>'+esc(s.n)+'</div>';
  }).join('');
  var lh=G.log.slice(0,5).map(function(l){
    return '<div class="c-log-item"><span>🪙</span><span>'+esc(l.t)+'</span><span class="p">'+esc(l.p)+'</span></div>';
  }).join('');
  strip.innerHTML=
    '<div class="c-bar-cap" style="margin:0 0 8px">'+esc(homeRegion)+' 주민 Lv.'+curLevel()+' · 스탬프 '+G.stamps+'/'+MAX_STAMP+' · 🪙 '+fmt(G.pts)+'P 보유</div>'+
    '<div class="c-stamp-wrap">'+sh+'</div>'+
    '<div class="c-reward"><div class="c-rt">🏆 '+MAX_STAMP+'개 완주 보상</div><div class="c-rs">반값여행 우선 배정권 + '+esc(homeRegion)+' 굿즈 패키지</div></div>'+
    '<div class="c-secttl" style="padding:16px 0 6px">🪙 최근 적립 내역</div>'+lh+
    '<button type="button" class="c-strip-link" id="cResetBtn" style="margin:12px 0 0;width:100%;justify-content:center;color:#889;border-color:#d5d0e8">데모 상태 초기화</button>';
  var rb=document.getElementById('cResetBtn');
  if(rb)rb.addEventListener('click',function(){
    localStorage.removeItem(GKEY);
    G=defaultGame();
    renderAll();
    cToast('스탬프/포인트를 초기화했습니다');
  });
}

function renderAll(){
  renderHomePanel();
  renderStampStrip();
}
renderAll();
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
