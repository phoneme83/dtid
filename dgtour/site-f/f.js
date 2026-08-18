/* ============================================================
   시안 F (컨설팅 제안) 공용 스크립트
   근거: 「디지털 관광주민증 및 지역사랑 휴가지원제 중장기 운영전략
        수립」 최종보고(260722 v2.9) IV.시스템 4.세부개선과제
        1-1 모바일 앱 UI/UX 개선 — TO-BE App 와이어프레임(p.215),
        통합 앱 구성(안)(p.216), 웹(홈페이지) 구성 2안(p.218),
        1-2 회원가입 채널 일원화/거주지 인증(p.219~220)
   데이터는 원본 목업과 동일한 ../site-assets/data.js 를 그대로 사용.
   ※ 최상단 const/let 선언을 먼저 두고, 초기화 호출은 각 페이지 스크립트
     마지막에서 수행한다 (TDZ 오류 방지 — 기존 세션에서 실제 발생한 버그).
   ============================================================ */

const F_LOGIN_KEY = 'dgtour_user_id';          /* 로그인 키는 전 시안 공유 */
const F_PT_KEY    = 'dtidF_points';            /* 시안 F 전용 데이터 키 */
const F_USE_KEY   = 'dtidF_uses';
const F_FAV_KEY   = 'dtidF_favs';
const F_MIS_KEY   = 'dtidF_mission';
const F_WATCH_KEY = 'dtidF_watch';
const F_AUTH_KEY  = 'dtidF_authMeans';

/* 계정별 기준 실적 목업 — 와이어프레임의 표기 지표(이용 가능 지역/이번 달
   사용/누적 혜택/사용 이력/보유 포인트) 구성을 그대로 따른 값 */
const F_BASE = {
  user1:{avail:12,month:8,cum:184000,uses:125,pt:1280,grade:'실버'},
  user2:{avail:6, month:3,cum:52000, uses:41, pt:640, grade:'브론즈'},
  user3:{avail:18,month:11,cum:296000,uses:203,pt:2450,grade:'골드'},
  user4:{avail:3, month:1,cum:12000, uses:9,  pt:180, grade:'브론즈'},
  user5:{avail:24,month:15,cum:431000,uses:318,pt:3820,grade:'플래티넘'}
};

/* 회원 등급 — 와이어프레임 04 '실버 등급 / 다음 등급까지 220P 남음' 기준
   (user1 1,280P → 실버, 다음 등급 골드 1,500P → 220P 남음) */
const F_GRADES=[
  {n:'브론즈',min:0},{n:'실버',min:1000},{n:'골드',min:1500},{n:'플래티넘',min:3000}
];

/* 와이어프레임 03 혜택지도의 업종 구분 (범례 색상과 1:1) */
const F_CATS = [
  {key:'stay', label:'숙박',  cls:'c-stay', color:'#1d4ed8', src:['숙박']},
  {key:'food', label:'음식',  cls:'c-food', color:'#f97316', src:['식음료']},
  {key:'cafe', label:'카페',  cls:'c-cafe', color:'#059669', src:['식음료']},
  {key:'exp',  label:'체험',  cls:'c-exp',  color:'#38bdf8', src:['체험']},
  {key:'spot', label:'관광지',cls:'c-spot', color:'#a855f7', src:['관람']},
  {key:'shop', label:'쇼핑',  cls:'c-shop', color:'#64748b', src:['쇼핑','기타']}
];
const F_CAT_MAP = {stay:F_CATS[0],food:F_CATS[1],cafe:F_CATS[2],exp:F_CATS[3],spot:F_CATS[4],shop:F_CATS[5]};
const F_SCENES = ['cafe','resort','beach','railbike','sheep','stars','hanwoo','fishfest','map'];

/* 여행 미션 (와이어프레임 01 '여행 미션') */
const F_MISSIONS = [
  {id:'m1',name:'3개 업소 방문하기',goal:3},
  {id:'m2',name:'지역 축제 참여하기',goal:1}
];

/* PC GNB — 웹(홈페이지) 구성 2안의 상단 메뉴 구성 */
const F_GNB = [
  {key:'home',   label:'홈',                href:'main.html'},
  {key:'qr',     label:'관광주민증',        href:'qr.html'},
  {key:'benefit',label:'혜택안내',          href:'benefit.html'},
  {key:'map',    label:'혜택지도',          href:'map.html'},
  {key:'t50',    label:'지역사랑 휴가지원제',href:'t50.html'},
  {key:'my',     label:'마이페이지',        href:'my.html'},
  {key:'admin',  label:'관리자',            href:'admin.html'}
];

/* 하단 탭바 — 와이어프레임 01/04 (홈 · 지도 · QR · 혜택 · 마이) */
const F_TABS = [
  {key:'home',   ic:'🏠',label:'홈',  href:'main.html'},
  {key:'map',    ic:'📍',label:'지도',href:'map.html'},
  {key:'qr',     ic:'▩', label:'QR',  href:'qr.html'},
  {key:'benefit',ic:'🎁',label:'혜택',href:'benefit.html'},
  {key:'my',     ic:'👤',label:'마이',href:'my.html'}
];

/* ── 저장소 ────────────────────────────────────────────── */
function fUid(){ return localStorage.getItem(F_LOGIN_KEY) || 'guest'; }
function fLoad(key,def){
  try{ const v=JSON.parse(localStorage.getItem(key+'_'+fUid())||'null'); return (v===null?def:v); }
  catch(e){ return def; }
}
function fSave(key,val){ try{ localStorage.setItem(key+'_'+fUid(),JSON.stringify(val)); }catch(e){} }

function fUser(){
  const id=localStorage.getItem(F_LOGIN_KEY);
  if(!id) return null;
  return ACCOUNTS.find(a=>a.id===id)||null;
}
function fRequireUser(){
  const u=fUser();
  if(!u){ location.replace('index.html'); return null; }
  return u;
}
function fLogin(id){ localStorage.setItem(F_LOGIN_KEY,id); location.href='main.html'; }
function fLogout(){ localStorage.removeItem(F_LOGIN_KEY); location.href='index.html'; }

function fBase(){ const u=fUser(); return (u&&F_BASE[u.id])||F_BASE.user1; }
/* 방문 지역 = 실제로 혜택을 이용한 지역(이용내역 기준). 발급 개념은 사용하지 않는다. */
function fCards(){
  const u=fUser();
  if(!u) return [];
  if(typeof getVisitedRegions==='function'){
    const visited=getVisitedRegions('dtidF',u.id);
    if(visited.length) return visited;
  }
  return u.cards;
}
function fPoints(){ return fLoad(F_PT_KEY, fBase().pt); }
function fUses(){   return fLoad(F_USE_KEY,{uses:fBase().uses,month:fBase().month,cum:fBase().cum}); }
function fFavs(){   return fLoad(F_FAV_KEY,[]); }
function fMission(){return fLoad(F_MIS_KEY,{m1:1,m2:0}); }
function fWatch(){
  const u=fUser();
  /* 관심지역은 '정선'처럼 접미사 없는 짧은 지역명으로 보관 —
     REGION_DETAIL / REGIONS 의 키와 동일해야 실데이터가 조회된다 */
  const def=(u?fCards().map(fRegionShort):[]).slice(0,3);
  return fLoad(F_WATCH_KEY,def);
}

/* 현재 포인트 기준 등급/다음 등급 잔여 포인트 */
function fGrade(pt){
  if(typeof pt!=='number') pt=fPoints();
  let i=0;
  for(let k=F_GRADES.length-1;k>=0;k--){ if(pt>=F_GRADES[k].min){ i=k; break; } }
  const next=F_GRADES[i+1]||null;
  const span=next?(next.min-F_GRADES[i].min):1;
  return {
    name:F_GRADES[i].n,
    next:next?next.n:null,
    remain:next?(next.min-pt):0,
    pct:next?Math.max(4,Math.min(100,Math.round((pt-F_GRADES[i].min)/span*100))):100
  };
}

/* ── 유틸 ─────────────────────────────────────────────── */
function fmt(n){ return (n||0).toLocaleString('ko-KR'); }
function fHash(s){ let h=0; for(let i=0;i<s.length;i++){ h=(h*31+s.charCodeAt(i))|0; } return Math.abs(h); }
function fEsc(s){
  return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function fRegionShort(card){ /* '강원 정선군' → '정선' */
  const p=String(card).split(' ');
  return (p[1]||p[0]).replace(/(군|시|구)$/,'');
}
/* '정선' → '정선군', '보령' → '보령시' : 계정 카드 표기를 우선 사용하고
   없으면 data.js 의 regionGunLabel() 규칙을 따른다 */
function fRegionLabel(short){
  for(let i=0;i<ACCOUNTS.length;i++){
    const cards=ACCOUNTS[i].cards;
    for(let j=0;j<cards.length;j++){
      const nm=cards[j].split(' ')[1]||'';
      if(nm && nm.replace(/(군|시|구)$/,'')===short) return nm;
    }
  }
  return (typeof regionGunLabel==='function') ? regionGunLabel(short) : short+'군';
}

/* 카드 슬로건 — data.js 의 getCardSlogan()은 '와/과' 조사를 구분하지 않아
   '보령시과 …'처럼 표기되므로, 종성 여부를 판정해 조사를 붙인다 */
function fSlogan(label){
  if(typeof CARD_SLOGANS!=='undefined' && CARD_SLOGANS[label]) return CARD_SLOGANS[label];
  const c=label.charCodeAt(label.length-1);
  const jong=(c>=0xAC00&&c<=0xD7A3)?((c-0xAC00)%28!==0):true;
  return label+(jong?'과':'와')+' 함께하는 여행';
}

let fToastTimer;
function toast(msg){
  const el=document.getElementById('toastEl');
  if(!el){ return; }
  el.textContent=msg;
  el.classList.add('on');
  clearTimeout(fToastTimer);
  fToastTimer=setTimeout(()=>el.classList.remove('on'),2100);
}

function fOpenDrawer(){
  document.getElementById('fDrawer').classList.add('on');
  document.getElementById('fOv').classList.add('on');
  document.body.style.overflow='hidden';
}
function fCloseDrawer(){
  document.getElementById('fDrawer').classList.remove('on');
  document.getElementById('fOv').classList.remove('on');
  document.body.style.overflow='';
}
function fOpenModal(id){ document.getElementById(id).classList.add('on'); document.body.style.overflow='hidden'; }
function fCloseModal(id){ document.getElementById(id).classList.remove('on'); document.body.style.overflow=''; }

/* ── 혜택업체 풀 : REGION_DETAIL(실데이터) → 지도/리스트용 가공 ── */
function fVenues(limit){
  const u=fUser();
  const mine=fCards().map(fRegionShort);
  const watch=fWatch();
  const names=[];
  mine.concat(watch).forEach(n=>{ if(n&&names.indexOf(n)<0) names.push(n); });
  /* 내 주민증·관심지역이 없으면 전체 지역에서 채움 */
  if(!names.length){ REGIONS.slice(0,6).forEach(r=>names.push(r.n)); }
  const out=[];
  names.forEach(rn=>{
    const d=(typeof getRegionDetail==='function')?getRegionDetail(rn):(REGION_DETAIL[rn]||null);
    if(!d||!d.venues) return;
    d.venues.forEach((v,i)=>{
      const h=fHash(rn+v.name+i);
      let key='shop';
      if(v.cat==='숙박') key='stay';
      else if(v.cat==='체험') key='exp';
      else if(v.cat==='관람') key='spot';
      else if(v.cat==='식음료') key=/카페|커피|다방|디저트|베이커|찻집|살롱/.test(v.name+v.desc)?'cafe':'food';
      else if(v.cat==='쇼핑') key='shop';
      out.push({
        region:rn, name:v.name, desc:v.desc||'', discount:v.discount||'현장 할인 적용',
        cat:key, catLabel:F_CAT_MAP[key].label, cls:F_CAT_MAP[key].cls, color:F_CAT_MAP[key].color,
        dist:Math.round((h%430+120))/100,                 /* 0.2 ~ 4.5km */
        img:'../assets/img/scene/'+F_SCENES[h%F_SCENES.length]+'.svg',
        l:8+(h%84), t:10+((h>>3)%78),                     /* 지도 핀 좌표(%) */
        id:rn+'|'+v.name
      });
    });
  });
  out.sort((a,b)=>a.dist-b.dist);
  return limit?out.slice(0,limit):out;
}

function fToggleFav(id,btn){
  const list=fFavs();
  const i=list.indexOf(id);
  if(i<0){ list.push(id); toast('즐겨찾는 혜택업체에 담았습니다'); }
  else{ list.splice(i,1); toast('즐겨찾기에서 해제했습니다'); }
  fSave(F_FAV_KEY,list);
  if(btn){ btn.classList.toggle('on',list.indexOf(id)>=0); btn.textContent=list.indexOf(id)>=0?'♥':'♡'; }
}

/* ── 혜택 사용(QR 제시) 시뮬레이션 ───────────────────────
   실제 사용 시점에 이용내역(방문 지역)까지 함께 기록한다. region을 넘기면
   그 지역이 "방문 지역"으로 남아 지갑·마이페이지에 반영된다. */
function fUseBenefit(venue,region){
  const u=fUses();
  const amount=[3000,5000,8000,12000][fHash(venue||'x')%4];
  u.uses+=1; u.month+=1; u.cum+=amount;
  fSave(F_USE_KEY,u);
  fSave(F_PT_KEY, fPoints()+500);
  const m=fMission();
  if(m.m1<3) m.m1+=1;
  fSave(F_MIS_KEY,m);
  const me=fUser();
  if(region&&me&&typeof addVisit==='function') addVisit('dtidF',me.id,region,venue);
  toast('혜택 적용 완료 · '+fmt(amount)+'원 할인 / 500P 적립');
  return amount;
}

/* ── 지도 배경 (오프라인 SVG 가로도 · 외부 타일 미사용) ──── */
function fMapSvg(seed){
  const h=fHash(seed||'map');
  const roads=[];
  for(let i=1;i<=5;i++){
    const y=i*16+(h>>i)%7;
    roads.push('<path d="M-5 '+y+' L105 '+(y+((h>>(i+2))%6)-3)+'" stroke="#fff" stroke-width="'+(i%2?2.6:1.6)+'" fill="none"/>');
  }
  for(let i=1;i<=5;i++){
    const x=i*17+(h>>(i+1))%6;
    roads.push('<path d="M'+x+' -5 L'+(x+((h>>i)%7)-3)+' 105" stroke="#fff" stroke-width="'+(i%2?1.6:2.4)+'" fill="none"/>');
  }
  const blocks=[];
  for(let i=0;i<16;i++){
    const bx=(h>>(i%9))%88+3, by=(h>>((i%7)+2))%86+4;
    blocks.push('<rect x="'+bx+'" y="'+by+'" width="'+(4+i%6)+'" height="'+(3+i%5)+'" rx="1" fill="#dfe7ef"/>');
  }
  return '<svg class="mapbg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">'+
    '<rect width="100" height="100" fill="#eef2f6"/>'+
    '<path d="M0 74 q18 -10 34 -2 q20 10 38 -4 q14 -10 28 -2 L100 100 L0 100 Z" fill="#cfe6f7"/>'+
    '<path d="M0 30 q22 8 40 -2 q18 -10 36 2 q12 6 24 2" stroke="#c7e3d6" stroke-width="3" fill="none"/>'+
    blocks.join('')+roads.join('')+
    '</svg>';
}
function fPins(list,limit){
  return list.slice(0,limit||9).map(v=>
    '<span class="pin '+v.cls+'" style="left:'+v.l+'%;top:'+v.t+'%" title="'+fEsc(v.name)+'"><i></i></span>'
  ).join('')+'<span class="pin me" style="left:50%;top:52%"><i></i></span>';
}

/* ── 공용 셸(헤더·탭바·드로어) 주입 ───────────────────── */
function fShell(opt){
  opt=opt||{};
  const u=fUser();
  const active=opt.active||'';
  const top=document.getElementById('shellTop');
  const bot=document.getElementById('shellBottom');

  if(top){
    top.innerHTML=
      '<header class="gnb-pc"><div class="gnb-pc-in">'+
        '<a class="brand" href="main.html"><span class="brand-mark">주민</span>디지털 관광주민증</a>'+
        '<nav>'+F_GNB.map(g=>'<a href="'+g.href+'"'+(g.key===active?' class="on"':'')+'>'+g.label+'</a>').join('')+'</nav>'+
        '<div class="rt">'+
          '<a class="chip" href="wireframe.html">F안 설명</a>'+
          (u?'<button class="chip" onclick="fLogout()">로그아웃</button>':'<a class="chip on" href="index.html">로그인</a>')+
        '</div>'+
      '</div></header>'+
      '<div class="appbar"><div class="appbar-in">'+
        (opt.back
          ? '<button class="ab-ico" onclick="history.length>1?history.back():location.href=\'main.html\'" aria-label="뒤로">←</button>'
          : '<button class="ab-ico" onclick="fOpenDrawer()" aria-label="메뉴">☰</button>')+
        '<div class="ab-title">'+fEsc(opt.title||'디지털관광주민증')+'</div>'+
        '<button class="ab-ico ab-badge" onclick="toast(\'알림 3건 · 재인증 안내 1건\')" aria-label="알림">🔔</button>'+
      '</div></div>';
  }

  if(bot){
    bot.innerHTML=
      (opt.hideBnav?'':'<nav class="bnav"><div class="bnav-in">'+
        F_TABS.map(t=>{
          if(t.key==='qr'){
            return '<a class="bn qr'+(active==='qr'?' on':'')+'" href="'+t.href+'">'+
              '<span class="fab"><span class="g">▩</span><span class="w">QR</span></span><span class="sp"></span></a>';
          }
          return '<a class="bn'+(active===t.key?' on':'')+'" href="'+t.href+'">'+
            '<span class="ic">'+t.ic+'</span><span>'+t.label+'</span></a>';
        }).join('')+
      '</div></nav>')+
      '<div class="ov" id="fOv" onclick="fCloseDrawer()"></div>'+
      '<aside class="drawer" id="fDrawer">'+
        '<div class="dr-top">'+
          '<div class="nm">'+(u?fEsc(u.name)+'님':'로그인이 필요합니다')+'</div>'+
          '<div class="sb">'+(u?'관광주민증 회원 · '+fBase().grade+' 등급':'통합 인증으로 30초 시작')+'</div>'+
        '</div>'+
        '<div class="dr-sec"><div class="h">주요 기능</div>'+
          F_TABS.map(t=>'<a class="dr-a'+(active===t.key?' on':'')+'" href="'+t.href+'"><span class="ic">'+t.ic+'</span>'+
            (t.key==='qr'?'QR 관광주민증':t.label==='지도'?'혜택지도':t.label==='혜택'?'혜택안내':t.label)+'</a>').join('')+
        '</div>'+
        '<div class="dr-sec"><div class="h">연계 서비스</div>'+
          '<a class="dr-a'+(active==='t50'?' on':'')+'" href="t50.html"><span class="ic">🎫</span>지역사랑 휴가지원제</a>'+
          '<a class="dr-a'+(active==='admin'?' on':'')+'" href="admin.html"><span class="ic">📊</span>관리자 대시보드(WEB)</a>'+
        '</div>'+
        '<div class="dr-sec"><div class="h">안내</div>'+
          '<a class="dr-a" href="wireframe.html"><span class="ic">📄</span>F안(컨설팅 제안) 설명</a>'+
          '<a class="dr-a" href="../sites.html"><span class="ic">🗂️</span>시안 목록으로</a>'+
          (u?'<button class="dr-a" onclick="fLogout()"><span class="ic">↩</span>로그아웃</button>'
             :'<a class="dr-a" href="index.html"><span class="ic">→</span>로그인</a>')+
        '</div>'+
      '</aside>'+
      '<div id="toastEl" role="status" aria-live="polite"></div>';
  }
}
